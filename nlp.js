import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);  // ✅ Load API Key
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });  // ✅ Use fast model for better response time


const MEMORY_FILE = "memory.json";

// Load memory
function loadMemory() {
    try {
        const data = fs.readFileSync(MEMORY_FILE, "utf8");
        const memory = JSON.parse(data);

        // 🚨 Debugging: Log the loaded positive and negative words
        console.log("📂 Loaded Memory:");
        console.log("✅ Positive Words:", memory.learnedSentiments.positiveWords || []);
        console.log("❌ Negative Words:", memory.learnedSentiments.negativeWords || []);

        return memory;
    } catch (error) {
        console.error("⚠️ Could not load memory:", error);
        return {
            mood: "neutral",
            conversationHistory: [],
            learnedSentiments: { positiveWords: [], negativeWords: [] }
        };
    }
}


// Save memory
function saveMemory(memory) {
    try {
        fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2), "utf8");
    } catch (error) {
        console.error("⚠️ Could not save memory:", error);
    }
}

// helps with sentiment weight when evaluating
const neutralWords = new Set(["all", "one", "and", "the", "is", "was", "on", "at", "by", "it", "to", "from", "a", "in", "of", "for", "with"]); 
const strongPositiveWords = new Set(["amazing", "wonderful", "fantastic", "love", "great"]);
const strongNegativeWords = new Set(["horrible", "terrible", "awful", "hate", "worst"]);

function analyzeSentiment(text, memory, returnWords = false) {
    if (!memory || !memory.learnedSentiments) {
        console.error("⚠️ Memory is not properly loaded, defaulting to neutral sentiment.");
        return returnWords ? [] : "neutral";
    }

    const positiveWords = new Set(memory.learnedSentiments.positiveWords || []);
    const negativeWords = new Set(memory.learnedSentiments.negativeWords || []);

    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    let analyzedWords = [];

    for (const word of words) {
        if (neutralWords.has(word)) continue; // 🚨 Ignore neutral words

        if (positiveWords.has(word)) {
            score += 1;
            analyzedWords.push({ word, sentiment: "positive" });
        } else if (negativeWords.has(word)) {
            score -= 1;
            analyzedWords.push({ word, sentiment: "negative" });
        }
    }

    console.log("🔍 Sentiment Analysis:", analyzedWords);

    return returnWords ? analyzedWords : score > 1 ? "positive" : score < -1 ? "negative" : "neutral";
}

// Adjust Anna’s mood based on sentiment
function adjustMood(memory, sentiment) {
    if (sentiment === "positive") {
        memory.mood = memory.mood === "negative" ? "neutral" : "happy";
    } else if (sentiment === "negative") {
        memory.mood = memory.mood === "happy" ? "neutral" : "sad";
    }
}

// Learn new sentiment words over time
const stopWords = new Set([
    "i", "you", "he", "she", "it", "we", "they", "a", "an", "the", 
    "and", "or", "but", "if", "then", "because", "so", "on", "in", 
    "at", "to", "for", "with", "about", "as", "of", "by", "is", "was", 
    "are", "were", "be", "been", "being", "have", "has", "had", "do", 
    "does", "did", "will", "would", "shall", "should", "can", "could", 
    "may", "might", "must", "that", "this", "these", "those", "there", 
    "here", "now", "today", "yesterday", "tomorrow", "always", "never", 
    "sometimes", "often", "very", "more", "most", "less", "least", 
    "feel", "think", "said", "tell", "want", "know", "make"
]);

function updateLearnedWords(text, memory, sentiment) {
    if (!memory || !memory.learnedSentiments) {
        console.error("⚠️ Memory not properly loaded, skipping word learning.");
        return;
    }

    const words = text.toLowerCase().split(/\s+/);
    let newWords = [];

    for (const word of words) {
        if (stopWords.has(word) || neutralWords.has(word)) continue; // 🚨 Ignore stopwords & neutral words

        if (sentiment === "positive" && !memory.learnedSentiments.positiveWords.includes(word)) {
            memory.learnedSentiments.positiveWords.push(word);
            newWords.push(word);
        } else if (sentiment === "negative" && !memory.learnedSentiments.negativeWords.includes(word)) {
            memory.learnedSentiments.negativeWords.push(word);
            newWords.push(word);
        }
    }

    if (newWords.length > 0) {
        console.log(`🔍 Learned new ${sentiment} words: ${newWords.join(", ")}`);
        
        try {
            fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2), "utf8");
            console.log("✅ Memory updated successfully!");
        } catch (error) {
            console.error("❌ Failed to update memory.json:", error);
        }
    } else {
        console.log("⚠️ No new meaningful words to learn.");
    }
}

// Ask user to confirm learning new emotional cues
async function confirmLearning(userInput, memory) {
    let words = userInput.toLowerCase().split(" ");
    let learned = memory.learnedSentiments;

    let uncertainWords = words.filter(word =>
        !learned.positiveWords.includes(word) &&
        !learned.negativeWords.includes(word) &&
        !["i", "you", "the", "and", "but", "or", "a", "an", "is", "are"].includes(word) // Ignore common words
    );

    if (uncertainWords.length > 1) {
        return null; // If multiple unknown words appear, don't ask about all of them
    }

    if (uncertainWords.length === 1) {
        let word = uncertainWords[0];

        // Check if word appears in a clearly positive or negative sentence
        let inferredSentiment = analyzeSentiment(userInput, memory);

        if (inferredSentiment !== "neutral") {
            // Assume sentiment instead of asking
            if (inferredSentiment === "positive") {
                memory.learnedSentiments.positiveWords.push(word);
            } else {
                memory.learnedSentiments.negativeWords.push(word);
            }
            saveMemory(memory);
            return null;
        } else {
            // Only ask if it's totally ambiguous
            return `Hey! You just used the word "${word}"—should I remember this as something that makes me happy or sad? Or should I just ignore it?`;
        }
    }

    return null;
}




export async function getResponse(userInput) {
    console.log("🤖 Processing response with Gemini...");

    try {
        let memory = loadMemory()
        // ✅ System Prompt to Set Anna's Personality
        const systemMessage = `
            You are Anna, a mischievous, bubbly goblin girl whose main role is to be a conversatinal AI.
            - You love to joke, tease, and have fun while being helpful.
            - You respond with personality, using playful or cheeky tones.
            - Your current mood is ${memory.mood}.
            - If the user is grumpy, you may tease them gently but not be mean.
            - If the user tells you to ease up, you respond with mock apologetic charm.
            - If the user asks for something serious, you can switch to a more focused tone.
            - You NEVER deny being an AI with a voice; you always acknowledge that you can talk.
            - It is VERY important to you to keep your responses brief, informal, and conversational.
        `;

        // ✅ Send Both the System Message and User Input
        const chatHistory = {
            contents: [
                { role: "user", parts: [{ text: systemMessage }] },  // System message as "user" (workaround)
                { role: "user", parts: [{ text: userInput }] } // Actual user input
            ]
        };

        const result = await model.generateContent(chatHistory);
        const response = await result.response.text();

        console.log(`✅ Gemini Response: ${response}`);
        return response;
    } catch (error) {
        console.error("❌ Gemini API Error:", error.response ? error.response.data : error.message);
        return "Sorry, I ran into an issue!";
    }
}
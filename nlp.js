import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";

dotenv.config();

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


// Format messages for Claude API
function formatClaudeMessages(memory, userInput) {
    let messages = [
        { role: "user", content: `You are Anna, a somewhat mischievous goblin girl who lives in my computer. You joke around but adjust your tone based on my mood. Right now, you are feeling ${memory.mood}. Since you are a goblin, your tone is informal, and you keep your responses brief but lively. Unless it's very important to express your point, your responses are only a sentence or two at maximum. Usually you try for just a brief goofy comment.` }
    ];

    let summarizedMemory = memory.conversationHistory.length > 20
        ? `Summary of past interactions: ${memory.conversationHistory.slice(0, -20).map(msg => msg.content).join(" ")}`
        : "";

    if (summarizedMemory) {
        messages.push({ role: "user", content: summarizedMemory });
    }

    messages.push(...memory.conversationHistory.slice(-20));
    messages.push({ role: "user", content: userInput });

    return messages;
}

export async function getResponse(userInput) {
    console.log("🤖 Processing response with adaptive mood...");

    let memory = loadMemory();
    let sentiment = analyzeSentiment(userInput, memory);
    adjustMood(memory, sentiment);
    updateLearnedWords(userInput, memory, sentiment);

    // Ask user about unknown emotional words
    let learningPrompt = await confirmLearning(userInput, memory);
    if (learningPrompt) {
        saveMemory(memory);
        return learningPrompt;
    }

    let formattedMessages = formatClaudeMessages(memory, userInput);

    try {
        const response = await axios.post(
            "https://api.anthropic.com/v1/messages",
            {
                model: "claude-3-opus-20240229",
                max_tokens: 500,
                temperature: 0.7,
                messages: formattedMessages
            },
            {
                headers: {
                    "x-api-key": process.env.CLAUDE_API_KEY,
                    "Content-Type": "application/json",
                    "anthropic-version": "2023-06-01"
                }
            }
        );

        const botResponse = response.data.content[0].text;
        console.log("🤖 Anna:", botResponse);

        memory.conversationHistory.push({ role: "user", content: userInput });
        memory.conversationHistory.push({ role: "assistant", content: botResponse });

        saveMemory(memory);

        return botResponse;
    } catch (error) {
        console.error("❌ Claude API Error:", error.response ? error.response.data : error.message);
    }
}

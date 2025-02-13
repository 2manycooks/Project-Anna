import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";

dotenv.config();

const MEMORY_FILE = "memory.json";

// Load memory
function loadMemory() {
    try {
        const data = fs.readFileSync(MEMORY_FILE, "utf8");
        return JSON.parse(data);
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

// Detect sentiment in user input
function analyzeSentiment(userInput, memory) {
    let sentiment = "neutral";
    let learned = memory.learnedSentiments;
    let words = userInput.toLowerCase().split(" ");

    // Weighted sentiment scoring
    let positiveMatches = words.filter(word => learned.positiveWords.includes(word)).length;
    let negativeMatches = words.filter(word => learned.negativeWords.includes(word)).length;

    if (positiveMatches > negativeMatches) {
        sentiment = "positive";
    } else if (negativeMatches > positiveMatches) {
        sentiment = "negative";
    }

    return sentiment;
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
function updateLearnedWords(userInput, memory, sentiment) {
    let learned = memory.learnedSentiments;

    let words = userInput.toLowerCase().split(" ");

    for (let word of words) {
        if (sentiment === "positive" && !learned.positiveWords.includes(word)) {
            learned.positiveWords.push(word);
        }
        if (sentiment === "negative" && !learned.negativeWords.includes(word)) {
            learned.negativeWords.push(word);
        }
    }

    saveMemory(memory);
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
        { role: "user", content: `You are Anna, a mischievous goblin girl who lives in my computer. You joke around but adjust your tone based on my mood. Right now, you are feeling ${memory.mood}.` }
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

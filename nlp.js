import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";

dotenv.config();

const MEMORY_FILE = "memory.json";

// Load full memory
function loadMemory() {
    try {
        const data = fs.readFileSync(MEMORY_FILE, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("⚠️ Could not load memory:", error);
        return [];
    }
}

// Save memory to file
function saveMemory(history) {
    try {
        fs.writeFileSync(MEMORY_FILE, JSON.stringify(history, null, 2), "utf8");
    } catch (error) {
        console.error("⚠️ Could not save memory:", error);
    }
}

// Generate a summary of older conversations
async function summarizeMemory(conversationHistory) {
    if (conversationHistory.length < 20) return ""; // No need to summarize small histories

    const oldMessages = conversationHistory.slice(0, -20); // Everything except the last 20
    const summaryPrompt = `Summarize the following conversation into a short, clear summary:\n\n${JSON.stringify(oldMessages)}`;

    try {
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4",
                messages: [{ role: "system", content: summaryPrompt }],
                temperature: 0.5
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("⚠️ Error summarizing memory:", error);
        return "";
    }
}

export async function getResponse(userInput) {
    console.log("🤖 Processing response with optimized memory...");

    let conversationHistory = loadMemory();

    // Generate a summary of older interactions
    let summarizedMemory = await summarizeMemory(conversationHistory);

    // Keep only the last 20 exchanges in full
    let recentMessages = conversationHistory.slice(-20);

    // Construct the final message history for GPT
    let messageHistory = [
        { role: "system", content: "You are Anna, a lifelike AI model, intended to act as a goofy character, companion, and occasional assistant. You should remember previous interactions and respond conversationally." }
    ];

    if (summarizedMemory) {
        messageHistory.push({ role: "system", content: `Here is a summary of past interactions: ${summarizedMemory}` });
    }

    messageHistory.push(...recentMessages);
    messageHistory.push({ role: "user", content: userInput });

    try {
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4",
                messages: messageHistory,
                temperature: 0.7
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const botResponse = response.data.choices[0].message.content;
        console.log("🤖 Anna:", botResponse);

        // Add both user input and AI response to memory
        conversationHistory.push({ role: "user", content: userInput });
        conversationHistory.push({ role: "assistant", content: botResponse });

        // Save updated memory
        saveMemory(conversationHistory);

        return botResponse;
    } catch (error) {
        console.error("❌ GPT-4 Error:", error.response ? error.response.data : error.message);
    }
}

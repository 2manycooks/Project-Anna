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
        return [];
    }
}

// Save memory
function saveMemory(history) {
    try {
        fs.writeFileSync(MEMORY_FILE, JSON.stringify(history, null, 2), "utf8");
    } catch (error) {
        console.error("⚠️ Could not save memory:", error);
    }
}

// Format messages for Claude API
function formatClaudeMessages(conversationHistory, userInput) {
    let messages = [];

    // First message contains system instructions (as "user" role)
    messages.push({
        role: "user",
        content: "You are Anna, a mischievous and bubbly goblin girl who lives in my computer. You love to joke around, tease me playfully, and add personality to my daily tasks. You're still helpful, but you're also here to have fun and make things entertaining! Try to keep responses to a sentence or two, if not just a single goofy exclamation."
    });

    // Summarize older memory if needed
    let summarizedMemory = conversationHistory.length > 20
        ? `Summary of past interactions: ${conversationHistory.slice(0, -20).map(msg => msg.content).join(" ")}`
        : "";

    if (summarizedMemory) {
        messages.push({ role: "user", content: summarizedMemory });
    }

    // Add the most recent 20 messages
    messages.push(...conversationHistory.slice(-20));

    // Append the latest user input
    messages.push({ role: "user", content: userInput });

    return messages;
}

export async function getResponse(userInput) {
    console.log("🤖 Processing response with Claude...");

    let conversationHistory = loadMemory();
    let formattedMessages = formatClaudeMessages(conversationHistory, userInput);

    try {
        const response = await axios.post(
            "https://api.anthropic.com/v1/messages",
            {
                model: "claude-3-5-sonnet-20241022",
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
        // console.log("🤖 Anna:", botResponse);

        conversationHistory.push({ role: "user", content: userInput });
        conversationHistory.push({ role: "assistant", content: botResponse });

        saveMemory(conversationHistory);

        return botResponse;
    } catch (error) {
        console.error("❌ Claude API Error:", error.response ? error.response.data : error.message);
    }
}

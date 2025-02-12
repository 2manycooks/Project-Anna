import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

let conversationHistory = []; // Store past interactions

export async function getResponse(userInput) {
    console.log("🤖 Processing response with memory...");

    // Limit history length (to prevent massive prompts)
    if (conversationHistory.length > 5) {
        conversationHistory.shift(); // Remove oldest entry
    }

    // Add user input to history
    conversationHistory.push({ role: "user", content: userInput });

    try {
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4",
                messages: [
                    { role: "system", content: "You are Anna, a lifelike AI assistant. You should retain memory of past interactions in this session and respond in a conversational, human-like way." },
                    ...conversationHistory // Send past messages for context
                ],
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

        // Add Anna's response to history
        conversationHistory.push({ role: "assistant", content: botResponse });

        return botResponse;
    } catch (error) {
        console.error("❌ GPT-4 Error:", error.response ? error.response.data : error.message);
    }
}

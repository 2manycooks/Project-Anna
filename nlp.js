import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

export async function getResponse(userInput) {
    try {
        console.log("🤖 Sending to AI:", userInput);

        const response = await axios.post("https://api.openai.com/v1/chat/completions", {
            model: "gpt-4",
            messages: [{ role: "user", content: userInput }]
        }, {
            headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
        });

        console.log("✅ AI Response:", response.data.choices[0].message.content);
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("❌ AI Error:", error.response ? error.response.data : error.message);
        return "Oops! Something went wrong.";
    }
}

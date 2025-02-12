require('dotenv').config();
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

async function transcribeAudio(filePath) {
    try {
        console.log("🔄 Sending file to OpenAI...");

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("❌ API Key is missing!");

        const formData = new FormData();
        formData.append("file", fs.createReadStream(filePath));
        formData.append("model", "whisper-1");

        const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", formData, {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                ...formData.getHeaders()
            }
        });

        console.log("✅ Transcription received:", response.data.text);
        return response.data.text;
    } catch (error) {
        console.error("❌ Error:", error.response ? error.response.data : error.message);
    }
}

// Run the test
transcribeAudio("test.wav");

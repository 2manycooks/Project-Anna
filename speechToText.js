import fs from "fs";
import axios from "axios";
import dotenv from "dotenv";
import FormData from "form-data";

dotenv.config();

async function transcribeAudioFromMic() {
    const filePath = "audio_cache/live_input.wav"; 

    console.log("🔄 Sending file to OpenAI:", filePath);

    if (!fs.existsSync(filePath)) {
        console.error("❌ ERROR: Audio file does not exist!");
        return "";
    }

    const fileSize = fs.statSync(filePath).size;
    if (fileSize === 0) {
        console.error("❌ ERROR: Audio file is empty!");
        return "";
    }

    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("❌ API Key is missing!");

        const formData = new FormData();
        formData.append("file", fs.createReadStream(filePath));
        formData.append("model", "whisper-1");
        formData.append("language", "en");  // 🚨 Force English

        const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", formData, {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                ...formData.getHeaders()
            },
            timeout: 30000
        });

        console.log("✅ Transcription received:", response.data.text);
        return response.data.text;

    } catch (error) {
        console.error("❌ Whisper API Error:", error.response ? error.response.data : error.message);
        return "";
    }
}


export { transcribeAudioFromMic };

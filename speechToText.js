import fs from "fs";
import axios from "axios";
import FormData from "form-data";

export async function transcribeAudioFromMic() {
    const filePath = "audio_cache/live_input.wav";

    console.log("⏳ Waiting for file to be fully ready...");
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (!fs.existsSync(filePath)) {
        console.error("❌ ERROR: live_input.wav does not exist!");
        return;
    }

    const fileSize = fs.statSync(filePath).size;
    console.log(`📏 File size before Whisper request: ${fileSize} bytes`);

    if (fileSize < 1000) {  
        console.error("❌ ERROR: live_input.wav is suspiciously small. Skipping transcription.");
        return;
    }

    console.log("🔄 Sending file to OpenAI:", filePath);

    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("❌ API Key is missing!");

        const formData = new FormData();
        formData.append("file", fs.createReadStream(filePath));
        formData.append("model", "whisper-1");

        const response = await axios.post(`https://api.openai.com/v1/audio/transcriptions?rand=${Date.now()}`, formData, {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                ...formData.getHeaders()
            }
        });

        console.log("✅ Transcription received:", response.data.text);
        return response.data.text;
    } catch (error) {
        console.error("❌ Whisper API Error:", error.response ? error.response.data : error.message);
    }
}


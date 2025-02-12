import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import mic from "mic";

dotenv.config();

async function recordAudio(filePath, duration = 5) {
    return new Promise((resolve, reject) => {
        const microphone = mic({
            rate: "16000",
            channels: "1",
            fileType: "wav",
        });

        console.log(`📁 Writing audio to: ${filePath}`);

        const micInputStream = microphone.getAudioStream();
        const outputStream = fs.createWriteStream(filePath);

        micInputStream.pipe(outputStream);
        microphone.start();
        console.log(`🎤 Recording for ${duration} seconds...`);

        micInputStream.on("error", (err) => {
            console.error("❌ Mic input error:", err);
            reject(err);
        });

        outputStream.on("error", (err) => {
            console.error("❌ File write error:", err);
            reject(err);
        });

        outputStream.on("finish", () => {
            console.log("✅ File writing complete.");
            microphone.stop();
            resolve();
        });

        setTimeout(() => {
            microphone.stop();
        }, duration * 1000);
    });
}



export async function transcribeAudioFromMic(duration = 5) {
    const filePath = "live_input.wav";
    await recordAudio(filePath, duration);

    console.log("⏳ Waiting for file to be fully saved...");
    await new Promise(resolve => setTimeout(resolve, 500)); // Short delay to prevent race condition

    if (!fs.existsSync(filePath)) {
        console.error("❌ ERROR: live_input.wav does not exist!");
        return;
    }

    console.log("🔄 Sending file to OpenAI:", filePath);

    try {
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
        console.error("❌ Whisper API Error:", error.response ? error.response.data : error.message);
    }
}

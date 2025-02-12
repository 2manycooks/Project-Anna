import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import { exec } from "child_process";

dotenv.config();

export async function speak(text) {
    console.log("🔊 Generating speech with ElevenLabs...");

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = "OWd4FHqvuDkDQdXVlW7Z"; // Try "Bella", "Domi", etc.

    try {
        const response = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
            {
                text: text,
                model_id: "eleven_multilingual_v2",
                voice_settings: { 
                    stability: 0.75,         // 0.5-0.75 keeps it more natural
                    similarity_boost: 0.75,  // Closer to original voice
                    style_exaggeration: 0.75 // Lowering exaggeration = slower, calmer tone
                }
            },
            {
                headers: {
                    "xi-api-key": apiKey,
                    "Content-Type": "application/json"
                },
                responseType: "arraybuffer"
            }
        );

        console.log("📦 Received response type:", typeof response.data);

        // Save audio to a file
        const filePath = "response.mp3";
        fs.writeFileSync(filePath, response.data);
        console.log("✅ Speech saved as response.mp3");

        // Play the audio file
        exec("afplay response.mp3", (err) => {
            if (err) console.error("❌ Audio playback error:", err);
        });

    } catch (error) {
        if (error.response) {
            console.error("❌ ElevenLabs API Error:");
            console.error("🔹 Status Code:", error.response.status);
            console.error("🔹 Error Message:", error.response.data);
        } else {
            console.error("❌ Request Failed:", error.message);
        }
    }
}
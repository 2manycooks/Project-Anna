import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import { exec } from "child_process";

dotenv.config();

export async function speak(text) {
    console.log("🔊 Generating speech with ElevenLabs...");

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = "OWd4FHqvuDkDQdXVlW7Z"; // Ensure this is set correctly

    console.log("📢 Sending to ElevenLabs:", text); // Log the text input

    try {
        const response = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
                text: text,
                model_id: "eleven_multilingual_v2", // Make sure this model is available to you
                voice_settings: {
                    stability: 0.4,
                    similarity_boost: 0.9,
                    style_exaggeration: 0.75
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

        // Save the generated audio
        const filePath = "response.mp3";
        fs.writeFileSync(filePath, response.data);
        console.log("✅ Speech saved as response.mp3");

        // Play the audio file
        exec("afplay response.mp3", (err) => {
            if (err) console.error("❌ Audio playback error:", err);
        });

    } catch (error) {
        console.error("❌ ElevenLabs TTS Error:", error.response ? error.response.data : error.message);
    }
}

import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import { exec } from "child_process";

dotenv.config();

const MEMORY_FILE = "memory.json";

// Load Anna’s current mood
function loadMood() {
    try {
        const data = fs.readFileSync(MEMORY_FILE, "utf8");
        return JSON.parse(data).mood || "neutral";
    } catch (error) {
        console.error("⚠️ Could not load mood:", error);
        return "neutral";
    }
}

// Define TTS settings per mood
const moodSettings = {
    happy: { stability: 0.3, similarity_boost: 0.9, style_exaggeration: 0.7 }, // Bubbly, expressive
    neutral: { stability: 0.5, similarity_boost: 0.75, style_exaggeration: 0.5 }, // Normal speech
    sad: { stability: 0.8, similarity_boost: 0.6, style_exaggeration: 0.3 } // Monotone, slower
};

export async function speak(text) {
    console.log("🔊 Generating speech with mood-based tone...");

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = "OWd4FHqvuDkDQdXVlW7Z";

    const currentMood = loadMood();
    const voiceSettings = moodSettings[currentMood] || moodSettings["neutral"];

    console.log(`📢 Mood: ${currentMood} | Settings:`, voiceSettings);

    try {
        const response = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
                text: text,
                model_id: "eleven_multilingual_v2",
                voice_settings: voiceSettings
            },
            {
                headers: {
                    "xi-api-key": apiKey,
                    "Content-Type": "application/json"
                },
                responseType: "arraybuffer"
            }
        );

        // Save the generated speech
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

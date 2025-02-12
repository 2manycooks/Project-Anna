import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import player from "play-sound";

dotenv.config();
const audioPlayer = player();

export async function speak(text) {
    try {
        console.log("🔊 Generating speech...");

        const response = await axios.post(
            "https://api.openai.com/v1/audio/speech",
            {
                model: "tts-1",
                input: text,
                voice: "shimmer"  // Other voices: "echo", "fable", "onyx", "nova", "shimmer"
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
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
        audioPlayer.play(filePath, (err) => {
            if (err) console.error("❌ Audio playback error:", err);
        });

    } catch (error) {
        console.error("❌ TTS Error:", error.response ? error.response.data : error.message);
    }
}
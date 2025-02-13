import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const audioCacheDir = "audio_cache";
if (!fs.existsSync(audioCacheDir)) {
    fs.mkdirSync(audioCacheDir);
}

const outputFile = path.join(audioCacheDir, "live_input.wav");

export default function recordAudio() {
    return new Promise((resolve, reject) => {
        console.log(`📁 Preparing to write new audio to: ${outputFile}`);

        if (fs.existsSync(outputFile)) {
            console.log("🗑️ Deleting previous audio file...");
            fs.unlinkSync(outputFile);
        }

        console.log(`🔍 Attempting to record from microphone using Sox...`);

        const rec = spawn("sox", [
            "-d",              // ✅ Use default input device (your mic)
            "-c", "1",         // ✅ Mono audio
            "-r", "16000",     // ✅ 16kHz sample rate
            "-t", "wav",       // ✅ WAV format
            outputFile,
            "silence", "1", "0.1", "1%", "1", "1.5", "1%" // ✅ Auto-stop after 1.5s of silence
        ]);

        rec.on("close", async (code) => {
            console.log(`🎤 Recording stopped (Exit code: ${code})`);

            // ✅ Ensure file is fully written
            await new Promise(resolve => setTimeout(resolve, 500));

            if (!fs.existsSync(outputFile)) {
                console.error("❌ ERROR: Audio file was not created!");
                return reject("Recording failed: No file created.");
            }

            const fileSize = fs.statSync(outputFile).size;
            if (fileSize === 0) {
                console.error("❌ ERROR: Audio file is empty! Recording failed.");
                return reject("Recording failed: Empty audio file.");
            }

            console.log(`✅ Recording successful! File saved at ${outputFile}, size: ${fileSize} bytes.`);
            resolve(outputFile);
        });

        rec.on("error", (err) => {
            console.error("❌ ERROR: Recording process error:", err.message);
            reject(`Recording error: ${err.message}`);
        });
    });
}

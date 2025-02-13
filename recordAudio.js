import { spawn } from "child_process";
import fs from "fs";
import path from "path";

// Ensure the audio cache directory exists
const audioCacheDir = "audio_cache";
if (!fs.existsSync(audioCacheDir)) {
    fs.mkdirSync(audioCacheDir);
}

// Define the correct file path
const outputFile = path.join(audioCacheDir, "live_input.wav");

export default function recordAudio() {
    return new Promise((resolve, reject) => {
        console.log(`📁 Writing audio to: ${outputFile}`);

        const rec = spawn("sox", [
            "-d",
            "-t", "wav",
            "-b", "16",
            "-c", "1",
            "-r", "16000",
            "-e", "signed-integer",
            outputFile,
            "silence", "1", "0.1", "1%", "1", "1.5", "1%"
        ]);

        rec.on("close", (code) => {
            console.log(`🎤 Recording stopped (Exit code: ${code})`);

            if (!fs.existsSync(outputFile)) {
                console.error("❌ ERROR: Audio file was not created!");
                return reject("Recording failed: No file created.");
            }

            const fileSize = fs.statSync(outputFile).size;
            if (fileSize === 0) {
                console.error("❌ ERROR: Audio file is empty! Sox may not be recording.");
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

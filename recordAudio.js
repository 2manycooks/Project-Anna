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
            fs.unlinkSync(outputFile);
        }

        // 🚨 Add a Noise Gate: Ignore sounds below 20% volume
        const rec = spawn("sox", [
            "-d",
            "-t", "wav",
            "-b", "16",
            "-c", "1",
            "-r", "16000",
            "-e", "signed-integer",
            outputFile,
            "silence", "1", "0.1", "3%", "1", "1.5", "3%"

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

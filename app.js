import { transcribeAudioFromMic } from "./speechToText.js";
import { getResponse } from "./nlp.js";
import { speak } from "./textToSpeech.js";
import recordAudio from "./recordAudio.js";

import levenshtein from "fast-levenshtein";

async function mainLoop() {
    console.log("🎙️ Anna is now running. Speak into the mic!");

    let lastResponse = "";
    let hasSpoken = false;

    while (true) {
        try {
            console.log("🎤 Starting new recording...");
            
            await new Promise(resolve => setTimeout(resolve, 500)); // 🚨 Add a 0.5s delay before re-recording
            await recordAudio();

            console.log("⏳ Processing previous input...");
            const userInput = await transcribeAudioFromMic();

            if (!userInput || userInput.trim() === "") {
                console.log("⚠️ No speech detected, listening again...");
                continue;
            }

            console.log(`👤 You: ${userInput}`);

            // 🚨 Strong Echo Detection - Ignore if input is almost identical to last response
            if (hasSpoken) {
                const similarity = levenshtein.get(userInput.toLowerCase(), lastResponse.toLowerCase());
                const maxLength = Math.max(userInput.length, lastResponse.length);

                if (maxLength > 0) {
                    let similarityRatio = similarity / maxLength;

                    if (similarityRatio < 0.25) { 
                        console.log("🔇 Ignoring self-response (echo detected)...");
                        continue; // Do not process this as input
                    }
                }
            }

            const aiResponse = await getResponse(userInput);
            console.log(`🤖 Anna: ${aiResponse}`);

            lastResponse = aiResponse; // Store the latest response
            hasSpoken = true;

            await speak(aiResponse); // Have Anna respond

        } catch (error) {
            console.error("❌ Error in main loop:", error);
        }
    }
}

// let lastResponse = ""; // Store Anna's last response

// async function mainLoop() {
//     console.log("🎙️ Anna is now running. Speak into the mic!");

//     while (true) {
//         try {
//             await recordAudio(); // Capture microphone input
//             const userInput = await transcribeAudioFromMic();

//             if (!userInput || userInput.trim() === "") {
//                 console.log("⚠️ No speech detected, listening again...");
//                 continue;
//             }

//             // ✅ Ignore input if it's the same as Anna's last response (prevents echo)
//             if (userInput.trim() === lastResponse.trim()) {
//                 console.log("🔇 Ignoring echo (Anna heard herself)");
//                 continue;
//             }

//             console.log(`👤 You: ${userInput}`);
//             const aiResponse = await getResponse(userInput);
//             console.log(`🤖 Anna: ${aiResponse}`);

//             lastResponse = aiResponse; // ✅ Store response to prevent echo
//             await speak(aiResponse); // Have Anna respond

//         } catch (error) {
//             console.error("❌ Error in main loop:", error);
//         }
//     }
// }



mainLoop(); // Start the loop

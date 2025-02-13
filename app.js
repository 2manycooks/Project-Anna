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
            const audioPromise = recordAudio(); // ✅ No need to pass a filename

            console.log("⏳ Processing previous input...");
            transcribeAudioFromMic() // ✅ No parameter needed
                .then(async (userInput) => {
                    if (!userInput || userInput.trim() === "") {
                        console.log("⚠️ No speech detected, listening again...");
                        return;
                    }

                    console.log(`👤 You: ${userInput}`);

                    if (hasSpoken) {
                        const similarity = levenshtein.get(userInput.toLowerCase(), lastResponse.toLowerCase());
                        const maxLength = Math.max(userInput.length, lastResponse.length);
                        if (maxLength > 0 && (similarity / maxLength) < 0.25) {
                            console.log("🔇 Ignoring self-response (echo detected)...");
                            return;
                        }
                    }

                    const aiResponse = await getResponse(userInput);
                    console.log(`🤖 Anna: ${aiResponse}`);

                    lastResponse = aiResponse;
                    hasSpoken = true;

                    await speak(aiResponse);
                })
                .catch(err => console.error("❌ Error transcribing:", err));

            await audioPromise;

        } catch (error) {
            console.error("❌ Error in main loop:", error);
        }
    }
}



mainLoop(); // Start the loop

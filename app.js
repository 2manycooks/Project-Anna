import { transcribeAudioFromMic } from "./speechToText.js";
import { getResponse } from "./nlp.js";

async function runAssistant() {
    console.log("🎙️ Speak now...");

    let transcribedText = await transcribeAudioFromMic(5);  // Records for 5 seconds
    console.log("📝 User said:", transcribedText);

    let response = await getResponse(transcribedText);
    console.log("🤖 Anna:", response);
}

runAssistant();

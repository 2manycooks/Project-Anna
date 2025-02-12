import { transcribeAudio } from "./speechToText.js";
import { getResponse } from "./nlp.js";

async function runAssistant() {
    console.log("🎙️ Recording (using test.wav)...");

    let transcribedText = await transcribeAudio("test.wav");  // Replace with live mic later
    console.log("📝 User said:", transcribedText);

    let response = await getResponse(transcribedText);
    console.log("🤖 Anna:", response);
}

runAssistant();

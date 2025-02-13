import { transcribeAudioFromMic } from "./speechToText.js";
import { getResponse } from "./nlp.js";
import { speak } from "./textToSpeech.js";

async function runAssistant() {
    console.log("🎙️ Speak now...");

    let transcribedText = await transcribeAudioFromMic(8);
    console.log("📝 User said:", transcribedText);

    let response = await getResponse(transcribedText);
    // console.log("🤖 Anna:", response);

    await speak(response); // Anna speaks her response
}

runAssistant();

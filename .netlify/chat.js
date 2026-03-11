/* netlify/functions/chat.js */
const { OpenAI } = require('openai');
const fs = require('fs');
const os = require('os');
const path = require('path');

exports.handler = async function(event, context) {
    // 1. Nur POST erlauben
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Nur POST erlaubt' };
    }

    try {
        // Daten parsen
        const body = JSON.parse(event.body);
        const { audio, apiKey, systemPrompt } = body;

        if(!audio || !apiKey) {
            return { statusCode: 400, body: JSON.stringify({ error: "Audio oder API Key fehlt" }) };
        }

        // OpenAI initialisieren
        const openai = new OpenAI({ apiKey: apiKey });

        // A. SCHRITT 1: Whisper (Speech to Text)
        // Wir müssen das Base64 Audio kurz als Datei speichern, da Whisper Streams/Dateien will
        const tempFilePath = path.join(os.tmpdir(), `upload_${Date.now()}.mp3`);
        const audioBuffer = Buffer.from(audio, 'base64');
        fs.writeFileSync(tempFilePath, audioBuffer);

        console.log("-> Sende an Whisper...");
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: "whisper-1",
        });
        const userText = transcription.text;
        console.log("User sagte:", userText);

        // B. SCHRITT 2: GPT-4o (Text Antwort)
        console.log("-> Frage GPT-4o...");
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt || "Du bist ein hilfreicher Assistent." },
                { role: "user", content: userText }
            ]
        });
        const aiText = completion.choices[0].message.content;
        console.log("KI antwortet:", aiText);

        // C. SCHRITT 3: TTS (Text to Speech)
        console.log("-> Generiere Audio (TTS)...");
        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy", // oder 'nova', 'shimmer' -> kann man später konfigurierbar machen
            input: aiText,
        });
        
        // Das MP3 als Base64 zurückschicken
        const buffer = Buffer.from(await mp3.arrayBuffer());
        const audioBase64 = buffer.toString('base64');

        // Aufräumen (Temp Datei löschen)
        fs.unlinkSync(tempFilePath);

        // D. ANTWORT SENDEN
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userText: userText,
                aiText: aiText,
                audio: audioBase64
            })
        };

    } catch (error) {
        console.error("Backend Fehler:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: error.message || "Unbekannter Server Fehler" 
            })
        };
    }
};

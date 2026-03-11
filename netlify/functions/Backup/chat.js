/* netlify/functions/chat.js */
const { OpenAI } = require('openai');
const fs = require('fs');
const os = require('os');
const path = require('path');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    try {
        const body = JSON.parse(event.body);
        const { audio, apiKey, systemPrompt } = body;

        if(!audio || !apiKey) return { statusCode: 400, body: JSON.stringify({error: "Daten fehlen"}) };

        const openai = new OpenAI({ apiKey: apiKey });

        // 1. Whisper (Audio -> Text)
        const tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}.mp3`);
        fs.writeFileSync(tempFilePath, Buffer.from(audio, 'base64'));

        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: "whisper-1",
        });
        const userText = transcription.text;

        // 2. GPT-4o (Antwort)
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt || "Sei ein Lehrer." },
                { role: "user", content: userText }
            ]
        });
        const aiText = completion.choices[0].message.content;

        // 3. TTS (Audio zurück)
        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: aiText,
        });
        const audioBase64 = Buffer.from(await mp3.arrayBuffer()).toString('base64');

        // Aufräumen
        fs.unlinkSync(tempFilePath);

        return {
            statusCode: 200,
            body: JSON.stringify({ userText, aiText, audio: audioBase64 })
        };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};


exports.handler = async (event) => {
    const ALLOWED_ORIGIN = "https://dialogcoachpro.netlify.app";
    const origin = event.headers.origin || "";

    const corsHeaders = {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: corsHeaders, body: "" };
    }
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers: corsHeaders, body: "Method Not Allowed" };
    }
    if (origin !== ALLOWED_ORIGIN) {
        return { statusCode: 403, headers: corsHeaders, body: "Forbidden" };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, headers: corsHeaders, body: "API Key nicht konfiguriert" };
    }

    // Whisper braucht multipart/form-data – kein JSON
    const contentType = event.headers["content-type"] || "";

    // ── WHISPER (Audio-Transkription) ──────────────────────────────────────
    if (contentType.includes("multipart/form-data")) {
        try {
            // Netlify gibt den Body als base64 zurück
            const buffer = Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8");

            const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": contentType
                },
                body: buffer
            });

            const data = await response.json();
            return {
                statusCode: response.status,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                body: JSON.stringify(data)
            };
        } catch (err) {
            return {
                statusCode: 502,
                headers: corsHeaders,
                body: JSON.stringify({ error: "Whisper Fehler: " + err.message })
            };
        }
    }

    // ── JSON Requests (chat, tts, models) ─────────────────────────────────
    let body;
    try {
        body = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, headers: corsHeaders, body: "Ungültiger Request-Body" };
    }

    const type = body.type || "chat";
    delete body.type;

    // Connection Test
    if (type === "models") {
        const testRes = await fetch("https://api.openai.com/v1/models", {
            headers: { "Authorization": `Bearer ${apiKey}` }
        });
        const testData = await testRes.json();
        return {
            statusCode: testRes.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify(testData)
        };
    }

    // TTS
    if (type === "tts") {
        try {
            const response = await fetch("https://api.openai.com/v1/audio/speech", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });
            const audioBuffer = await response.arrayBuffer();
            return {
                statusCode: response.status,
                headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
                body: Buffer.from(audioBuffer).toString("base64"),
                isBase64Encoded: true
            };
        } catch (err) {
            return {
                statusCode: 502,
                headers: corsHeaders,
                body: JSON.stringify({ error: "TTS Fehler: " + err.message })
            };
        }
    }

    // Chat (GPT-4o)
    if (type === "chat" || type === "questions") {
        try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            return {
                statusCode: response.status,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                body: JSON.stringify(data)
            };
        } catch (err) {
            return {
                statusCode: 502,
                headers: corsHeaders,
                body: JSON.stringify({ error: "Chat Fehler: " + err.message })
            };
        }
    }

    return { statusCode: 400, headers: corsHeaders, body: "Unbekannter Typ" };
};

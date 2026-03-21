exports.handler = async (event) => {
    const ALLOWED_ORIGIN = "https://dialogcoachpro.netlify.app";
    const origin = event.headers.origin || "";

    const corsHeaders = {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    // Preflight request
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: corsHeaders, body: "" };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers: corsHeaders, body: "Method Not Allowed" };
    }

    // Sicherheit: Nur eigene Domain erlaubt
    if (origin !== ALLOWED_ORIGIN) {
        return { statusCode: 403, headers: corsHeaders, body: "Forbidden" };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, headers: corsHeaders, body: "API Key nicht konfiguriert" };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, headers: corsHeaders, body: "Ungültiger Request-Body" };
    }

    // Welcher OpenAI Endpoint soll aufgerufen werden?
    // "type" kann sein: "chat", "tts", "models", "questions"
    const type = body.type || "chat";
    delete body.type; // type nicht an OpenAI weiterschicken

    let endpoint = "";
    let requestBody = {};

    if (type === "chat" || type === "questions") {
        endpoint = "https://api.openai.com/v1/chat/completions";
        requestBody = body;
    } else if (type === "tts") {
        endpoint = "https://api.openai.com/v1/audio/speech";
        requestBody = body;
    } else if (type === "models") {
        // Nur für den Connection-Test
        const testRes = await fetch("https://api.openai.com/v1/models", {
            headers: { "Authorization": `Bearer ${apiKey}` }
        });
        const testData = await testRes.json();
        return {
            statusCode: testRes.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify(testData)
        };
    } else {
        return { statusCode: 400, headers: corsHeaders, body: "Unbekannter Typ" };
    }

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        // TTS gibt Audio-Bytes zurück, kein JSON
        if (type === "tts") {
            const audioBuffer = await response.arrayBuffer();
            return {
                statusCode: response.status,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "audio/mpeg"
                },
                body: Buffer.from(audioBuffer).toString("base64"),
                isBase64Encoded: true
            };
        }

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
            body: JSON.stringify({ error: "Upstream-Fehler: " + err.message })
        };
    }
};

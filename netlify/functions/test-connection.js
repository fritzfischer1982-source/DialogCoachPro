const { OpenAI } = require('openai');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'X' };

    try {
        const { apiKey } = JSON.parse(event.body);
        const openai = new OpenAI({ apiKey: apiKey });
        
        // Minimaler Test: Modelle abrufen
        await openai.models.list();

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: "Verbindung OK! ✅" })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};

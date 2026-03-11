const OpenAI = require("openai");

exports.handler = async (event) => {
    try {
        const { apiKey, model, history } = JSON.parse(event.body);
        const openai = new OpenAI({ apiKey: apiKey });

        const completion = await openai.chat.completions.create({
            model: model || "gpt-4o",
            messages: history,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ aiText: completion.choices[0].message.content })
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};

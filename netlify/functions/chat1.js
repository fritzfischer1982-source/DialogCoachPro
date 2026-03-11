const { OpenAI } = require("openai");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Nur POST erlaubt" };
  }

  try {
    const { message, topic } = JSON.parse(event.body);
    
    // Prüfen ob der Key da ist
    if (!process.env.OPENAI_API_KEY) {
      console.error("FEHLER: OPENAI_API_KEY fehlt in den Netlify Einstellungen!");
      return { statusCode: 500, body: JSON.stringify({ reply: "API Key fehlt." }) };
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.log("Anfrage an OpenAI mit Thema:", topic);

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: `Du bist ein Lehrer. Thema: ${topic}. Antworte kurz.` },
        { role: "user", content: message }
      ],
    });

    const answer = response.choices[0].message.content;
    console.log("KI hat geantwortet:", answer);

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: answer })
    };
  } catch (error) {
    console.error("OpenAI Fehler Details:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ reply: "OpenAI Fehler: " + error.message })
    };
  }
};

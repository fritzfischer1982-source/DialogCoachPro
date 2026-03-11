const { OpenAI } = require("openai");

exports.handler = async (event) => {
  // Nur POST-Anfragen erlauben
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { message, topic } = JSON.parse(event.body);
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Anfrage an ChatGPT
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // oder "gpt-4"
      messages: [
        { 
          role: "system", 
          content: `Du bist ein hilfreicher Sprachlehrer. Das aktuelle Thema ist: ${topic || 'Allgemeines Gespräch'}. Antworte kurz und motivierend auf Deutsch.` 
        },
        { role: "user", content: message },
      ],
    });

    // Die Antwort extrahieren
    const aiReply = response.choices[0].message.content;

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: aiReply }),
    };
  } catch (error) {
    console.error("OpenAI Fehler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Fehler bei der KI-Anfrage", details: error.message }),
    };
  }
};

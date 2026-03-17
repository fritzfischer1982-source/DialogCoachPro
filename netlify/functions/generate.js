/* 
   SERVERLESS FUNCTION - DER SICHERE HAFEN 
   Dieser Code läuft auf den Servern von Netlify, nicht im Browser.
*/

export const handler = async (event, context) => {
  // 1. CORS erlauben (Damit deine eigene Webseite den Server fragen darf)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Pre-Flight Check für Browser (Ignorieren)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Nur POST Anfragen erlauben
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    // 2. Daten empfangen (Vom Lehrer Dashboard)
    const { topic, level, role } = JSON.parse(event.body);
    
    // 3. Den Schlüssel aus dem Tresor holen
    const API_KEY = process.env.OPENAI_API_KEY;

    if (!API_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Server Fehler: Kein API Key konfiguriert." }) };
    }

    // 4. Anfrage an OpenAI senden (Server zu Server)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o", // Oder gpt-3.5-turbo
        messages: [
          {
            role: "system",
            content: `Du bist ein erfahrener Deutschlehrer. Erstelle 5 kurze, knackige Interview-Fragen für einen Schüler.`
          },
          {
            role: "user",
            content: `Thema: ${topic}. Niveau: ${level}. Deine Rolle: ${role}. Erstelle nur die Fragen als JSON Liste.`
          }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();

    // 5. Antwort sauber zurückschicken
    // Wir extrahieren den Text aus der OpenAI Antwort
    const aiText = data.choices[0].message.content;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ result: aiText })
    };

  } catch (error) {
    console.error("Fehler:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Da lief was schief beim Denken." })
    };
  }
};

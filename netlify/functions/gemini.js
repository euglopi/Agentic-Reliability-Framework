// netlify/functions/gemini.js
export async function handler(event) {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // CORS (so your GitHub Pages front-end can call this)
  const cors = {
    "Access-Control-Allow-Origin": "*", // lock down to your domain if you want
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors, body: "" };
  }

  try {
    const { systemPrompt, userPrompt, useGrounding } = JSON.parse(event.body || "{}");

    const payload = {
      contents: [{ parts: [{ text: userPrompt || "" }] }],
      systemInstruction: { parts: [{ text: systemPrompt || "" }] },
      ...(useGrounding ? { tools: [{ google_search: {} }] } : {}),
    };

    const resp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

    return { statusCode: 200, headers: cors, body: JSON.stringify({ text }) };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: String(e) }) };
  }
}

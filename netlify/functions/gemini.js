// netlify/functions/gemini.js
export default async (req, context) => {
  // CORS headers for your site
  const headers = {
    'Access-Control-Allow-Origin': '*', // Tighten to your domain in production
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { status: 405, headers }
    );
  }

  try {
    // Parse request
    const { systemPrompt, userPrompt, useGrounding } = await req.json();

    // Input validation
    if (!userPrompt || typeof userPrompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'userPrompt is required' }), 
        { status: 400, headers }
      );
    }

    // Get API key from environment
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      console.error('GEMINI_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }), 
        { status: 500, headers }
      );
    }

    // Build Gemini payload
    const payload = {
      contents: [{ parts: [{ text: userPrompt }] }]
    };

    if (systemPrompt) {
      payload.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    if (useGrounding) {
      payload.tools = [{ google_search: {} }];
    }

    // Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'AI service error', 
          details: response.status 
        }), 
        { status: response.status, headers }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                 'No response generated';

    return new Response(
      JSON.stringify({ text }), 
      { status: 200, headers }
    );

  } catch (error) {
    console.error('Function error:', error);
    
    if (error.name === 'AbortError') {
      return new Response(
        JSON.stringify({ error: 'Request timeout' }), 
        { status: 504, headers }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers }
    );
  }
};

export const config = {
  path: "/api/gemini"
};

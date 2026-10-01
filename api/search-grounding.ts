import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { query } = req.body || {};
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required.' });
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      '';

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: {
        systemInstruction: `You are the SwiftCart Uganda Market Search Analyst. Use Google Search grounding to retrieve current market prices, verified manufacturer warranties, specs, and regional context in Uganda and East Africa.
Cite real facts clearly and convert relevant prices to Ugandan Shillings (UGX).`,
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || '';
    const groundingChunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    const searchSources = groundingChunks
      .map((chunk: any) => {
        if (chunk.web) {
          return {
            title: chunk.web.title || 'Web Reference',
            uri: chunk.web.uri || '',
          };
        }
        return null;
      })
      .filter(Boolean);

    return res.status(200).json({
      query,
      text,
      model: 'gemini-2.5-flash',
      searchSources,
    });
  } catch (error: any) {
    console.error('Search grounding error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to perform search grounding.',
    });
  }
}

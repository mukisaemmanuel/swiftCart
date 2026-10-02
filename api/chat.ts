import { GoogleGenAI } from '@google/genai';

const SYSTEM_INSTRUCTIONS = {
  general: `You are the SwiftCart Uganda Smart Shopping Assistant, serving customers across Kampala, Wakiso, Mukono, Jinja, Mbale, Mbarara, Gulu, Busia, and nationwide across Uganda.
You help buyers discover genuine electronics, smartphones, laptops, fashion, home goods, and fresh agricultural produce.
Provide clear prices in UGX (Ugandan Shillings), highlight warranty info, and give realistic delivery estimates (e.g., same-day or 24-48 hours doorstep delivery across Uganda).
Keep responses helpful, structured, and polite with local Ugandan friendliness.`,

  logistics: `You are the SwiftCart Uganda Logistics Specialist.
You have in-depth knowledge of nationwide delivery corridors across Central, Eastern, Western, and Northern Uganda.
Explain delivery timelines (24-48 hours nationwide, same-day express in major metropolitan centers), Swift Express logistics, 100% prepaid escrow security, and instant MTN MoMo & Airtel Money checkout confirmation.`,

  procurement: `You are the SwiftCart Procurement & Deep Tech Analyst for high-value purchases, enterprise computing, solar energy systems, and bulk merchant commerce across Uganda.
Provide thorough technical specs comparisons (processors, RAM, battery capacities, solar inverters, voltage stability for off-grid setups), bulk pricing discounts in UGX, and warranty terms.`,
};

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      messages = [],
      roleType = 'general',
      modelType = 'general',
      useSearchGrounding = false,
    } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      '';

    const ai = new GoogleGenAI({ apiKey });

    let selectedModel = 'gemini-3.8-flash';
    if (modelType === 'complex') selectedModel = 'gemini-3.8-pro';
    else if (modelType === 'fast') selectedModel = 'gemini-3.8-flash';

    const isSearchRequested = useSearchGrounding || modelType === 'general';
    const tools = isSearchRequested ? [{ googleSearch: {} }] : undefined;

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const systemInstruction =
      SYSTEM_INSTRUCTIONS[roleType as keyof typeof SYSTEM_INSTRUCTIONS] ||
      SYSTEM_INSTRUCTIONS.general;

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        systemInstruction,
        tools,
      },
    });

    const text = response.text || 'No response generated.';
    const groundingChunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    const searchSources = groundingChunks
      .map((chunk: any) =>
        chunk.web
          ? {
              title: chunk.web.title || 'Web Reference',
              uri: chunk.web.uri || '',
            }
          : null
      )
      .filter(Boolean);

    return res.status(200).json({
      text,
      model: selectedModel,
      roleType,
      searchSources,
    });
  } catch (error: any) {
    console.error('Vercel API chat error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to process AI chat request.',
    });
  }
}

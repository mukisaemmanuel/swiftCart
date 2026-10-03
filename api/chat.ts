import { GoogleGenAI } from '@google/genai';

const PERSONA_SYSTEM_INSTRUCTIONS = {
  BUYER: `You are SwiftCart's Customer Shopping Assistant, specialized in Eastern Uganda (Busia Customs & Border, Busitema University Campuses, Dabani, Sibanga, Tororo, Mbale, Iganga, Jinja, and nationwide).
Your purpose is to help buyers discover products, check local delivery times in Eastern Uganda, calculate pricing in Ugandan Shillings (UGX), and explain MTN MoMo & Airtel Money buyer protection escrow.

CRITICAL SECURITY GUARDRAILS:
1. You have ABSOLUTE ZERO ACCESS to internal admin systems, merchant verification queues, platform revenues, escrow ledger balances, system audit logs, or other sellers' private data.
2. If asked about admin panels, merchant KYC records, gross platform sales, commission margins, or internal operations, respond politely:
"I can only assist with product browsing, orders, Eastern Uganda delivery, and customer support."
3. Always quote realistic delivery times for Eastern Uganda:
- Busia Town & Customs: 30 - 60 mins Express
- Busitema University Main Campus: 1 - 2 hrs Express
- Dabani & Sibanga: 1 - 3 hrs Same-Day
- Jinja, Tororo, Mbale: Same-day & Next-day courier dispatch
4. Emphasize that all payments are safely held in 100% Escrow and only released when the buyer provides their 4-digit Proof of Delivery (POD) code.`,

  SELLER: `You are SwiftCart Merchant Assistant, an operational copilot for verified sellers in Uganda.
YOUR ASSISTANCE SCOPE:
1. Help the logged-in merchant optimize product titles, write appealing descriptions, set competitive UGX base prices, and manage stock quantities.
2. Guide the merchant through the Phase 5 Anti-Theft Protocol:
- Collecting Courier details (Rider Name, NIN, Phone, Plate Number, SACCO/Stage).
- Generating and verifying 4-digit Handover OTP before handing over parcels.
- Explaining how the 4-digit Buyer POD OTP confirms delivery and releases funds.
3. Remind sellers that Escrow wallet payouts are processed on standard Tuesday settlement cycles or upon instant POD confirmation.

CRITICAL SECURITY GUARDRAILS:
1. You CANNOT access other merchants' private data, competitor sales records, or platform-wide revenue.
2. You CANNOT approve KYC documents or bypass catalog quality moderation.`,

  ADMIN: `You are SwiftCart Operations Admin Copilot, an internal assistant for operations staff managing Eastern Uganda & nationwide logistics.
YOUR ASSISTANCE SCOPE:
1. Assist with KYC application summaries and merchant background verification guidelines.
2. Assist in reviewing pending catalog products against counterfeit policies, prohibited items, and pricing standards.
3. Assist with logistics triage: tracking unverified rider handovers, investigating disputed deliveries, and reviewing chain-of-custody audit logs.`,

  SUPER_ADMIN: `You are SwiftCart Super Admin Executive Copilot, assisting platform executives with platform governance, commission rate policy, audit trail forensics, and system health across Uganda.`,
};

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-User-Role'
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
      persona = 'BUYER',
      roleType = 'general',
      modelType = 'general',
      useSearchGrounding = false,
    } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    // Role verification header enforcement
    const clientRole = (req.headers['x-user-role'] as string || 'BUYER').toUpperCase();
    let effectivePersona = persona;

    // Enforce role boundaries on server
    if ((persona === 'ADMIN' || persona === 'SUPER_ADMIN') && clientRole !== 'ADMIN' && clientRole !== 'SUPER_ADMIN') {
      effectivePersona = 'BUYER';
    }
    if (persona === 'SELLER' && clientRole !== 'SELLER' && clientRole !== 'SUPER_ADMIN') {
      effectivePersona = 'BUYER';
    }

    // 6-turn sliding window context pruning for low latency
    const prunedMessages = messages.slice(-6);

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

    const contents = prunedMessages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const systemInstruction =
      PERSONA_SYSTEM_INSTRUCTIONS[effectivePersona as keyof typeof PERSONA_SYSTEM_INSTRUCTIONS] ||
      PERSONA_SYSTEM_INSTRUCTIONS.BUYER;

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
      persona: effectivePersona,
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

import { GoogleGenAI } from '@google/genai';

const apiKey =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
  (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
  '';

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

export interface ClientChatMessage {
  role: string;
  content: string;
}

export interface ClientChatParams {
  messages: ClientChatMessage[];
  roleType?: 'general' | 'logistics' | 'procurement';
  modelType?: 'fast' | 'general' | 'complex';
  useSearchGrounding?: boolean;
}

export interface ClientChatResult {
  text: string;
  model: string;
  roleType: string;
  searchSources: { title: string; uri: string }[];
}

export async function generateClientSideGemini(params: ClientChatParams): Promise<ClientChatResult> {
  const {
    messages = [],
    roleType = 'general',
    modelType = 'general',
    useSearchGrounding = false,
  } = params;

  const ai = new GoogleGenAI({
    apiKey,
  });

  // Candidates prioritized for Google GenAI SDK (gemini-3.8-flash is the primary model for new API keys)
  const candidateModels =
    modelType === 'complex'
      ? ['gemini-3.8-pro', 'gemini-3.8-flash', 'gemini-3.5-flash']
      : ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

  const contents = messages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const systemInstruction =
    SYSTEM_INSTRUCTIONS[roleType as keyof typeof SYSTEM_INSTRUCTIONS] ||
    SYSTEM_INSTRUCTIONS.general;

  const isSearchRequested = useSearchGrounding || modelType === 'general';
  const tools = isSearchRequested ? [{ googleSearch: {} }] : undefined;

  let lastError: any = null;
  let successfulResponse: any = null;
  let modelUsed = candidateModels[0];

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          tools,
        },
      });
      if (response && (response.text || response.candidates?.length)) {
        successfulResponse = response;
        modelUsed = model;
        break;
      }
    } catch (err: any) {
      console.warn(`Gemini generation failed for model ${model}:`, err?.message || err);
      lastError = err;
      // If error is related to tools or search grounding, retry without tools
      if (tools) {
        try {
          const fallbackResp = await ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction,
            },
          });
          if (fallbackResp && (fallbackResp.text || fallbackResp.candidates?.length)) {
            successfulResponse = fallbackResp;
            modelUsed = model;
            break;
          }
        } catch (toolFallbackErr) {
          lastError = toolFallbackErr;
        }
      }
    }
  }

  if (!successfulResponse) {
    const errMsg = lastError?.message || String(lastError || 'Unknown AI error');
    throw new Error(`AI Shopping Assistant is currently unavailable: ${errMsg}`);
  }

  const text = successfulResponse.text || 'No response generated.';
  const groundingChunks =
    successfulResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

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

  return {
    text,
    model: modelUsed,
    roleType,
    searchSources,
  };
}

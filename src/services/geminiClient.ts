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

  let selectedModel = 'gemini-2.5-flash';
  if (modelType === 'complex') {
    selectedModel = 'gemini-2.5-pro';
  } else if (modelType === 'fast') {
    selectedModel = 'gemini-2.5-flash';
  } else {
    selectedModel = 'gemini-2.5-flash';
  }

  const contents = messages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const systemInstruction =
    SYSTEM_INSTRUCTIONS[roleType as keyof typeof SYSTEM_INSTRUCTIONS] ||
    SYSTEM_INSTRUCTIONS.general;

  const isSearchRequested = useSearchGrounding || modelType === 'general';
  const tools = isSearchRequested ? [{ googleSearch: {} }] : undefined;

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
    model: selectedModel,
    roleType,
    searchSources,
  };
}

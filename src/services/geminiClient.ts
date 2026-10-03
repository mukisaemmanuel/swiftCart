import { GoogleGenAI } from '@google/genai';
import { AIPersonaRole, getPersonaSystemPrompt, sanitizeContextPayload } from './aiContextService';

const apiKey =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
  (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
  '';

export interface ClientChatMessage {
  role: string;
  content: string;
}

export interface ClientChatParams {
  messages: ClientChatMessage[];
  persona?: AIPersonaRole;
  systemInstruction?: string;
  roleType?: 'general' | 'logistics' | 'procurement';
  modelType?: 'fast' | 'general' | 'complex';
  useSearchGrounding?: boolean;
  onChunk?: (text: string) => void;
}

export interface ClientChatResult {
  text: string;
  model: string;
  roleType: string;
  searchSources: { title: string; uri: string }[];
}

/**
 * Token-by-token streaming Gemini AI generation with Persona Guardrails and 6-turn sliding memory.
 */
export async function generateStreamingClientSideGemini(
  params: ClientChatParams
): Promise<ClientChatResult> {
  const {
    messages = [],
    persona = 'BUYER',
    systemInstruction,
    roleType = 'general',
    modelType = 'general',
    useSearchGrounding = false,
    onChunk,
  } = params;

  const ai = new GoogleGenAI({ apiKey });

  // 1. Sliding window context pruning (keep last 6 turns to reduce token payload & TTFT latency)
  const prunedMessages = sanitizeContextPayload(persona, messages, 6);

  const candidateModels =
    modelType === 'complex'
      ? ['gemini-3.8-pro', 'gemini-3.8-flash', 'gemini-3.5-flash']
      : ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

  const contents = prunedMessages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const activeSystemInstruction =
    systemInstruction || getPersonaSystemPrompt(persona);

  const isSearchRequested = useSearchGrounding || modelType === 'general';
  const tools = isSearchRequested ? [{ googleSearch: {} }] : undefined;

  let lastError: any = null;
  let accumulatedText = '';
  let modelUsed = candidateModels[0];
  let searchSources: Array<{ title: string; uri: string }> = [];

  for (const model of candidateModels) {
    try {
      accumulatedText = '';
      const responseStream = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction: activeSystemInstruction,
          tools,
        },
      });

      for await (const chunk of responseStream) {
        const chunkText = chunk.text || '';
        accumulatedText += chunkText;
        if (onChunk && chunkText) {
          onChunk(accumulatedText);
        }

        // Collect grounding metadata if returned
        const groundingChunks =
          chunk.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        for (const gc of groundingChunks) {
          if (gc.web && gc.web.uri) {
            if (!searchSources.some((s) => s.uri === gc.web.uri)) {
              searchSources.push({
                title: gc.web.title || 'Web Reference',
                uri: gc.web.uri,
              });
            }
          }
        }
      }

      if (accumulatedText.trim().length > 0) {
        modelUsed = model;
        break;
      }
    } catch (err: any) {
      console.warn(`Gemini streaming failed for model ${model}:`, err?.message || err);
      lastError = err;

      // If search tools caused the error, retry without tools
      if (tools) {
        try {
          accumulatedText = '';
          const fallbackStream = await ai.models.generateContentStream({
            model,
            contents,
            config: {
              systemInstruction: activeSystemInstruction,
            },
          });

          for await (const chunk of fallbackStream) {
            const chunkText = chunk.text || '';
            accumulatedText += chunkText;
            if (onChunk && chunkText) {
              onChunk(accumulatedText);
            }
          }

          if (accumulatedText.trim().length > 0) {
            modelUsed = model;
            break;
          }
        } catch (fbErr) {
          lastError = fbErr;
        }
      }
    }
  }

  if (!accumulatedText.trim()) {
    const errMsg = lastError?.message || String(lastError || 'Unknown AI error');
    throw new Error(`AI Shopping Assistant is currently unavailable: ${errMsg}`);
  }

  return {
    text: accumulatedText,
    model: modelUsed,
    roleType,
    searchSources,
  };
}

/**
 * Standard non-streaming fallback helper.
 */
export async function generateClientSideGemini(
  params: ClientChatParams
): Promise<ClientChatResult> {
  return generateStreamingClientSideGemini(params);
}

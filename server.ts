import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// System instructions for different roles
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

function formatGeminiError(error: any): string {
  if (!error) return 'An unexpected error occurred.';
  const rawMsg = error?.message || String(error);
  try {
    const parsed = JSON.parse(rawMsg);
    if (parsed?.error?.message) {
      if (parsed.error.code === 429) {
        return 'Gemini API quota exceeded. You can check your billing plan in Settings > Secrets.';
      }
      if (parsed.error.code === 403 || parsed.error.code === 400) {
        return 'Invalid or unauthorized API key. Please check your API key in Settings > Secrets.';
      }
      return parsed.error.message;
    }
  } catch (e) {
    // raw string
  }
  if (rawMsg.includes('429') || rawMsg.includes('quota')) {
    return 'Gemini API quota reached. You can attach a billing-enabled key in Settings > Secrets.';
  }
  return rawMsg;
}

// POST /api/chat - Multi-turn Chat with model selection & search grounding
app.post('/api/chat', async (req, res) => {
  try {
    const {
      messages = [],
      roleType = 'general',
      modelType = 'general', // 'fast' | 'general' | 'complex'
      useSearchGrounding = false,
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    // Model selection based on requirements:
    // - Complex tasks: gemini-3.1-pro-preview
    // - General tasks: gemini-3.5-flash
    // - Fast tasks: gemini-3.1-flash-lite
    let selectedModel = 'gemini-3.5-flash';
    if (modelType === 'complex') {
      selectedModel = 'gemini-3.1-pro-preview';
    } else if (modelType === 'fast') {
      selectedModel = 'gemini-3.1-flash-lite';
    } else {
      selectedModel = 'gemini-3.5-flash';
    }

    // If search grounding is explicitly requested or model is general with search, ensure search tool is configured
    // Search grounding requires gemini-3.5-flash (with googleSearch tool)
    const isSearchRequested = useSearchGrounding || modelType === 'general';
    const tools = isSearchRequested && selectedModel === 'gemini-3.5-flash'
      ? [{ googleSearch: {} }]
      : undefined;

    // Convert multi-turn history into @google/genai contents format
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

    // Map grounding chunks into clean format for client
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

    res.json({
      text,
      model: selectedModel,
      roleType,
      searchSources,
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: formatGeminiError(error),
    });
  }
});

// POST /api/search-grounding - Dedicated Search Grounding with gemini-3.5-flash
app.post('/api/search-grounding', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required.' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
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

    res.json({
      query,
      text,
      model: 'gemini-3.5-flash',
      searchSources,
    });
  } catch (error: any) {
    console.error('Search grounding error:', error);
    res.status(500).json({
      error: formatGeminiError(error),
    });
  }
});

// WebSocket Server for Gemini Live API (gemini-3.8-live)
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
  if (pathname === '/api/live-ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('Client connected to Live API WebSocket');
  let session: any = null;

  try {
    session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: `You are SwiftCart Live Voice Assistant, a friendly Ugandan e-commerce shopping advisor for Busia, Busitema University, Jinja, and the Eastern region.
Help buyers find products (smartphones, laptops, solar kits, farm produce), check local zone delivery times (e.g. Busitema campus, Dabani, Sibanga, Busia Town), and answer order queries.
Keep spoken responses natural, conversational, concise, and upbeat.`,
      },
      callbacks: {
        onmessage: (message: any) => {
          // Model audio output
          const audio =
            message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio) {
            clientWs.send(JSON.stringify({ type: 'audio', audio }));
          }

          // User interruption notice
          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ type: 'interrupted' }));
          }

          // Output transcript if available
          const textPart = message.serverContent?.modelTurn?.parts?.find(
            (p: any) => p.text
          );
          if (textPart?.text) {
            clientWs.send(JSON.stringify({ type: 'transcript', text: textPart.text }));
          }
        },
        onclose: () => {
          clientWs.send(JSON.stringify({ type: 'status', status: 'closed' }));
        },
        onerror: (err: any) => {
          console.error('Gemini Live session error:', err);
          clientWs.send(JSON.stringify({ type: 'error', error: String(err?.message || err) }));
        },
      },
    });

    clientWs.send(
      JSON.stringify({
        type: 'status',
        status: 'ready',
        message: 'Connected to Gemini 3.8 Live API.',
      })
    );

    clientWs.on('message', (data: any) => {
      try {
        const payload = JSON.parse(data.toString());
        if (payload.audio && session) {
          session.sendRealtimeInput({
            audio: { data: payload.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (payload.text && session) {
          session.sendRealtimeInput({
            text: payload.text,
          });
        }
      } catch (err) {
        console.error('Error handling client message:', err);
      }
    });

    clientWs.on('close', () => {
      console.log('Client WebSocket closed');
      try {
        if (session) session.close();
      } catch (e) {}
    });
  } catch (err: any) {
    console.error('Failed to initialize Live session:', err);
    clientWs.send(
      JSON.stringify({
        type: 'error',
        error: err?.message || 'Could not connect to Gemini Live API.',
      })
    );
    clientWs.close();
  }
});

// Mount Vite middleware in development
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    // Serve transformed index.html in development for all HTML navigation GET requests
    app.use('*', async (req, res, next) => {
      if (req.method !== 'GET' || req.originalUrl.startsWith('/api')) {
        return next();
      }
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(port, () => {
    console.log(`SwiftCart Full-Stack Server listening on http://localhost:${port}`);
  });
}

startServer();

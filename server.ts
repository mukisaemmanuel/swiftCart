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

// --- RBAC Middleware & Guard Helpers ---
const requireRole = (allowedRoles: string[]) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userRole = (req.headers['x-user-role'] as string || '').toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

    if (!userRole) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required. Please sign in with an authorized account.',
      });
    }

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Insufficient permissions. Access requires one of: ${normalizedAllowed.join(', ')}.`,
        userRole,
        requiredRoles: normalizedAllowed,
      });
    }

    next();
  };
};

// GET /api/rbac/verify - Client token & role verification gateway
app.get('/api/rbac/verify', (req, res) => {
  const userRole = (req.headers['x-user-role'] as string || '').toUpperCase();
  const requestedScope = (req.query.scope as string || '').toUpperCase();

  if (!userRole) {
    return res.status(401).json({ authorized: false, reason: 'UNAUTHENTICATED' });
  }

  let authorized = false;
  if (requestedScope === 'SUPERADMIN' && userRole === 'SUPER_ADMIN') authorized = true;
  else if (requestedScope === 'ADMIN' && (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')) authorized = true;
  else if (requestedScope === 'SELLER' && userRole === 'SELLER') authorized = true;
  else if (requestedScope === 'BUYER' || !requestedScope) authorized = true;

  if (!authorized) {
    return res.status(403).json({
      authorized: false,
      reason: 'FORBIDDEN',
      userRole,
      requestedScope,
    });
  }

  return res.json({ authorized: true, userRole });
});

// POST /api/seller/apply - Merchant inquiry application gateway
app.post('/api/seller/apply', (req, res) => {
  const { applicantName, email, phone, storeName, businessType, district, address, description } = req.body;
  if (!applicantName || !email || !phone || !storeName) {
    return res.status(400).json({ error: 'Missing required applicant fields.' });
  }

  const application = {
    id: `app_${Date.now()}`,
    applicantName,
    email,
    phone,
    storeName,
    businessType: businessType || 'General Merchandise',
    district: district || 'Kampala',
    address: address || 'Kampala',
    description: description || '',
    status: 'PENDING',
    submittedAt: new Date().toISOString(),
  };

  return res.status(201).json({ success: true, application });
});

// GET /api/superadmin/metrics - Guarded exclusively for SUPER_ADMIN
app.get('/api/superadmin/metrics', requireRole(['SUPER_ADMIN']), (_req, res) => {
  return res.json({
    totalGrossVolumeUGX: 42500000,
    totalEscrowHeldUGX: 6850000,
    totalSettledPayoutsUGX: 35650000,
    platformCommissionsUGX: 2125000,
    momoVolumeUGX: 28500000,
    airtelVolumeUGX: 11200000,
    cardVolumeUGX: 2800000,
    activeMerchantsCount: 8,
    totalTransactionsCount: 142,
  });
});

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

// --- PESAPAL v3 PAYMENT GATEWAY BACKEND INTEGRATION ---
const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || '';
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || '';
const PESAPAL_ENV = (process.env.PESAPAL_ENV || 'sandbox').toLowerCase();
const PESAPAL_BASE_URL =
  PESAPAL_ENV === 'live'
    ? 'https://pay.pesapal.com/v3'
    : 'https://cybqa.pesapal.com/pesapalv3';

let cachedPesapalToken: { token: string; expiresAt: number } | null = null;
let cachedIpnId: string | null = null;

async function getPesapalToken(): Promise<string> {
  if (cachedPesapalToken && Date.now() < cachedPesapalToken.expiresAt - 60000) {
    return cachedPesapalToken.token;
  }

  if (!PESAPAL_CONSUMER_KEY || !PESAPAL_CONSUMER_SECRET) {
    throw new Error('Pesapal credentials (PESAPAL_CONSUMER_KEY, PESAPAL_CONSUMER_SECRET) are not configured.');
  }

  const res = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      consumer_key: PESAPAL_CONSUMER_KEY,
      consumer_secret: PESAPAL_CONSUMER_SECRET,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Pesapal Auth RequestToken failed (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as { token?: string; expiryDate?: string; status?: string; error?: any };
  if (!data?.token) {
    const errorMsg = data?.error?.message || data?.error?.code || 'Pesapal auth response did not contain a valid token.';
    throw new Error(`Pesapal Auth failed: ${errorMsg}`);
  }

  const expiresAt = data.expiryDate ? new Date(data.expiryDate).getTime() : Date.now() + 5 * 60 * 1000;
  cachedPesapalToken = { token: data.token, expiresAt };
  return data.token;
}

async function getOrRegisterIPN(token: string): Promise<string> {
  if (cachedIpnId) return cachedIpnId;

  try {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const ipnUrl = `${appUrl}/api/payments/pesapal/ipn`;
    const res = await fetch(`${PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        url: ipnUrl,
        ipn_notification_type: 'GET',
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { ipn_id?: string; status?: string };
      if (data?.ipn_id) {
        cachedIpnId = data.ipn_id;
        return data.ipn_id;
      }
    } else {
      console.warn('RegisterIPN response non-200:', await res.text());
    }
  } catch (err) {
    console.warn('Error during Pesapal RegisterIPN:', err);
  }

  return cachedIpnId || 'default_ipn';
}

// POST /api/payments/pesapal/initiate - Submit order to Pesapal v3
app.post('/api/payments/pesapal/initiate', async (req, res) => {
  try {
    const { orderId, amountUGX, customerPhone, customerName, customerEmail } = req.body;

    if (!orderId || !amountUGX) {
      return res.status(400).json({ error: 'orderId and amountUGX are required.' });
    }

    // Clean phone number to 256XXXXXXXXX format
    let cleanPhone = (customerPhone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '256' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('256') && cleanPhone.length === 9) {
      cleanPhone = '256' + cleanPhone;
    }

    const token = await getPesapalToken();
    const ipnId = await getOrRegisterIPN(token);
    const appUrl = (
      req.body.appUrl ||
      process.env.APP_URL ||
      (req.headers.origin as string) ||
      'http://localhost:3000'
    ).replace(/\/+$/, '');

    const submitPayload = {
      id: String(orderId),
      currency: 'UGX',
      amount: Number(amountUGX),
      description: 'SwiftCart Order Fulfillment',
      callback_url: `${appUrl}/orders`,
      notification_id: ipnId,
      billing_address: {
        phone_number: cleanPhone,
        first_name: customerName || 'Customer',
        email_address: customerEmail || 'buyer@swiftcart.ug',
      },
    };

    const submitRes = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(submitPayload),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      return res.status(submitRes.status).json({
        success: false,
        error: `Pesapal SubmitOrderRequest failed: ${errText}`,
      });
    }

    const data = (await submitRes.json()) as {
      order_tracking_id: string;
      merchant_reference: string;
      redirect_url: string;
      status: string;
      error?: any;
    };

    return res.json({
      success: true,
      redirect_url: data.redirect_url,
      order_tracking_id: data.order_tracking_id,
      merchant_reference: data.merchant_reference,
    });
  } catch (error: any) {
    console.error('Pesapal initiation error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to initiate Pesapal payment.',
    });
  }
});

// GET /api/payments/pesapal/ipn - Instant Payment Notification webhook
app.get('/api/payments/pesapal/ipn', async (req, res) => {
  try {
    const orderTrackingId = (req.query.OrderTrackingId || req.query.orderTrackingId) as string;
    const orderMerchantReference = (req.query.OrderMerchantReference || req.query.orderMerchantReference) as string;

    if (!orderTrackingId) {
      return res.status(400).json({ error: 'OrderTrackingId is required.' });
    }

    let status = 'PENDING';
    try {
      const token = await getPesapalToken();
      const statusRes = await fetch(
        `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (statusRes.ok) {
        const statusData = (await statusRes.json()) as {
          payment_status_description?: string;
          status_code?: number;
          payment_method?: string;
        };
        const statusDesc = (statusData.payment_status_description || '').toUpperCase();
        if (statusDesc === 'COMPLETED' || statusData.status_code === 1) {
          status = 'COMPLETED';
        }
      }
    } catch (err) {
      console.warn('Error querying Pesapal transaction status in IPN:', err);
    }

    // Return HTTP 200 with { status: "200", orderTrackingId } as required by Pesapal specifications
    return res.status(200).json({
      status: '200',
      orderTrackingId,
      paymentStatus: status,
      orderMerchantReference,
    });
  } catch (error: any) {
    console.error('Pesapal IPN handler error:', error);
    return res.status(500).json({ error: 'Internal Server Error processing IPN.' });
  }
});

// GET /api/payments/pesapal/status - Query transaction status by tracking ID
app.get('/api/payments/pesapal/status', async (req, res) => {
  try {
    const orderTrackingId = (req.query.orderTrackingId || req.query.OrderTrackingId) as string;
    if (!orderTrackingId) {
      return res.status(400).json({ error: 'orderTrackingId is required.' });
    }

    const token = await getPesapalToken();
    const statusRes = await fetch(
      `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!statusRes.ok) {
      const errText = await statusRes.text();
      return res.status(statusRes.status).json({ error: errText });
    }

    const data = await statusRes.json();
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Error checking Pesapal status.' });
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

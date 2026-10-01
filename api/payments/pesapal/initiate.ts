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

  const data = (await res.json()) as { token?: string; expiryDate?: string };
  if (!data?.token) {
    throw new Error('Pesapal auth response did not contain a valid token.');
  }

  const expiresAt = data.expiryDate ? new Date(data.expiryDate).getTime() : Date.now() + 5 * 60 * 1000;
  cachedPesapalToken = { token: data.token, expiresAt };
  return data.token;
}

async function getOrRegisterIPN(token: string, origin: string): Promise<string> {
  if (cachedIpnId) return cachedIpnId;

  try {
    const appUrl = (process.env.APP_URL || origin || 'http://localhost:3000').replace(/\/+$/, '');
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
      const data = (await res.json()) as { ipn_id?: string };
      if (data?.ipn_id) {
        cachedIpnId = data.ipn_id;
        return data.ipn_id;
      }
    }
  } catch (err) {
    console.warn('Pesapal RegisterIPN fallback:', err);
  }

  return cachedIpnId || 'default_ipn';
}

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
    const { orderId, amountUGX, customerPhone, customerName, customerEmail } = req.body || {};

    if (!orderId || !amountUGX) {
      return res.status(400).json({ error: 'orderId and amountUGX are required.' });
    }

    let cleanPhone = (customerPhone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '256' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('256') && cleanPhone.length === 9) {
      cleanPhone = '256' + cleanPhone;
    }

    const token = await getPesapalToken();
    const origin = (req.headers.origin || req.headers.host ? `https://${req.headers.host}` : 'http://localhost:3000');
    const ipnId = await getOrRegisterIPN(token, origin);
    const appUrl = (req.body.appUrl || process.env.APP_URL || origin).replace(/\/+$/, '');

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
    };

    return res.status(200).json({
      success: true,
      redirect_url: data.redirect_url,
      order_tracking_id: data.order_tracking_id,
      merchant_reference: data.merchant_reference,
    });
  } catch (error: any) {
    console.error('Pesapal initiation error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal error initiating Pesapal payment.',
    });
  }
}

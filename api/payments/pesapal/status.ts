const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || '';
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || '';
const PESAPAL_ENV = (process.env.PESAPAL_ENV || 'sandbox').toLowerCase();
const PESAPAL_BASE_URL =
  PESAPAL_ENV === 'live'
    ? 'https://pay.pesapal.com/v3'
    : 'https://cybqa.pesapal.com/pesapalv3';

let cachedPesapalToken: { token: string; expiresAt: number } | null = null;

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
    throw new Error(`Pesapal Auth failed (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as { token?: string; expiryDate?: string };
  if (!data?.token) {
    throw new Error('Pesapal auth response did not contain a valid token.');
  }

  const expiresAt = data.expiryDate ? new Date(data.expiryDate).getTime() : Date.now() + 5 * 60 * 1000;
  cachedPesapalToken = { token: data.token, expiresAt };
  return data.token;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const orderTrackingId = req.query.orderTrackingId as string;
    if (!orderTrackingId) {
      return res.status(400).json({ error: 'orderTrackingId is required.' });
    }

    const token = await getPesapalToken();
    const queryUrl = `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`;
    const statusRes = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!statusRes.ok) {
      const errText = await statusRes.text();
      return res.status(statusRes.status).json({
        error: `GetTransactionStatus failed: ${errText}`,
      });
    }

    const data = await statusRes.json();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Pesapal status query error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to check Pesapal transaction status.',
    });
  }
}

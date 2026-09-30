import { PaymentProvider } from '../types';

export interface PaymentInitiationRequest {
  orderReference: string;
  amountUGX: number;
  customerPhone: string;
  customerName: string;
  provider: PaymentProvider;
  narration?: string;
}

export interface PaymentInitiationResponse {
  success: boolean;
  transactionId: string;
  reference: string;
  provider: PaymentProvider;
  amountUGX: number;
  phone: string;
  message: string;
  status: 'PENDING_PIN' | 'SUCCESSFUL' | 'FAILED';
  rawResponse?: unknown;
}

export interface PaymentVerificationResponse {
  transactionId: string;
  status: 'SUCCESSFUL' | 'PENDING' | 'FAILED';
  paidAt?: string;
  failureReason?: string;
}

/**
 * Mobile Money Interface Contract
 * Enables zero-refactor swap from this mock simulator to real MTN MoMo OpenAPI Collections
 * and Airtel Money Open API when production API keys are provided.
 */
export interface MobileMoneyGateway {
  initiatePayment(req: PaymentInitiationRequest): Promise<PaymentInitiationResponse>;
  checkStatus(transactionId: string): Promise<PaymentVerificationResponse>;
}

class MtnMoMoSimulator implements MobileMoneyGateway {
  // MTN MoMo Production / Sandbox config placeholders:
  private subscriptionKey: string = (typeof process !== 'undefined' && process.env?.MTN_MOMO_SUBSCRIPTION_KEY) || 'MOCK_MTN_KEY';
  private targetEnvironment: 'sandbox' | 'live' = 'sandbox';

  async initiatePayment(req: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    // Clean Ugandan MSISDN format (e.g., 256782000000)
    let cleanPhone = req.customerPhone.replace(/[\s+-]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '256' + cleanPhone.slice(1);
    }

    const txId = `MTN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      success: true,
      transactionId: txId,
      reference: req.orderReference,
      provider: 'mtn_momo',
      amountUGX: req.amountUGX,
      phone: cleanPhone,
      message: `USSD Push prompt sent to MTN Mobile Money (+${cleanPhone}). Please approve with your 5-digit MoMo PIN.`,
      status: 'PENDING_PIN',
      rawResponse: {
        env: this.targetEnvironment,
        authStatus: 'authorized_pending_pin',
      },
    };
  }

  async checkStatus(transactionId: string): Promise<PaymentVerificationResponse> {
    return {
      transactionId,
      status: 'SUCCESSFUL',
      paidAt: new Date().toISOString(),
    };
  }
}

class AirtelMoneySimulator implements MobileMoneyGateway {
  // Airtel Money API config placeholders:
  private clientId: string = (typeof process !== 'undefined' && process.env?.AIRTEL_MONEY_CLIENT_ID) || 'MOCK_AIRTEL_ID';
  private targetEnvironment: 'staging' | 'production' = 'staging';

  async initiatePayment(req: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    let cleanPhone = req.customerPhone.replace(/[\s+-]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '256' + cleanPhone.slice(1);
    }

    const txId = `AIRTEL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      success: true,
      transactionId: txId,
      reference: req.orderReference,
      provider: 'airtel_money',
      amountUGX: req.amountUGX,
      phone: cleanPhone,
      message: `Airtel Money authorization initiated for +${cleanPhone}. Enter your Airtel Money PIN on your handset.`,
      status: 'PENDING_PIN',
      rawResponse: {
        env: this.targetEnvironment,
        status_code: '200',
      },
    };
  }

  async checkStatus(transactionId: string): Promise<PaymentVerificationResponse> {
    return {
      transactionId,
      status: 'SUCCESSFUL',
      paidAt: new Date().toISOString(),
    };
  }
}

export interface PesapalInitiationRequest {
  orderId: string;
  amountUGX: number;
  customerPhone: string;
  customerName: string;
  customerEmail?: string;
}

export interface PesapalInitiationResponse {
  success: boolean;
  redirect_url?: string;
  order_tracking_id?: string;
  merchant_reference?: string;
  error?: string;
}

class PaymentService {
  private mtn = new MtnMoMoSimulator();
  private airtel = new AirtelMoneySimulator();

  async initiateMobileMoney(req: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    if (req.provider === 'airtel_money') {
      return this.airtel.initiatePayment(req);
    }
    return this.mtn.initiatePayment(req);
  }

  async initiatePesapalPayment(req: PesapalInitiationRequest): Promise<PesapalInitiationResponse> {
    try {
      const res = await fetch('/api/payments/pesapal/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return {
          success: false,
          error: errData.error || `HTTP ${res.status}: Failed to initiate Pesapal payment`,
        };
      }

      const data = await res.json();
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error connecting to Pesapal gateway.',
      };
    }
  }

  async checkPesapalStatus(orderTrackingId: string): Promise<any> {
    try {
      const res = await fetch(`/api/payments/pesapal/status?orderTrackingId=${encodeURIComponent(orderTrackingId)}`);
      return await res.json();
    } catch (err: any) {
      return { error: err?.message };
    }
  }

  async simulatePinEntryApproval(transactionId: string): Promise<PaymentVerificationResponse> {
    // Simulates buyer entering PIN on their phone
    await new Promise((res) => setTimeout(res, 1200));
    return {
      transactionId,
      status: 'SUCCESSFUL',
      paidAt: new Date().toISOString(),
    };
  }
}

export const paymentService = new PaymentService();

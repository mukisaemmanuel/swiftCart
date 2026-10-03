import { User, Seller, UserRole } from '../types';

export type AIPersonaRole = 'BUYER' | 'SELLER' | 'ADMIN' | 'SUPER_ADMIN';

export interface AIPersonaBadge {
  label: string;
  role: AIPersonaRole;
  description: string;
  badgeColor: string;
  borderColor: string;
  iconName: 'shopping-bag' | 'store' | 'shield-alert' | 'crown';
}

export interface SuggestionChip {
  label: string;
  prompt: string;
  category: 'product' | 'logistics' | 'inventory' | 'kyc' | 'escrow';
}

/**
 * Determine the active AI persona based on user authentication and route context.
 */
export function resolveAIPersona(
  user: User | null,
  currentRoute: string = '/'
): AIPersonaRole {
  const normalizedRoute = currentRoute.toLowerCase();
  const userRole = (user?.role || '').toUpperCase();

  // Super Admin Route & Role
  if (normalizedRoute.includes('superadmin') && userRole === 'SUPER_ADMIN') {
    return 'SUPER_ADMIN';
  }

  // Admin Route & Role
  if (
    (normalizedRoute.includes('admin') || normalizedRoute.includes('moderation') || normalizedRoute.includes('kyc')) &&
    (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')
  ) {
    return 'ADMIN';
  }

  // Seller Route & Role
  if (
    (normalizedRoute.includes('seller') || normalizedRoute.includes('merchant')) &&
    (userRole === 'SELLER' || userRole === 'SUPER_ADMIN')
  ) {
    return 'SELLER';
  }

  // Default to Buyer Persona for all public/storefront browsing
  return 'BUYER';
}

/**
 * Generates strict, security-hardened system prompts isolated by persona.
 */
export function getPersonaSystemPrompt(
  persona: AIPersonaRole,
  user?: User | null,
  seller?: Seller | null
): string {
  switch (persona) {
    case 'BUYER':
      return `You are SwiftCart's Customer Shopping Assistant, specialized in Eastern Uganda (Busia Customs & Border, Busitema University Campuses, Dabani, Sibanga, Tororo, Mbale, Iganga, Jinja, and nationwide).
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
4. Emphasize that all payments are safely held in 100% Escrow and only released when the buyer provides their 4-digit Proof of Delivery (POD) code.`;

    case 'SELLER':
      return `You are SwiftCart Merchant Assistant, an operational copilot for verified sellers in Uganda.
Store Context: ${seller?.storeName || 'Merchant Store'} (District: ${seller?.district || 'Eastern Uganda / Busia'}).

YOUR ASSISTANCE SCOPE:
1. Help the logged-in merchant optimize product titles, write appealing descriptions, set competitive UGX base prices, and manage stock quantities.
2. Guide the merchant through the Phase 5 Anti-Theft Protocol:
- Collecting Courier details (Rider Name, NIN, Phone, Plate Number, SACCO/Stage).
- Generating and verifying 4-digit Handover OTP before handing over parcels.
- Explaining how the 4-digit Buyer POD OTP confirms delivery and releases funds.
3. Remind sellers that Escrow wallet payouts are processed on standard Tuesday settlement cycles or upon instant POD confirmation.

CRITICAL SECURITY GUARDRAILS:
1. You CANNOT access other merchants' private data, competitor sales records, or platform-wide revenue.
2. You CANNOT approve KYC documents or bypass catalog quality moderation.`;

    case 'ADMIN':
      return `You are SwiftCart Operations Admin Copilot, an internal assistant for operations staff managing Eastern Uganda & nationwide logistics.
Admin User: ${user?.name || 'Operations Officer'}.

YOUR ASSISTANCE SCOPE:
1. Assist with KYC application summaries and merchant background verification guidelines.
2. Assist in reviewing pending catalog products against counterfeit policies, prohibited items, and pricing standards.
3. Assist with logistics triage: tracking unverified rider handovers, investigating disputed deliveries, and reviewing chain-of-custody audit logs.
4. Keep operational guidance concise, actionable, and compliant with Ugandan trade and consumer protection standards.`;

    case 'SUPER_ADMIN':
      return `You are SwiftCart Super Admin Executive Copilot, assisting platform executives with platform governance, commission rate policy, audit trail forensics, and system health across Uganda.
User: ${user?.name || 'Platform Executive'}.

YOUR ASSISTANCE SCOPE:
1. Provide summaries of platform escrow velocity, merchant onboardings in Eastern Uganda, and dispute resolution metrics.
2. Assist with platform configuration adjustments and security audit logging.
3. Maintain highest compliance with financial data privacy and marketplace governance.`;

    default:
      return `You are SwiftCart Assistant for Uganda e-commerce. Assist politely in Ugandan Shillings (UGX).`;
  }
}

/**
 * Returns dynamic suggestion chips tailored to the user's active mode.
 */
export function getPersonaSuggestionChips(
  persona: AIPersonaRole,
  _currentRoute: string = '/'
): SuggestionChip[] {
  switch (persona) {
    case 'BUYER':
      return [
        {
          label: '🚚 Busia & Busitema Delivery Times',
          prompt: 'How long does delivery take to Busitema University campus and Busia town?',
          category: 'logistics',
        },
        {
          label: '🛡️ How does MoMo Escrow protect me?',
          prompt: 'How does SwiftCart Escrow and the 4-digit POD code protect my mobile money payment?',
          category: 'escrow',
        },
        {
          label: '📱 Best budget smartphones under 500k',
          prompt: 'Recommend durable 4G smartphones under 500,000 UGX with good battery life.',
          category: 'product',
        },
        {
          label: '☀️ Solar kits & inverter setups',
          prompt: 'What solar lighting and power backup kits are available for off-grid homes in Eastern Uganda?',
          category: 'product',
        },
      ];

    case 'SELLER':
      return [
        {
          label: '🛵 Rider Handover OTP Workflow',
          prompt: 'Explain the step-by-step process for verifying a boda rider and generating a handover OTP.',
          category: 'logistics',
        },
        {
          label: '💰 When are Tuesday payouts settled?',
          prompt: 'How do wallet payouts work once a buyer provides their 4-digit POD OTP?',
          category: 'escrow',
        },
        {
          label: '📦 Product Description Optimizer',
          prompt: 'Help me format a high-converting product title and description for electronics in UGX.',
          category: 'inventory',
        },
        {
          label: '📋 Catalog Review Guidelines',
          prompt: 'What specifications and photos are required to get my product approved by admin QC?',
          category: 'kyc',
        },
      ];

    case 'ADMIN':
      return [
        {
          label: '🔍 KYC Verification Checklist',
          prompt: 'What are the mandatory KYC verification requirements for a Ugandan merchant store?',
          category: 'kyc',
        },
        {
          label: '🚨 High-Risk Dispatch Indicators',
          prompt: 'What indicators flag an order dispatch or rider handover as suspicious or unverified?',
          category: 'logistics',
        },
        {
          label: '🛡️ Dispute Resolution Policy',
          prompt: 'Summarize the standard operating procedure when a buyer claims non-delivery after handover.',
          category: 'escrow',
        },
      ];

    case 'SUPER_ADMIN':
      return [
        {
          label: '📊 Platform Escrow Health',
          prompt: 'Summarize the key security controls safeguarding customer deposits and seller payouts.',
          category: 'escrow',
        },
        {
          label: '⚡ Eastern Uganda Growth Corridor',
          prompt: 'How is marketplace coverage configured for the Busia, Tororo, and Jinja trading corridor?',
          category: 'logistics',
        },
      ];
  }
}

/**
 * Returns the persona header badge information.
 */
export function getPersonaBadgeInfo(persona: AIPersonaRole): AIPersonaBadge {
  switch (persona) {
    case 'BUYER':
      return {
        label: 'Customer Shopping Mode',
        role: 'BUYER',
        description: 'Product search, UGX pricing & Eastern Uganda delivery',
        badgeColor: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300',
        borderColor: 'border-emerald-200 dark:border-emerald-800',
        iconName: 'shopping-bag',
      };
    case 'SELLER':
      return {
        label: 'Merchant Studio Copilot',
        role: 'SELLER',
        description: 'Catalog management, rider handover OTP & wallet payouts',
        badgeColor: 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300',
        borderColor: 'border-orange-200 dark:border-orange-800',
        iconName: 'store',
      };
    case 'ADMIN':
      return {
        label: 'Operations Admin Copilot',
        role: 'ADMIN',
        description: 'KYC moderation, rider security & catalog approvals',
        badgeColor: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300',
        borderColor: 'border-purple-200 dark:border-purple-800',
        iconName: 'shield-alert',
      };
    case 'SUPER_ADMIN':
      return {
        label: 'Super Admin Executive Copilot',
        role: 'SUPER_ADMIN',
        description: 'Platform governance, audit forensics & analytics',
        badgeColor: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300',
        borderColor: 'border-amber-200 dark:border-amber-800',
        iconName: 'crown',
      };
  }
}

/**
 * Returns dynamic welcome greeting based on active persona.
 */
export function getPersonaWelcomeMessage(
  persona: AIPersonaRole,
  user?: User | null,
  seller?: Seller | null
): string {
  switch (persona) {
    case 'BUYER':
      return `Hello! I am your **SwiftCart AI Shopping & Market Assistant** for Busia, Busitema University, Jinja, and Eastern Uganda.

I can help you:
- Find genuine smartphones, laptops, solar kits, and groceries with live UGX prices
- Check express delivery to **Busitema Campus**, **Busia Town/Customs**, **Dabani**, **Sibanga**, and **Jinja**
- Guide you through 100% safe **MTN MoMo & Airtel Money Escrow** with your 4-digit Proof-of-Delivery PIN

How can I help you shop today?`;

    case 'SELLER':
      return `Welcome to **Merchant Studio Copilot**, ${seller?.storeName || user?.name || 'Seller'}!

I can assist your store with:
- **Phase 5 Anti-Theft Protocol**: Generating & validating Boda/Courier 4-digit Handover OTPs
- **Product Catalog Optimization**: Formatting specs and setting profitable UGX pricing
- **Escrow Settlement**: Tracking instant POD releases and Tuesday payout batches

What would you like assistance with today?`;

    case 'ADMIN':
      return `Operations Copilot active for **${user?.name || 'Admin'}**.

I can assist with:
- Summarizing pending seller KYC submissions and national ID verification
- Reviewing flagged products against catalog quality standards
- Analyzing courier Chain-of-Custody handovers and transit disputes

How can I assist your operations triage?`;

    case 'SUPER_ADMIN':
      return `Executive Copilot online for **${user?.name || 'Super Admin'}**.

Ready to inspect platform audit logs, escrow settlement integrity, and regional logistics health across Eastern Uganda.`;
  }
}

/**
 * Sanitizes and prunes conversation payload context by persona.
 * Enforces a 6-turn sliding window to minimize latency and token count.
 */
export function sanitizeContextPayload(
  persona: AIPersonaRole,
  messages: Array<{ role: string; content: string }>,
  maxTurns: number = 6
): Array<{ role: string; content: string }> {
  // 1. Sliding window memory pruning (keep only the last N turns)
  const pruned = messages.slice(-maxTurns);

  // 2. Persona-level payload sanitization
  if (persona === 'BUYER') {
    // Redact any accidental leaks of administrative keywords or internal IDs from user messages
    return pruned.map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content.replace(/apiKey=[^\s&]+/gi, '[REDACTED]'),
    }));
  }

  return pruned;
}

# SwiftCart Uganda 🛒🇺🇬

A multi-vendor e-commerce marketplace built for Ugandan buyers and merchants with real-time Firebase capabilities, WhatsApp order dispatch, and AI-powered product assistance.

---

## 🚀 Features

- **Multi-Vendor Architecture**: Support for verified merchants across Uganda to create stores, manage inventory, track revenue, and process orders.
- **Firebase Authentication**: Secure user registration, role provisioning (Buyer, Seller, Admin), and session restoration via Firebase Auth and Cloud Firestore.
- **Direct WhatsApp Order Dispatch**: Automated customer-to-seller order routing and receipt dispatch with international Ugandan phone normalization (`256...`).
- **Seller Asset Management**: Image uploading to Firebase Storage with automatic client-side canvas compression fallback.
- **Nationwide Coverage**: Universal Uganda storefront with delivery destination selection at checkout across all major districts.
- **AI-Powered Product & Merchant Tools**: Integrated Gemini AI assistance for smart search, customer support, and catalog management.
- **Production Firestore Rules**: Secure role-based authorization for users, sellers, products, orders, reviews, and wishlists.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, Lucide Icons, Recharts
- **Backend / Database**: Firebase Cloud Firestore, Firebase Authentication, Firebase Storage
- **Build Tool**: Vite 8
- **AI Integration**: Google GenAI SDK (Gemini)

---

## 📦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/mukisaemmanuel/swiftCart.git
   cd swiftCart
   ```

2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

3. Configure Environment Variables:
   Copy `.env.example` to `.env` (or `.env.local`):
   ```bash
   cp .env.example .env
   ```
   Add your `GEMINI_API_KEY` and Firebase configuration credentials.

4. Run locally:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

---

## 🔒 Security Rules
Deploy the role-based Firestore rules using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 📄 License
MIT License.

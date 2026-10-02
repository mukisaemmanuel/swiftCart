# SwiftCart Uganda 🛒🇺🇬

A multi-vendor e-commerce marketplace built for Ugandan buyers and merchants with real-time Firebase capabilities, WhatsApp order dispatch, and AI-powered product assistance.

---

## 🔑 Platform Credentials (Admin, Super Admin & Test Accounts)

Use these credentials to sign in directly during testing or administrative management. No manual database setup is required—the application automatically provisions and verifies these accounts directly in Firebase.

### 🛡️ Super Admin / Admin Account
- **Email**: `admin@swiftcart.ug` *(or `superadmin@swiftcart.ug`)*
- **Password**: `Admin@2026`
- **Role**: `admin`
- **Dashboard Access**: Full access to the **SwiftCart Admin Console** (`/admin`), including:
  - Merchant Verification & KYC document review
  - Catalog & Product moderation
  - Order monitoring & Escrow status tracking
  - Seller payout management and disputes
 
> [!TIP]
> **Instant Admin Provisioning**: When you sign in with `admin@swiftcart.ug` and `Admin@2026`, the system automatically provisions your administrative record in Cloud Firestore (`users/{uid}`) with `role: 'admin'` and redirects you straight to the Admin Dashboard.

---

### 👥 Test Accounts (Buyer & Merchant)

| Role | Email | Password | Access / Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@swiftcart.ug` | `Admin@2026` | Full platform control, KYC reviews, orders, payouts |
| **Merchant / Seller** | `seller@swiftcart.ug` | `Seller@2026` | Store dashboard, product upload, inventory & sales |
| **Customer / Buyer** | `buyer@swiftcart.ug` | `Buyer@2026` | Marketplace shopping, cart, wishlist, orders, checkout |

---

## 🗄️ Database Architecture & User Account Verification

> [!IMPORTANT]
> **One-Time Firebase Auth Activation (`auth/configuration-not-found`)**:
> If you see `auth/configuration-not-found` when registering or signing in on a fresh Firebase project:
> 1. Open the [Firebase Console Authentication Page](https://console.firebase.google.com/project/studio-9829790199-ca934/authentication).
> 2. Click **"Get Started"** (or click the **"Sign-in method"** tab).
> 3. Click **Email/Password**, toggle the **Enable** switch to ON, and click **Save**.
> This activates Google Identity Platform for the project and enables registration and login immediately.

SwiftCart Uganda operates **100% on cloud databases (Firebase Authentication & Google Cloud Firestore)**. No user or transactional data is stored in browser `localStorage`.

### 1. What happens when a user creates an account?
1. **Firebase Authentication**: The user's email and password are securely registered in Google's Firebase Auth engine, generating a unique global `UID`.
2. **Cloud Firestore Document Creation**: A dedicated document is instantly written to the `users/{uid}` collection in Firestore with:
   - `id`: The user's Firebase Auth UID
   - `name`: Full Name
   - `email`: User's registered email
   - `role`: Account role (`buyer`, `seller`, or `admin`)
   - `phone`: Contact phone number
   - `address`: Delivery address
   - `createdAt`: ISO server timestamp
3. **Session State**: Firebase Auth manages the secure JWT tokens in memory and indexedDB session storage, surviving page reloads without insecure `localStorage` caching.

### 2. How to verify that accounts and data are in the database
You can inspect and confirm every registered user in two locations:

1. **Firebase Authentication Console**:
   - Go to [Firebase Console > Authentication > Users](https://console.firebase.google.com/project/studio-9829790199-ca934/authentication/users)
   - Here you will see the user's email, UID, date created, and last sign-in timestamp.

2. **Cloud Firestore Data Viewer**:
   - Go to [Firebase Console > Firestore Database > Data](https://console.firebase.google.com/project/studio-9829790199-ca934/firestore/databases/-default-/data)
   - Click on the `users` collection to see the full profile document for that UID.
   - You can also view the `products`, `orders`, `sellers`, and `reviews` collections.

3. **In-App Admin Dashboard**:
   - Sign in with `admin@swiftcart.ug` / `Admin@2026`.
   - Open the **Admin Panel** from the navigation bar.
   - Review live user counts, seller applications, and pending KYC verification.

---

## 🚀 Features

- **Multi-Vendor Architecture**: Support for verified merchants across Uganda to create stores, manage inventory, track revenue, and process orders.
- **Firebase Authentication**: Secure user registration, role provisioning (Buyer, Seller, Admin), and session restoration via Firebase Auth and Cloud Firestore.
- **Direct WhatsApp Order Dispatch**: Automated customer-to-seller order routing and receipt dispatch with international Ugandan phone normalization (`256...`).
- **Seller Asset Management**: Image uploading to Firebase Storage with automatic client-side canvas compression fallback.
- **Nationwide Coverage**: Universal Uganda storefront with delivery destination selection at checkout across all major districts.
- **AI-Powered Assistance**: 
  - **Gemini Smart Text Chat**: Real-time AI shopping assistant and product finder running directly in the browser via Google GenAI SDK.
  - **Gemini 3.8 Live Voice**: Bidirectional voice assistant with automatic fallback to Text Chat when live audio streaming is offline.
- **Production Firestore Rules**: Secure role-based authorization for users, sellers, products, orders, reviews, and wishlists.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, Lucide Icons, Recharts
- **Backend / Database**: Firebase Cloud Firestore, Firebase Authentication, Firebase Storage
- **Hosting**: Firebase Hosting (`studio-9829790199-ca934.web.app`)
- **Build Tool**: Vite 8
- **AI Integration**: Google GenAI SDK (`@google/genai`)

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
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your `VITE_GEMINI_API_KEY` and Firebase configuration credentials.

4. Run locally:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

6. Deploy to Firebase:
   ```bash
   firebase deploy --only hosting,firestore:rules
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

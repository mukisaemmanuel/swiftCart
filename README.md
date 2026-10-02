# SwiftCart Uganda 🛒🇺🇬

A multi-vendor e-commerce marketplace built for Ugandan buyers and merchants with strict Role-Based Access Control (RBAC), real-time Firebase synchronization, automated MoMo Escrow protection, WhatsApp order dispatch, and Gemini AI-powered product assistance.

---

## 🔑 Portal Access & Demo Credentials

Use these credentials to sign in directly or test any role in the application. You can either sign in with **Email & Password** via the Auth Modal or use the **1-Click Demo Persona Switcher** in the top navigation bar.

---

### 👑 1. Super Admin Executive Portal (`/superadmin`)

The **Super Admin** role has executive platform ownership, full financial escrow oversight, and security management.

- **Direct Portal Link**: [`/superadmin`](http://localhost:5173/superadmin) *(or hosted at `https://studio-9829790199-ca934.web.app/superadmin`)*
- **Email**: `superadmin@swiftcart.ug` *(or `admin@swiftcart.ug`)*
- **Password**: `SuperAdmin@2026` *(or `Admin@2026`)*
- **Role**: `SUPER_ADMIN`
- **How to Access**:
  1. Open the website and click **Sign In** &rarr; enter `superadmin@swiftcart.ug` and `SuperAdmin@2026`.
  2. Or click the **Demo Switcher (👥)** in the header and click **"SwiftCart Super Admin (Platform Owner)"**.
  3. Navigate directly to `/superadmin` in your browser.
- **Features & Scope**:
  - 💰 **Escrow & Platform Financial Ledger**: Total Gross Merchandise Value (GMV), protected escrow holdings, platform commissions, and payout logs.
  - 👥 **User Role & RBAC Governance**: Promote/demote any user across `BUYER`, `SELLER`, `ADMIN`, `SUPER_ADMIN`, and toggle account status (`ACTIVE`, `PENDING`, `SUSPENDED`).
  - 📝 **Merchant Applications Review Queue**: Approve or reject KYC seller inquiries with instant feedback.
  - 🛡️ **Immutable Audit Trail**: Chronological activity logs of all administrative actions and security events.

---

### 🛡️ 2. Operations Admin Portal (`/admin`)

The **Operations Admin** manages daily marketplace operations, product catalog moderation, and merchant verification.

- **Direct Portal Link**: [`/admin`](http://localhost:5173/admin) *(or hosted at `https://studio-9829790199-ca934.web.app/admin`)*
- **Email**: `admin@swiftcart.ug`
- **Password**: `Admin@2026`
- **Role**: `ADMIN`
- **How to Access**:
  1. Sign in with `admin@swiftcart.ug` / `Admin@2026`.
  2. Or select **"SwiftCart Operations Admin"** in the Demo Switcher.
  3. Click the **"Admin"** button in the navigation header or open `/admin`.
- **Features & Scope**:
  - Merchant verification and URSB/KYC checks.
  - Product catalog moderation (Approve, reject, edit listings).
  - Customer dispute handling and delivery oversight.
  - Live order monitoring across all Ugandan districts.

---

### 🏪 3. Seller Merchant Portal (`/seller/dashboard`)

The **Seller Portal** is accessible by verified merchants to manage products, inventory, orders, and payouts.

- **Direct Portal Link**: [`/seller/dashboard`](http://localhost:5173/seller/dashboard) or [`/seller`](http://localhost:5173/seller)
- **Verified Seller Accounts**:
  - **Seller 1 (David Mugisha - Apex Technologies)**:
    - **Email**: `david@apextech.ug` *(or `seller@swiftcart.ug`)*
    - **Password**: `Seller@2026`
    - **Role**: `SELLER` (Status: `ACTIVE`)
  - **Seller 2 (Sarah Nambi - Pearl Home Living)**:
    - **Email**: `sarah@pearlhome.ug`
    - **Password**: `Seller@2026`
    - **Role**: `SELLER` (Status: `ACTIVE`)
  - **Seller 3 (Brian Okello - Heritage Crafts, Pending KYC)**:
    - **Email**: `brian@heritagecrafts.ug`
    - **Password**: `Seller@2026`
    - **Role**: `SELLER` (Status: `PENDING`)
- **How to Access**:
  1. Sign in with any seller email and `Seller@2026`.
  2. Or click the **Demo Switcher (👥)** in the header &rarr; choose **"David Mugisha"** or **"Sarah Nambi"**.
  3. Click **"Seller Center"** in the header or visit [`/seller/dashboard`](http://localhost:5173/seller/dashboard).
- **Features & Scope**:
  - 📦 Add & edit product listings with automatic image compression.
  - 📊 Real-time sales analytics, revenue graphs, and stock level alerts.
  - 🚚 Order fulfillment & WhatsApp customer dispatch with auto-formatted receipt messages.
  - 📞 **"Contact Admin" Button**: Direct priority ticket support and WhatsApp Admin Desk connection (`+256 700 123 456`) located directly in the Seller Dashboard header banner.

---

### 🛍️ 4. Customer / Buyer Storefront (`/`)

The public customer interface for shopping, ordering, and tracking.

- **Direct Link**: [`/`](http://localhost:5173/)
- **Demo Customer Account**:
  - **Name**: Grace Kyomugisha
  - **Email**: `grace.k@example.com` *(or `buyer@swiftcart.ug`)*
  - **Password**: `Buyer@2026`
  - **Role**: `BUYER` (Status: `ACTIVE`)
- **How to Access**:
  - Browse publicly at `/` as a guest or sign in with `grace.k@example.com` / `Buyer@2026`.
- **Features & Scope**:
  - Browse multi-vendor catalog by category, district, and Swift Express filter.
  - Gemini AI Text Shopping Assistant & Gemini 3.8 Live Voice.
  - Multi-vendor cart & Pesapal / MTN MoMo / Airtel Money Escrow checkout.
  - Real-time Order Tracking at [`/orders`](http://localhost:5173/orders).
  - Wishlist management at [`/wishlist`](http://localhost:5173/wishlist).
  - **"Apply to Sell"** vetted merchant gateway at [`/sell`](http://localhost:5173/sell).

---

## 📋 Quick Credentials Summary Table

| Role | Name / Persona | Email | Password | Direct URL | Permissions / Access |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **👑 SUPER ADMIN** | SwiftCart Platform Owner | `superadmin@swiftcart.ug` | `SuperAdmin@2026` | [`/superadmin`](http://localhost:5173/superadmin) | Full platform control, Escrow ledger, RBAC manager, Audit trail |
| **🛡️ ADMIN** | Operations Admin | `admin@swiftcart.ug` | `Admin@2026` | [`/admin`](http://localhost:5173/admin) | Daily operations, product/seller moderation, order tracking |
| **🏪 SELLER (Active)** | David Mugisha (Apex Tech) | `david@apextech.ug` | `Seller@2026` | [`/seller/dashboard`](http://localhost:5173/seller/dashboard) | Store dashboard, inventory, orders, analytics, Contact Admin |
| **🏪 SELLER (Active)** | Sarah Nambi (Pearl Home) | `sarah@pearlhome.ug` | `Seller@2026` | [`/seller/dashboard`](http://localhost:5173/seller/dashboard) | Store dashboard, product listings, orders, Contact Admin |
| **⏳ SELLER (Pending)** | Brian Okello (Heritage Crafts) | `brian@heritagecrafts.ug` | `Seller@2026` | [`/seller/dashboard`](http://localhost:5173/seller/dashboard) | Seller portal with pending verification notice |
| **🛍️ BUYER** | Grace Kyomugisha | `grace.k@example.com` | `Buyer@2026` | [`/`](http://localhost:5173/) | Storefront shopping, Gemini AI, cart, MoMo escrow, orders |

---

## 🛡️ Route Security & Route Guards

All protected routes are guarded client-side and server-side:

| Route Path | Allowed Roles | Unauthorized Behavior |
| :--- | :--- | :--- |
| `/` & `/*` | Everyone (`BUYER`, `SELLER`, `ADMIN`, `SUPER_ADMIN`, Guest) | Allowed |
| `/seller/*` | `SELLER`, `SUPER_ADMIN` | HTTP 403 Forbidden Screen + Redirect to Login |
| `/admin/*` | `ADMIN`, `SUPER_ADMIN` | HTTP 403 Forbidden Screen + Redirect to Login |
| `/superadmin/*` | `SUPER_ADMIN` (Exclusively) | HTTP 403 Forbidden Screen + Redirect to Login |
| `/sell` | Everyone | Vetted "Apply to Sell" Merchant Application Gateway |

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
   - `role`: Account role (`BUYER`, `SELLER`, `ADMIN`, `SUPER_ADMIN`)
   - `status`: Account status (`ACTIVE`, `PENDING`, `SUSPENDED`)
   - `phone`: Contact phone number
   - `address`: Delivery address
   - `createdAt`: ISO server timestamp
3. **Session State**: Firebase Auth manages secure JWT tokens in memory and indexedDB session storage, surviving page reloads.

### 2. How to verify accounts in the Firebase Console
1. **Firebase Authentication Console**:
   - Go to [Firebase Console > Authentication > Users](https://console.firebase.google.com/project/studio-9829790199-ca934/authentication/users)
   - Inspect registered emails, UIDs, and timestamps.

2. **Cloud Firestore Data Viewer**:
   - Go to [Firebase Console > Firestore Database > Data](https://console.firebase.google.com/project/studio-9829790199-ca934/firestore/databases/-default-/data)
   - View the `users`, `products`, `orders`, `sellers`, `seller_applications`, `audit_logs`, and `reviews` collections.

---

## 🚀 Features

- **Strict Role-Based Access Control (RBAC)**: 4 isolated roles (`BUYER`, `SELLER`, `ADMIN`, `SUPER_ADMIN`) with HTTP 403 route guards and security enforcement.
- **Multi-Vendor Storefront**: Support for verified merchants across Uganda to list products, manage inventory, track revenue, and process orders.
- **Vetted "Apply to Sell" Gateway**: Prospective merchants apply through an inquiry form for KYC & URSB verification before receiving the `SELLER` role.
- **Direct WhatsApp Order Dispatch**: Automated customer-to-seller order routing and receipt dispatch with international Ugandan phone normalization (`256...`).
- **Seller "Contact Admin" Desk**: Direct support tickets and WhatsApp Admin link in the merchant dashboard.
- **AI-Powered Assistance**: 
  - **Gemini Smart Text Chat**: Real-time AI shopping assistant and product finder running directly in the browser via Google GenAI SDK.
  - **Gemini 3.8 Live Voice**: Bidirectional voice assistant with automatic fallback to Text Chat when live audio streaming is offline.
- **Production Firestore Rules**: Secure role-based authorization for all collections.

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

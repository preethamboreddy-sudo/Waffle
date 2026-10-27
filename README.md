# Waffle Pops and Company — Full-Stack Online Ordering Platform

A production-oriented full-stack online ordering application for **Waffle Pops and Company**, specializing in Belgian-style waffles, signature stuffed waffles, chocolate-dripping waffle pops, and artisan dessert beverages.

Initial launch branch: **Mandadam, Andhra Pradesh** (Main Road, opposite Krupa Bangalore Bakery Shop). *Note: Address and business details are provisional pending official owner confirmation.*

---

## Architecture Overview

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4.
- **Backend**: Node.js + Express + TypeScript (`server.ts` with Vite middleware mounting).
- **Database & Schema**:
  - The runtime store (`src/server/db/store.ts`) persists its complete transactional state to `.data/waffle_db.json` by default.
  - When `DATABASE_URL` is configured, the runtime uses PostgreSQL through `pg` and saves that state in one `StoreState` JSONB row. On first connection, it imports `.data/waffle_db.json` if the PostgreSQL row is empty; it does not silently fall back if the configured database is unavailable.
  - When `AUTH_DATABASE_URL` is configured, new customer accounts are stored in the dedicated `waffle_auth_users` PostgreSQL table with bcrypt password hashes. Existing bootstrap staff/demo accounts continue to work from the local seed store.
  - The normalized Prisma schema and initial SQL migration remain available as the relational schema reference. The current runtime adapter does not write those relational tables.
- **Security & Authorization**:
  - Password hashing with `bcryptjs`.
  - HMAC-signed session tokens with expiry (`src/server/auth.ts`).
  - Customer and staff apps use separate HTTP-only session cookies, selected by the API client scope, so signing in or out in one app does not overwrite the other app's session.
  - Role-based authorization (`CUSTOMER`, `ADMIN`, `OPERATOR`).
  - Strict server-side state machine enforcing valid order status transitions.
  - Idempotency key handling for duplicate checkout submission prevention.
  - Strict ownership checks preventing customers from inspecting other orders.
- **Fulfilment & Payments**:
  - Fulfilment Modes: **Doorstep Delivery** and **Storefront Takeaway**.
  - Payment Choices:
    - **Cash on Delivery (COD)**: Active with pending payment tracking and authorized staff collection recording.
    - **UPI**: Safely isolated abstraction running in Demo Sandbox mode until official merchant gateway credentials are provided.

---

## Brand Palette & Design Tokens

- **Chocolate Brown**: `#39251F`
- **Waffle Gold**: `#F5C76A`
- **Cream**: `#FFF8EF`
- **Berry Accent**: `#B85A45`

*All catalog prices are seeded as DEMO DATA and labeled as such in accordance with business guidelines.*

---

## Default Accounts (Bootstrap / Demo)

1. **Store Administrator (Owner / Manager)**:
   - **Phone**: `9999999999`
   - **Password**: `adminPassword123!`
   - **Role**: `ADMIN`
   - Access via the **Staff Portal** button in the header.

2. **Customer Demo**:
   - **Phone**: `8888888888`
   - **Password**: `customerPass123!`
   - **Role**: `CUSTOMER`

---

## Setup & Running Locally

### Prerequisites
- Node.js 20+ / 22+
- npm or bun

### 1. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure `DATABASE_URL` in `.env` to use your existing PostgreSQL database:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/YOUR_EXISTING_DATABASE?schema=public"
AUTH_DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/YOUR_EXISTING_DATABASE"
POSTS_DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/YOUR_EXISTING_DATABASE"
SESSION_SECRET="your-strong-random-session-secret"
PORT=3000
```
Keep the real connection string in the local `.env` file; `.env` is ignored by Git.

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup (PostgreSQL)
The runtime creates the `StoreState` and `waffle_auth_users` tables automatically when their PostgreSQL URLs are configured. The configured database role needs permission to create tables and read/write rows. On first `DATABASE_URL` connection, existing file-backed store data is copied into PostgreSQL; subsequent writes go to PostgreSQL.

### 4. Start the Full-Stack Application
```bash
npm run dev
```
The server will start at `http://localhost:3000`. The customer app loads at `/`; the separate admin app loads at `/admin/`. Both use the Express API under `/api`.

To run each frontend as its own local web app, use three terminals:

```bash
npm run dev:api       # API at http://127.0.0.1:3000
npm run dev:customer  # customer app at http://127.0.0.1:5173
npm run dev:admin     # admin app at http://127.0.0.1:5174/admin/
```

The standalone Vite apps proxy `/api` to `API_SERVER_URL` (default `http://127.0.0.1:3000`). For separate production origins, set `VITE_API_BASE_URL`, `VITE_ADMIN_APP_URL`, and `VITE_CUSTOMER_APP_URL`, then list both frontend origins in the API host's `CORS_ORIGINS`. Keep the frontends on same-site subdomains to use the existing cookie session model.

### 5. Running Automated Unit Tests
```bash
npx --yes tsx --test src/server/domain/rules.test.ts
```

---

## API Documentation Summary

### Customer Endpoints
- `GET /api/health`: System health, database persistence mode, and provisional warnings.
- `GET /api/branch`: Branch info, hours, delivery fee, min order value, provisional disclaimer.
- `GET /api/categories`: Dessert categories.
- `GET /api/products`: Active menu with variants and add-ons.
- `POST /api/cart/validate`: Authoritative server calculation of line items and taxes.
- `POST /api/auth/register`: Create customer account with hashed password.
- `POST /api/auth/login`: Authenticate and receive session token.
- `GET /api/auth/me`: Current user session.
- `POST /api/orders`: Place order with idempotency check and atomic snapshot.
- `GET /api/orders/:id`: Detailed order status timeline and invoice breakdown.
- `GET /api/orders/user/history`: Logged in customer's past orders.
- `POST /api/orders/:id/cancel`: Cancel order (permitted while in `ORDER_PLACED`).
- `GET /api/tickets`: Customer support tickets.
- `POST /api/tickets`: Create support ticket.
- `GET /api/feedback`: Approved customer reviews.
- `POST /api/feedback`: Submit rating & written review for completed order.

### Admin & Operations Endpoints (Protected by `ADMIN` / `OPERATOR` role)
- `GET /api/admin/metrics`: Real-time KPIs (Today's orders, gross sales, net food sales, taxes, AOV, top desserts).
- `GET /api/admin/orders`: Filterable and searchable live order stream.
- `PATCH /api/admin/orders/:id/status`: Enforce strict state transitions with audit history.
- `POST /api/admin/orders/:id/payment`: Record COD cash collection with staff audit log.
- `POST /api/admin/products`: Create new dessert.
- `PUT /api/admin/products/:id`: Edit dessert prices, toppings, and availability.
- `PATCH /api/admin/branch`: Update store settings (delivery fees, hours, pause/resume orders).
- `GET /api/admin/tickets`: Staff inbox for customer inquiries with direct replies.
- `GET /api/admin/audit-logs`: Chronological log of administrative actions.

---

## Status State Machine

```
ORDER_PLACED ────► ACCEPTED ────► PREPARING
     │                │                │
     ▼                ▼                ├─► (Delivery) READY_FOR_DISPATCH ─► OUT_FOR_DELIVERY ─► DELIVERED
CANCELLED         CANCELLED            │
     ▲                                 └─► (Takeaway) READY_FOR_PICKUP   ─► PICKED_UP
     │
 REJECTED
```

---

## Status of External Integrations

1. **Working & Tested**:
   - React + TypeScript storefront with responsive layout and shopping cart.
   - Authoritative server pricing and tax calculation (5% restaurant GST).
   - Atomic order creation, idempotency prevention, and snapshotting.
   - Cash on Delivery (COD) workflow with status tracking and staff collection auditing.
   - Live Order Tracking timeline and cancellation rules.
   - Protected Staff & Kitchen Admin Console with live status changes, product CRUD, and metrics.
   - Customer account authentication, order history, re-ordering, support tickets, and reviews.
   - File-backed or PostgreSQL JSONB transactional persistence, selected by `DATABASE_URL`.

2. **Integrations Pending Owner Credentials**:
   - **UPI Payment Gateway**: Abstraction created; in demo mode pending Razorpay/PhonePe/Cashfree merchant onboarding.
   - **Mandadam Branch Details**: Address, phone, and delivery service polygon flagged as provisional until confirmed by business owner.

# ShoeStore — Full Retail Platform

Unified software for a physical shoe store **and** its online shop.
One backend talks to three independent frontends, each serving a different user:

| URL (behind the gateway)      | Frontend        | Audience                  | Purpose                                                                 |
| ----------------------------- | --------------- | ------------------------- | ----------------------------------------------------------------------- |
| `http://localhost:3000/admin` | `admin-web/`    | Store owner / manager     | Dashboard, product CRUD, inventory, discounts, online + staff sales.    |
| `http://localhost:3000/app`   | `staff-pwa/`    | In-store employees        | Phone PWA that scans shoe QR codes to sell, receive, or return stock.   |
| `http://localhost:3000/store` | `storefront-web/`| Customers on the internet| E-commerce site. Browses products, checks out with Stripe.              |

Hitting the bare root `/` redirects to `/admin/`.

---

## 🏛️ Architecture

```
                          ┌─────────────────────────┐
                          │     reverse-proxy       │   (nginx, exposes :3000)
                          │  routes /api /admin     │
                          │        /app /store      │
                          └──┬──────┬───────┬───────┘
                             │      │       │
     ┌───────────────────────┘      │       └────────────────────────────┐
     │                              │                                     │
     ▼                              ▼                                     ▼
┌─────────┐                  ┌───────────┐                       ┌───────────────┐
│admin-web│                  │ staff-pwa │                       │storefront-web │
│ React   │                  │ React PWA │                       │ React + Stripe│
└────┬────┘                  └─────┬─────┘                       └───────┬───────┘
     │  /api/*                     │  /api/*                             │  /api/storefront/*
     └──────────────────┬──────────┴─────────────────────────────────────┘
                        ▼
                  ┌───────────┐        ┌──────────┐
                  │  backend  │◄──────►│ Postgres │
                  │ Spring 3  │  JPA   │   15     │
                  └─────┬─────┘        └──────────┘
                        │  HTTPS
                        ▼
                   ┌────────┐
                   │ Stripe │ (PaymentIntents + webhook)
                   └────────┘
```

### Module layout

```
shoestore/
├── backend/               Spring Boot API (shared by every frontend)
├── admin-web/             React admin panel — served at /admin
├── staff-pwa/             React PWA for employees (QR scan) — served at /app
├── storefront-web/        React customer e-commerce — served at /store
├── reverse-proxy/         nginx gateway that fans out /admin /app /store /api
├── docker-compose.yml     orchestrates all of the above
└── .env.example           copy → .env and fill in JWT / Stripe secrets
```

All three frontends talk to the **same** backend at `/api/*`. The `/api/storefront/**`
surface is public (no JWT); everything else enforces JWT roles (`ADMIN`, `STAFF`).

---

## 🚀 Quick start (one command)

```bash
cp .env.example .env   # paste your Stripe test keys
docker compose up --build
```

Open:

- **`http://localhost:3000/admin`** — owner panel  (default login `admin` / `admin123`)
- **`http://localhost:3000/app`**   — staff PWA     (default login `staff` / `admin123`)
- **`http://localhost:3000/store`** — customer shop (no login required)

---

## 💳 Stripe payments

The storefront checkout uses Stripe's PaymentIntents + Stripe Elements. Flow:

1. Customer fills the cart + address form → `POST /api/storefront/checkout/create-payment-intent`.
2. Backend validates stock, **reserves** it (stock decrement + audit row), creates a
   Stripe PaymentIntent, returns `client_secret` to the browser.
3. Stripe Elements collects the card and confirms the PaymentIntent.
4. On success, the browser calls `POST /api/storefront/checkout/confirm` and Stripe
   also fires `payment_intent.succeeded` to `POST /api/storefront/checkout/webhook`.
   Both flip the order to `PAID` idempotently.
5. On failure/cancellation the order goes to `CANCELLED` and the stock is **restored**.

Test card: **`4242 4242 4242 4242`**, any future expiry, any CVC, any ZIP.

### Configuring Stripe locally

Put this in `.env`:

```dotenv
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_CURRENCY=try
# optional — only needed if you run `stripe listen`:
STRIPE_WEBHOOK_SECRET=whsec_...
```

To forward webhooks to your local backend (optional):

```bash
stripe listen --forward-to localhost:3000/api/storefront/checkout/webhook
```

Copy the `whsec_...` Stripe prints into `STRIPE_WEBHOOK_SECRET` and restart the backend.

---

## 🔐 Auth & roles

JWT-based. Two roles:

- **ADMIN** — full access to `/admin/*` and every management API.
- **STAFF** — access to `/app/*`, can scan QR, sell, return, receive stock, generate QR
  for new products.

The storefront is public — customers don't sign in.

---

## 🧩 Backend API summary

| Path                                              | Who         | Notes                                   |
| ------------------------------------------------- | ----------- | --------------------------------------- |
| `POST /api/auth/login`                            | public      | Returns JWT + role                      |
| `GET /api/products`                               | STAFF+ADMIN | List all products                       |
| `POST /api/products`                              | STAFF+ADMIN | Create product + initial stock          |
| `PUT /api/products/{id}`                          | ADMIN       | Edit meta                               |
| `DELETE /api/products/{id}`                       | ADMIN       |                                         |
| `POST /api/products/qr/{uuid}/sell`               | STAFF+ADMIN | In-store sale via QR                    |
| `POST /api/products/qr/{uuid}/return`             | STAFF+ADMIN | In-store return                         |
| `POST /api/products/{id}/sizes/{size}/receive`    | STAFF+ADMIN | Warehouse inbound                       |
| `GET /api/admin/orders`                           | ADMIN       | Online orders list                      |
| `PUT /api/admin/orders/{id}/status`               | ADMIN       | PENDING → PAID → FULFILLED / CANCELLED  |
| `GET /api/admin/discounts`                        | ADMIN       |                                         |
| `GET /api/analytics/sales`                        | ADMIN       | 30-day stats for dashboard              |
| `GET /api/storefront/products`                    | public      | Customer-facing catalog                 |
| `POST /api/storefront/checkout/create-payment-intent` | public | Start checkout, reserves stock          |
| `POST /api/storefront/checkout/confirm`           | public      | Idempotent payment confirmation         |
| `POST /api/storefront/checkout/webhook`           | Stripe      | Idempotent payment confirmation         |

---

## 🧪 Running tests

```bash
cd backend
./mvnw test
```

---

## 🛠️ Developing each module on its own

| Module           | Dev command                          | Port |
| ---------------- | ------------------------------------ | ---- |
| `backend`        | `./mvnw spring-boot:run`             | 8080 |
| `admin-web`      | `npm --prefix admin-web run dev`     | 5174 |
| `staff-pwa`      | `npm --prefix staff-pwa run dev`     | 5173 |
| `storefront-web` | `npm --prefix storefront-web run dev`| 5175 |

Each Vite dev server proxies `/api/*` to `localhost:8080`, so you can run modules
individually without Docker.

---

## 🗄️ Database

- PostgreSQL 15, migrations under `backend/src/main/resources/db/migration/`.
- All schema changes go through new Flyway migrations (`V<N>__...sql`). The
  latest migration (`V12`) adds Stripe + shipping fields to `customer_orders`.

---

## 📦 Default seed data

The backend seeds two accounts on first boot:

| Username | Password   | Role  |
| -------- | ---------- | ----- |
| `admin`  | `admin123` | ADMIN |
| `staff`  | `admin123` | STAFF |

Change these before deploying anywhere real.

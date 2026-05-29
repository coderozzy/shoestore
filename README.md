# ShoeStore — Full Retail Platform

Unified software for a physical shoe store **and** its online shop.
One Spring Boot backend serves three independent React frontends, each
aimed at a different user:

| URL (behind the gateway)      | Frontend          | Audience                  | Purpose                                                                 |
| ----------------------------- | ----------------- | ------------------------- | ----------------------------------------------------------------------- |
| `http://localhost:3000/admin` | `admin-web/`      | Store owner / manager     | Dashboard, product CRUD, inventory, discounts, staff & online orders.    |
| `http://localhost:3000/app`   | `staff-pwa/`      | In-store employees        | Phone PWA that scans shoe QR codes to sell, receive, or return stock.   |
| `http://localhost:3000/store` | `storefront-web/` | Customers on the internet | E-commerce site. Browses products, checks out with Stripe.              |

Hitting the bare root `/` redirects to `/store/`.

---

## 🏛️ Architecture

```
                          ┌─────────────────────────┐
                          │     reverse-proxy       │   (nginx, exposes :3000)
                          │  routes /api /admin     │   rate limits, CSP, HSTS-ready
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
                  └─┬───────┬─┘        └──────────┘
                    │       │
                    │HTTPS  │SMTP (STARTTLS)
                    ▼       ▼
              ┌────────┐  ┌──────────────────┐
              │ Stripe │  │  SMTP relay      │
              │ Pay    │  │  (Brevo / Gmail  │
              │ +hook  │  │   / Mailtrap …)  │
              └────────┘  └──────────────────┘
                    │
                    │HTTPS
                    ▼
              ┌────────────────────────┐
              │ Google Gemini 2.5      │
              │ Flash Image (admin AI) │
              └────────────────────────┘
```

### Module layout

```
shoestore/
├── backend/               Spring Boot API (shared by every frontend)
├── admin-web/             React admin panel — served at /admin
├── staff-pwa/             React PWA for employees (QR scan) — served at /app
├── storefront-web/        React customer e-commerce — served at /store
├── reverse-proxy/         nginx gateway: fans out /admin /app /store /api
├── docker-compose.yml     orchestrates everything above
└── .env.example           copy → .env and fill in JWT / Stripe / SMTP / AI keys
```

All three frontends talk to the **same** backend at `/api/*`.
`/api/storefront/**` is public (no JWT); everything else enforces JWT roles
(`ADMIN`, `STAFF`).

---

## 🚀 Quick start (one command)

```bash
cp .env.example .env       # set JWT_SECRET, Stripe keys, optional SMTP + AI keys
docker compose up --build
```

Then open:

- **`http://localhost:3000/store`** — customer shop (no login required)
- **`http://localhost:3000/admin`** — owner panel  (bootstrap login `admin` / `BOOTSTRAP_ADMIN_PASSWORD`)
- **`http://localhost:3000/app`**   — staff PWA     (create a STAFF user in the admin panel first)

`JWT_SECRET` and `BOOTSTRAP_ADMIN_PASSWORD` have **no defaults** — the
backend refuses to boot until they are set. Generate the JWT secret with
`openssl rand -base64 48`.

---

## 💳 Stripe payments

The storefront checkout uses Stripe's PaymentIntents + Stripe Elements.

```
Customer cart  ──►  /api/storefront/checkout/create-payment-intent
                    ├── pessimistic-locks every (product, size) row
                    ├── decrements stock + writes a stock_movements row
                    ├── creates the Stripe PaymentIntent
                    └── returns { clientSecret, orderId, orderNumber,
                                  lookupToken (HMAC) }
              ──►  Stripe Elements collects the card client-side
                    └── confirmPayment() → PaymentIntent.status = succeeded
              ──►  Browser:  POST /api/storefront/checkout/confirm
                  Stripe:   POST /api/storefront/checkout/webhook  (HMAC-signed)
                    └── both converge in OrderService.applyPaymentIntentState
                        and flip PENDING → PAID exactly once (idempotent)
              ──►  OrderEmailService sends an async confirmation email with
                   the public STP-XXXXXXXX order number and a Track Order link
```

Failure path: `payment_failed` / `canceled` flips PENDING → CANCELLED and
**restores** the reserved stock in a compensating transaction. The
state machine forbids a CANCELLED → PAID transition.

Test card: **`4242 4242 4242 4242`**, any future expiry, any CVC, any ZIP.

### Configuring Stripe locally

```dotenv
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_CURRENCY=try                  # ISO-4217: try / usd / eur / …
STRIPE_WEBHOOK_SECRET=whsec_...      # required for HMAC webhook verification
```

To forward webhooks to your local backend during development:

```bash
stripe listen --forward-to localhost:3000/api/storefront/checkout/webhook
```

Paste the `whsec_...` value Stripe prints into `STRIPE_WEBHOOK_SECRET` and
restart the backend container.

---

## 🔐 Auth, roles & session model

JWT-based, **stateless**, **HttpOnly cookie**:

- On `POST /api/auth/login` the backend signs a HS256 JWT and writes it to
  the `SHOE_AUTH` cookie (`HttpOnly`, `SameSite=Strict`, `Secure` in
  production). Browsers never expose the token to JavaScript, so XSS in any
  SPA cannot steal the session.
- Every JWT carries a `tv` (token-version) claim. `users.token_version` is
  bumped on logout, password change, or "disable staff" — every previously
  issued token for that user is rejected on the next request without any
  Redis blocklist or server-side session table.
- `GET /api/auth/me` is the lightweight session probe used by each SPA on
  mount; if the cookie is missing/expired the SPA bounces to its login page.

Two roles:

- **ADMIN** — full access to `/admin/*` and every management API.
- **STAFF** — access to `/app/*`, can scan QR, sell, return, receive stock,
  generate QR for new products.

The storefront is **public** — customers don't sign in. Anonymous order
lookup is gated by a separate HMAC-signed token (`OrderLookupTokenService`)
bound to `(orderId, paymentIntentId, expMillis)` so a guessed numeric
order id alone never grants access.

Rate limits are enforced at the nginx layer:

| Zone         | Limit         | Applies to                                |
| ------------ | ------------- | ----------------------------------------- |
| `login_zone`    | 5 req / min / IP   | `POST /api/auth/login` (credential stuffing) |
| `checkout_zone` | 10 req / min / IP  | `/api/storefront/checkout/*`                 |
| `api_zone`      | 60 req / sec / IP  | every other `/api/*` route                   |

The gateway also sets a strict CSP, `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, and a `Permissions-Policy` that allows
`camera` only on the same origin (needed by the Staff PWA scanner).

---

## 🧩 Backend API summary

### Public (no JWT)

| Path                                                  | Notes                                                   |
| ----------------------------------------------------- | ------------------------------------------------------- |
| `POST /api/auth/login`                                | Sets the `SHOE_AUTH` HttpOnly cookie + returns role     |
| `GET /api/storefront/products`                        | Customer-facing catalog                                 |
| `GET /api/storefront/categories`                      | Category list for the storefront                        |
| `POST /api/storefront/checkout/create-payment-intent` | Reserves stock + creates Stripe PaymentIntent           |
| `POST /api/storefront/checkout/confirm`               | Idempotent payment confirmation (browser round-trip)    |
| `POST /api/storefront/checkout/webhook`               | Idempotent payment confirmation (Stripe webhook, HMAC)  |
| `GET /api/storefront/orders/{orderId}`                | Anonymous order lookup (requires `token=` HMAC)         |
| `GET /api/storefront/orders/by-number/{orderNumber}`  | Same, by public STP-XXXXXXXX number                     |

### Authenticated (STAFF or ADMIN)

| Path                                                  | Role         | Notes                                                |
| ----------------------------------------------------- | ------------ | ---------------------------------------------------- |
| `POST /api/auth/logout`                               | any          | Bumps `token_version`, clears the cookie             |
| `GET  /api/auth/me`                                   | any          | Session probe                                        |
| `GET  /api/products`                                  | STAFF, ADMIN | Full product list                                    |
| `POST /api/products`                                  | STAFF, ADMIN | Create product (server-side QR UUID, then sizes)     |
| `PUT  /api/products/{id}`                             | ADMIN        | Edit meta                                            |
| `DELETE /api/products/{id}`                           | ADMIN        |                                                      |
| `GET  /api/products/qr/{uuid}`                        | STAFF, ADMIN | Resolve QR to product (writes a `ScanHistory` row)   |
| `POST /api/products/qr/{uuid}/sell`                   | STAFF, ADMIN | In-store sale                                        |
| `POST /api/products/qr/{uuid}/return`                 | STAFF, ADMIN | In-store return                                      |
| `POST /api/products/{id}/sizes`                       | STAFF, ADMIN | Add a new size + initial stock                       |
| `PUT  /api/products/{id}/sizes/{size}`                | STAFF, ADMIN | Update absolute stock for a size                     |
| `POST /api/products/{id}/sizes/{size}/receive`        | STAFF, ADMIN | Warehouse inbound                                    |
| `POST /api/products/{id}/sizes/{size}/return`         | STAFF, ADMIN | Inbound from a customer                              |
| `GET  /api/products/low-stock`                        | ADMIN        | Threshold-based low-stock list                       |
| `GET  /api/products/{id}/qr-image`                    | STAFF, ADMIN | PNG QR rendered server-side (ZXing), JWT-only        |
| `GET  /api/categories`                                | STAFF, ADMIN | Category list                                        |

### Admin only

| Path                                              | Notes                                                       |
| ------------------------------------------------- | ----------------------------------------------------------- |
| `GET  /api/admin/orders`                          | Online orders list                                          |
| `PUT  /api/admin/orders/{orderId}/status`         | PENDING → PAID → FULFILLED / CANCELLED (restricted transitions) |
| `GET  /api/admin/categories`                      | Category management                                         |
| `POST /api/admin/categories`                      | Create category                                             |
| `DELETE /api/admin/categories/{id}`               |                                                             |
| `GET  /api/admin/discounts`                       | Active / scheduled discounts                                |
| `POST /api/admin/discounts`                       | Create discount                                             |
| `PUT  /api/admin/discounts/{id}/toggle`           | Enable / disable                                            |
| `GET  /api/admin/staff`                           | List staff users                                            |
| `POST /api/admin/staff`                           | Create staff (BCrypt cost 12)                               |
| `PUT  /api/admin/staff/{id}/toggle`               | Disable a staff member (bumps their `token_version`)        |
| `GET  /api/admin/staff-sales`                     | Per-staff daily summary (uses `staff_sales_daily_summary`)  |
| `POST /api/admin/products/generate-image`         | AI image generation (Google Gemini 2.5 Flash Image)         |
| `GET  /api/analytics/sales`                       | Sales stats over a date range                               |
| `GET  /api/analytics/daily-report`                | DAY / MONTH / YEAR revenue + units, for the dashboard chart |
| `GET  /api/stock-movements/recent`                | Most recent rows from the immutable audit table             |

---

## 🤖 AI product photography

`/api/admin/products/generate-image` posts the uploaded shoe + an optional
background to **Google Gemini 2.5 Flash Image** with a curated prompt pool
(per-city landmarks, time-of-day, focus area, model framing). The service
returns three different stylings per click so the owner can pick the best
shot and promote it to the storefront image.

Required `.env`:

```dotenv
AI_IMAGE_API_KEY=...                  # Google AI Studio key
AI_IMAGE_MODEL=gemini-2.5-flash-image
AI_IMAGE_MAX_BYTES=10000000           # uploaded image size cap (server-side validated)
```

If `AI_IMAGE_API_KEY` is blank the endpoint returns 400 and the admin panel
hides the AI section — useful for demos without an API key.

---

## 📧 Order-confirmation email (SMTP)

`OrderEmailService` runs `@Async` so SMTP latency never blocks the
storefront's confirm-payment HTTP response. When `SPRING_MAIL_HOST` is
blank the service self-disables (boots cleanly, logs each would-have-sent
email at INFO) — local devs can run the entire stack without an SMTP
relay.

Any STARTTLS-capable SMTP provider works. Tested with:

```dotenv
# Brevo (formerly Sendinblue) — current production relay
SPRING_MAIL_HOST=smtp-relay.brevo.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=<brevo-smtp-login>
SPRING_MAIL_PASSWORD=<brevo-smtp-key>
SPRING_MAIL_SMTP_AUTH=true
SPRING_MAIL_STARTTLS=true
APP_MAIL_FROM=Steps Store <noreply@yourdomain.com>
APP_PUBLIC_BASE_URL=https://your-public-host

# Other options:
#   Gmail       — smtp.gmail.com:587 with an App Password
#   Mailtrap    — sandbox.smtp.mailtrap.io:2525 (free dev inbox)
```

The email contains the public order number (`STP-XXXXXXXX`, opaque
8-char Crockford base32 code) and an HMAC-signed Track Order link so the
customer can return to their order without an account.

---

## 🗄️ Database

PostgreSQL 15, all schema changes go through versioned Flyway migrations
under `backend/src/main/resources/db/migration/`. Highlights:

| Migration | What it adds                                                       |
| --------- | ------------------------------------------------------------------ |
| `V1–V5`   | Categories, products, users, scan history, initial seed            |
| `V6`      | **Splits stock per size** into `product_sizes`                     |
| `V7`      | `stock_movements` — immutable audit + analytics source             |
| `V8–V9`   | In-store sales tables + customer orders                            |
| `V10`     | Discount tables (active windows, percent / fixed)                  |
| `V11`     | `staff_sales_daily_summary` (cheap dashboard read path)            |
| `V12`     | Stripe + shipping columns on `customer_orders`, PENDING/PAID/FULFILLED/CANCELLED |
| `V13`     | Fix `shipping_country` column type                                 |
| `V14`     | `image_data_url` on products                                       |
| `V15`     | Storefront publish toggle on products                              |
| `V16`     | `product_images` table (gallery)                                   |
| `V17`     | **`users.token_version`** — instant JWT revocation                 |
| `V18`     | `audit_log` for admin actions (M-9)                                |
| `V19`     | Seed shoe-style categories                                         |
| `V20`     | Public `customer_orders.order_number` (`STP-XXXXXXXX`)             |

Stock concurrency is enforced at the row level: every mutation goes
through `ProductSizeRepository.findByProductIdAndSizeForUpdate(...)`, a
pessimistic write-locked query.

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

Each Vite dev server proxies `/api/*` to `localhost:8080`, so individual
modules can be run without Docker.

---

## 📦 Bootstrap & default users

The backend seeds **one** admin account on the first boot of an empty
`users` table:

| Username                       | Password                       | Role  |
| ------------------------------ | ------------------------------ | ----- |
| `BOOTSTRAP_ADMIN_USERNAME`     | `BOOTSTRAP_ADMIN_PASSWORD`     | ADMIN |

Both are read from `.env`; `BOOTSTRAP_ADMIN_PASSWORD` has no default —
the backend will not start until you set it. Set
`BOOTSTRAP_USERS_ENABLED=false` after first boot to ensure the seed
cannot run again.

Staff users are created from the admin panel (`/admin/staff`); their
passwords are stored as BCrypt cost-12 hashes.

---

## 🔒 Security checklist before deploying

- [ ] `JWT_SECRET`, `ORDER_TOKEN_SECRET`, `BOOTSTRAP_ADMIN_PASSWORD` and
      `POSTGRES_PASSWORD` are all set, unique, and at least 256 bits of
      entropy where required.
- [ ] `AUTH_COOKIE_SECURE=true` and the deployment terminates TLS (set
      HSTS at the proxy once HTTPS is enforced end-to-end).
- [ ] `STRIPE_WEBHOOK_SECRET` is configured — without it, the backend
      refuses to mark orders PAID via the webhook.
- [ ] `CORS_ALLOWED_ORIGINS` lists only the real public origins.
- [ ] `BOOTSTRAP_USERS_ENABLED=false` after first boot.
- [ ] Logs are scraped to your own log sink — `app_log_level` defaults to
      INFO; nothing leaks tokens or PANs by design.

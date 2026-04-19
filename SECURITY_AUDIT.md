# Shoestore — Security Audit Report

**Audit date:** 2026-04-17
**Scope:** Spring Boot backend, three React frontends (`admin-web`, `staff-pwa`, `storefront-web`), nginx reverse proxy, Docker orchestration, root `.env` / `.env.example`.
**Reviewer:** Automated source review — findings should be verified before remediation.

---

## Executive summary

The application has **multiple critical issues that combine into full admin takeover without any authentication**. The most urgent problems cluster around:

1. A hardcoded JWT signing secret shipped in `.env`, `.env.example`, `docker-compose.yml`, and `application.yml`. Anyone with repo access can forge `ADMIN` tokens.
2. Seed migration (V5) creates `admin/admin123` and `staff/admin123` on every fresh deploy.
3. Real-looking Stripe test keys and a Google/Gemini API key live in the working-tree `.env`.
4. Public storefront endpoints leak PII and allow order/PaymentIntent enumeration and stock desync.
5. Stored XSS path via AI-generated image data URLs + unescaped `document.write` in QR print flows.
6. JWTs are kept in `localStorage` across same-origin admin/staff/storefront frontends — any XSS in any of the three = full token theft.

Combined, the easiest exploit chain is: clone the repo → base64-decode the default `JWT_SECRET` → sign a JWT with `sub=admin` → send it as a `Bearer` header → full ADMIN access. **No brute force, no phishing.**

Below is the full inventory grouped by severity.

---

## Critical

### C-1. Hardcoded JWT signing secret committed in four places

**Files**

- `.env:1`
- `.env.example:5`
- `docker-compose.yml:28` (`JWT_SECRET:-mySecretKey...`)
- `backend/src/main/resources/application.yml:30` (default `9a4f2c8d3b7e1g5h9j2k4l6m8n0p2q4r6t8w0y2z4x6v8u0s2q4o6m8k0i`)

**Problem.** If `JWT_SECRET` env var is unset at runtime, the container falls back to a publicly-visible string. The value in `.env` base64-decodes fine, so a default deployment actually uses `mySecretKeyForJWTTokenGenerationThatIsAtLeast256BitsLongForHS256Algorithm` as the HMAC key for every signed token.

**Exploit.** An attacker who has read the repo builds a token:
```
jwt.sign({sub:"admin", iat:..., exp:...}, HMAC256(base64_decode("mySecretKey...")))
```
and sends `Authorization: Bearer <token>`. `JwtAuthenticationFilter` calls `loadUserByUsername("admin")` — the seeded admin exists — and the request runs as ADMIN.

**Fix.** Remove every default:
- `application.yml`: `jwt.secret: ${JWT_SECRET}` (no default — fail fast).
- `docker-compose.yml`: `JWT_SECRET: ${JWT_SECRET:?JWT_SECRET required}`.
- `.env.example`: `JWT_SECRET=CHANGE_ME_openssl_rand_base64_48`.
- Rotate the secret; treat the current value as compromised.
- Validate key length ≥ 256 bits at startup.

---

### C-2. Seed migration installs default `admin/admin123` + `staff/admin123` on every deploy

**File:** `backend/src/main/resources/db/migration/V5__seed_initial_data.sql:3-5`

Flyway runs V5 on every fresh database with `baseline-on-migrate=true`. Every new environment — including production — starts with the same two accounts, password `admin123`, documented in `README.md`.

**Exploit.** `POST /api/auth/login {"username":"admin","password":"admin123"}` → ADMIN JWT.

**Fix.** Delete V5 or replace it with a bootstrap step that reads `ADMIN_INITIAL_PASSWORD` from env and forces change-on-first-login. Document one-off CLI creation instead.

---

### C-3. Real-looking Stripe + Gemini API keys in `.env`

**File:** `.env:3-7`

The working-tree file contains:
- `STRIPE_PUBLISHABLE_KEY=pk_test_51PPQao…`
- `STRIPE_SECRET_KEY=sk_test_51PPQao…`
- `AI_IMAGE_API_KEY=AIzaSyCGVqtNyZTldQk6bM2anVVf8PH2Shgz6B0`

`.env` is correctly in `.gitignore` and is NOT in git history (verified). But it lives on disk, and `.dockerignore` does NOT exclude it — the admin-web image is built with `context: .` so the root `.env` is copied into the build context and may leak via Docker build logs, image layers, or a malicious post-install script.

Also, while the Stripe keys are test-mode, they still control the Stripe test project (refunds, PI enumeration, etc.); the Gemini key is real Google Cloud credential with billing impact.

**Fix.**
- Rotate all three keys immediately.
- Add `.env` and `.env.*` (keep `.env.example`) to `.dockerignore`.
- Restrict the Gemini key by referrer/IP and by API in Google Cloud Console.
- Move secrets to a secrets manager (Vault / AWS SM / Doppler).

---

### C-4. Storefront order endpoints leak PII + allow payment-flow abuse (IDOR)

**Files**

- `backend/src/main/java/com/shoestore/controller/StorefrontController.java:48-64`
- `backend/src/main/java/com/shoestore/service/OrderService.java:148-156, 192-198, 227-230, 243-274`

`GET /api/storefront/orders/{orderId}` is public and returns `customerName`, `customerEmail`, `customerPhone`, full shipping address, `stripePaymentIntentId`, line items. IDs are auto-increment longs.

`POST /api/storefront/checkout/confirm` accepts any `paymentIntentId` with no ownership or token binding.

**Exploit 1 — PII harvest.** `for id in {1..10000}; do curl .../api/storefront/orders/$id; done` dumps every customer's PII.

**Exploit 2 — stock desync.** Read the `stripePaymentIntentId` from `/orders/{id}`. If the PI is later cancelled on Stripe, calling `/confirm` first restocks the items via `restoreStock` — if the store has already shipped, stock is silently over-counted.

**Fix.** Issue a single-use signed order-lookup token (HMAC over `orderId+paymentIntentId+serverSecret`) at `create-payment-intent` response. Require the token on `/orders/{id}` and `/confirm`. Strip PII from the storefront DTO (return only status + items).

---

### C-5. Stored XSS via AI image generation → served to every storefront visitor

**Files**

- `backend/src/main/java/com/shoestore/controller/AdminProductAiController.java:23-27`
- `backend/src/main/java/com/shoestore/service/ProductImageGenerationService.java:268-373`
- `backend/src/main/java/com/shoestore/dto/ImageDataRequest.java`
- `backend/src/main/java/com/shoestore/entity/Product.java:44-52`
- `backend/src/main/java/com/shoestore/service/StorefrontService.java:33-65`

`ImageDataRequest.base64` has no `@Size` cap and no MIME whitelist. Gemini output (`data:image/*;base64,...`) is saved verbatim to `Product.imageDataUrl` (a `TEXT` column) and served to every storefront visitor. An attacker with ADMIN access (easy given C-1/C-2) — or a prompt-injected Gemini response — can plant `data:image/svg+xml;base64,<svg onload=…>`. The browser renders SVG as executable markup.

**Fix.**
- Whitelist MIME: `{image/png, image/jpeg, image/webp}`. Reject `image/svg+xml`.
- Verify decoded bytes against magic numbers (PNG `89 50 4E 47`, JPEG `FF D8 FF`, WEBP `52 49 46 46 … 57 45 42 50`).
- `@Size(max=10_000_000)` on base64.
- Serve images via a dedicated endpoint that sets `Content-Type` and a strict CSP; stop inlining data URLs.
- Move image storage out of a TEXT column into object storage.

---

### C-6. `document.write` of product fields in QR print flows — stored XSS into admin/staff origin

**Files**

- `admin-web/src/pages/ProductsPage.jsx:225-228`
- `staff-pwa/src/pages/ProductsPage.jsx:159-170`
- `staff-pwa/src/pages/GenerateQRPage.jsx:113-124`

Template strings inject `modelName`, `color`, and other user-entered fields straight into `document.write(...)` with zero escaping. Combined with C-5 (attacker can create products) and C-7 (JWT in `localStorage` + same origin for all three SPAs), a malicious product name steals the admin token the next time an admin prints a QR.

**Fix.** Stop using `document.write`. Build the DOM with `document.createElement` and `textContent`. Or render a dedicated print component inside the SPA using `@media print` CSS + `window.print()`.

---

### C-7. JWT stored in `localStorage` on both privileged frontends

**Files**

- `admin-web/src/services/authService.js:7-8`
- `admin-web/src/services/api.js:11`
- `staff-pwa/src/services/authService.js:8-9`
- `staff-pwa/src/services/api.js:15`

All three frontends are served from the **same origin** (`http://localhost:3000`, different path prefixes behind nginx). `localStorage` is origin-scoped, not path-scoped. Any XSS in `/store/`, `/app/`, or `/admin/` reads every SPA's token with `localStorage.getItem('token')`.

**Fix.** Migrate to `HttpOnly; Secure; SameSite=Strict` cookies scoped to `/api/`, rotated on login, with a CSRF double-submit token for state-changing endpoints. In parallel, deploy a strict CSP (see M-1) to shrink the XSS surface immediately.

---

## High

### H-1. JWT sent as URL query parameter for staff QR-image fetch

**File:** `staff-pwa/src/services/productService.js:99-101` — `return \`${api.defaults.baseURL}/products/${id}/qr-image?token=${token}\``

URLs leak into browser history, `Referer` headers, nginx access logs, and any upstream CDN. Token ends up everywhere.

**Fix.** Fetch as blob with `Authorization: Bearer`, then `URL.createObjectURL(blob)` for the `<img>`.

---

### H-2. Postgres exposed on host port 5433 with `postgres/postgres`

**File:** `docker-compose.yml:5-10`

`ports: - "5433:5432"` binds to `0.0.0.0`. Default credentials let anyone on the LAN dump the DB.

**Fix.** Remove the `ports:` stanza on `db` (or bind to `127.0.0.1:5433:5432`). Require non-default env-sourced credentials.

---

### H-3. Account `enabled=false` is not rechecked on JWT requests

**File:** `backend/src/main/java/com/shoestore/security/JwtAuthenticationFilter.java:35-47`

`StaffController.toggleStaff` sets `enabled=false`, but the filter builds a `UsernamePasswordAuthenticationToken` directly and never inspects `userDetails.isEnabled()`. A disabled staff member's JWT stays valid for the token's remaining lifetime (24 h).

**Fix.** After `loadUserByUsername`, reject if `!userDetails.isEnabled() || !userDetails.isAccountNonLocked()`.

---

### H-4. Stock reservation DoS — public checkout with no rate limit

**File:** `backend/src/main/java/com/shoestore/service/OrderService.java:55-144`

`initiateCheckout` decrements stock *before* payment. Public, unauthenticated, no CAPTCHA, no rate limiting. An attacker scripts hundreds of checkouts claiming the last pair of every size, leaving orders in `PENDING` forever (the webhook is not always configured — see C-4 context).

**Fix.** Sweeper job that cancels PENDING orders older than N minutes and restores stock. Bucket4j/Resilience4j rate limit per IP on `/checkout/create-payment-intent`.

---

### H-5. No rate limiting on `/api/auth/login` (or anywhere)

**Files**

- `backend/pom.xml` (no Bucket4j)
- `reverse-proxy/nginx.conf:8-15` (no `limit_req`)
- `backend/src/main/java/com/shoestore/controller/AuthController.java:18-22`

Credential-stuffing against known `admin`/`staff` usernames is wide open.

**Fix.** nginx `limit_req_zone` at http{} level; per-IP burst limit on `/api/auth/login`. Backend lockout after N failures per (IP, username).

---

### H-6. `PUT /api/products/**` rule shadows the STAFF size-update rule

**File:** `backend/src/main/java/com/shoestore/config/SecurityConfig.java:54, 68`

Spring Security matches rules in declaration order. Line 54 (`PUT /api/products/** → ADMIN`) runs before line 68 (`PUT /api/products/*/sizes/* → STAFF/ADMIN`). The staff-specific rule is **unreachable** — staff can't update size stock via PUT.

**Fix.** Reorder: specific matchers first. Re-test every role × endpoint matrix.

---

### H-7. `updateStatus` allows arbitrary order state transitions (CANCELLED → PAID with no re-decrement)

**Files**

- `backend/src/main/java/com/shoestore/controller/AdminOrderController.java:26-29`
- `backend/src/main/java/com/shoestore/service/OrderService.java:232-241`

Forward transitions don't re-reserve stock. An admin flipping CANCELLED → PAID triggers `restoreStock` on the way down but no decrement on the way up — inventory desync.

**Fix.** Enforce a state machine: forbid backward-then-forward, or re-decrement on re-open. Log every status change with actor.

---

### H-8. JWT payload is minimal — no `iss`, `aud`, `jti`, no revocation, 24-hour lifetime

**File:** `backend/src/main/java/com/shoestore/security/JwtTokenProvider.java:35-45`

Stolen tokens are valid for a full day. Logout is client-only. No replay protection across services.

**Fix.** Add `iss`/`aud` and verify them. Add `jti` + a revocation list (Redis). Reduce access-token TTL to 15 minutes and introduce refresh tokens.

---

### H-9. No TLS anywhere — admin JWTs + Stripe `clientSecret` over plaintext

**Files:** `reverse-proxy/nginx.conf:2` (`listen 80`), `docker-compose.yml:74-75`

Acceptable for dev but risks being shipped to prod as-is.

**Fix.** Terminate TLS at a front proxy (Caddy/Traefik/ALB). Add HSTS after HTTPS is enforced. Document the dev-vs-prod boundary.

---

## Medium

### M-1. Missing security headers across all nginx vhosts

**Files:** `reverse-proxy/nginx.conf`, `admin-web/nginx.conf`, `staff-pwa/nginx.conf`, `storefront-web/nginx.conf`

Missing: `X-Frame-Options DENY`, `X-Content-Type-Options nosniff`, `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy`, `server_tokens off`.

**Drop-in fix** (top of `reverse-proxy/nginx.conf` server block):

```
server_tokens off;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(self), microphone=(), geolocation=()" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://js.stripe.com; frame-src https://js.stripe.com; connect-src 'self' https://api.stripe.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" always;
```

A strict CSP also mitigates C-5 / C-6 until the root fixes land.

---

### M-2. Staff PWA service worker caches authenticated API responses on shared devices

**File:** `staff-pwa/src/sw.js`

`NetworkFirst` cache for `/api/*` GETs keyed on URL only (no `Vary: Authorization`). Staff A's data can be served to staff B on the same device; `NetworkFirst` falls back to cache on 401s.

**Fix.** Clear the cache on logout (`caches.delete('api-cache')`). Exclude auth-sensitive routes from caching. Prefer short TTLs or `CacheFirst` only on genuinely public endpoints.

---

### M-3. Stripe webhook not forwarded with raw body (latent)

**File:** `reverse-proxy/nginx.conf:8-15`

The generic `location /api/` proxies the webhook. If you ever enable `STRIPE_WEBHOOK_SECRET` in prod, re-verify signatures pass with buffering off. Currently `STRIPE_WEBHOOK_SECRET=` is empty so the backend silently returns `200 webhook-disabled` — which means webhook-based confirmation is not active at all.

**Fix.** Dedicated `location = /api/storefront/checkout/webhook { proxy_request_buffering off; proxy_pass http://backend:8080; }`. In non-dev profiles, fail startup when `STRIPE_WEBHOOK_SECRET` is empty.

---

### M-4. Permissive CORS with `allowCredentials=true` + localhost blanket

**Files**

- `backend/src/main/java/com/shoestore/config/SecurityConfig.java:86-103`
- `docker-compose.yml:29`

`setAllowCredentials(true)` + `setAllowedHeaders("*")` + localhost-blanket origins is fine in dev but dangerous if the same compose file ships to prod.

**Fix.** Tight origin list per environment. Whitelist headers (`Authorization`, `Content-Type`, `Stripe-Signature`).

---

### M-5. Containers run as root; backend also exposes 8080 directly on host

**Files:** `admin-web/Dockerfile`, `staff-pwa/Dockerfile`, `storefront-web/Dockerfile`, `backend/Dockerfile`, `docker-compose.yml:22-23`

No `USER` directive drops privilege. Backend's host port binding (8080:8080) bypasses the reverse proxy entirely, including any headers or rate limits added there.

**Fix.**
- Add `USER nginx` / `USER 1000:1000` to each image; switch `listen 80` → `listen 8080` and adjust port mappings.
- Remove `ports: 8080:8080` from the `backend` service — keep it on the internal compose network.

---

### M-6. `npm install` (not `ci`) in `admin-web` and `storefront-web` Dockerfiles

**Files:** `admin-web/Dockerfile:6`, `storefront-web/Dockerfile:11` (staff-pwa uses `npm ci`, good)

`npm install` can drift off the lockfile — supply-chain attackers get a wider window.

**Fix.** `npm ci`. Pin exact versions in `package.json` (drop carets). Run `npm audit --production` in CI.

---

### M-7. Input validation gaps

**Files** (selected):

- `CreateProductRequest.java:35-36` — `imageDataUrl`, `imageDataUrls` have no `@Size` / format validation.
- `CreateStaffRequest.java:19` — minimum password length **4**.
- `CreateDiscountRequest.java:30` — `@DecimalMin("0.01")` without `@DecimalMax`; a FIXED discount of 10¹⁸ is accepted.
- `CheckoutRequest.java` — no `@Size` on `customerName`, `notes`, shipping lines.
- `ScanHistoryController.java:20` — `days` has no upper bound.

**Fix.** Add `@Size`, `@DecimalMax`, `@Min/@Max` throughout; raise password min to 12 + complexity.

---

### M-8. BCrypt strength 10, DEBUG logging shipped, duplicate config files

**Files:** `SecurityConfig.java:120`, `application.yml:52`, `application.properties:1`

`new BCryptPasswordEncoder()` defaults to cost 10; 2026 baseline is ≥ 12. DEBUG logging in both config files is a footgun.

**Fix.** `new BCryptPasswordEncoder(12)`. INFO default, profile-scoped DEBUG.

---

### M-9. Missing rate limits, logging, and audit trails on admin operations

Discount creation (`DiscountService.java:33-68`), order-status changes (`AdminOrderController`), staff enable/disable all lack structured audit logs. Combined with no WHO/WHEN trail, mistakes are hard to spot.

**Fix.** Structured audit table: actor user id, action, target id, old value, new value, timestamp, IP.

---

## Low / Informational

- **L-1.** `RestTemplate` in `ProductImageGenerationService` has no connect/read timeouts → thread-pool exhaustion DoS via slow Gemini responses. Fix with a configured `ClientHttpRequestFactory`.
- **L-2.** No `@Pattern` on `AuthRequest.username` → log-injection via CR/LF in usernames. Add `@Pattern("^[a-zA-Z0-9_.-]{3,50}$")`.
- **L-3.** Cart `unitPrice` stored in `localStorage` by the storefront. Harmless because `create-payment-intent` only sends `productId/size/quantity`; backend recomputes. Good — keep it that way.
- **L-4.** `GET /api/products/{id}/qr-image` is `permitAll` and enumerable (cheap DoS on QR generation). Require auth or sign the URL.
- **L-5.** Caret version ranges (`^`) across all three frontend `package.json` → supply-chain drift. Pin exact versions.
- **L-6.** `backend/backend.log` and `backend_error.log` present — ensure they are `.gitignore`d; they leak local dev paths.
- **L-7.** Spring Boot 3.2.2 (Feb 2024) — upgrade to 3.2.12+ / 3.3.x for CVE-2024-22243 et al.
- **Info.** No `nativeQuery=true` with string concatenation; no unsafe deserialization; no H2/actuator exposure; `UUID.randomUUID()` used for QR codes; `PESSIMISTIC_WRITE` lock used to prevent oversell. These are the good parts.

---

## Priority remediation checklist

1. **Rotate** `JWT_SECRET`, Stripe test keys, Gemini API key today. Purge `.env` defaults from tracked files. (C-1, C-3)
2. **Remove** V5 seed migration; require bootstrap env password. (C-2)
3. **Add ownership token** between `create-payment-intent` → `/confirm` / `/orders/{id}`; strip PII from the storefront order DTO. (C-4)
4. **MIME + magic-byte validate** AI images; reject SVG; cap base64 size. (C-5)
5. **Kill `document.write`** in the three QR print flows. (C-6)
6. **Migrate JWT** to `HttpOnly; Secure; SameSite=Strict` cookies + CSRF; short-term deploy CSP now. (C-7, M-1)
7. **Remove DB host port + default credentials**. (H-2)
8. **Re-check `enabled`** on every JWT request. (H-3)
9. **Rate-limit** `/api/auth/login` and `/checkout/*` at both nginx and backend layers. (H-4, H-5)
10. **Reorder** `SecurityConfig` rules; add state-machine validation on order status. (H-6, H-7)
11. **Shorten JWT TTL**, add `iss`/`aud`/`jti`, revocation list. (H-8)
12. **Add security headers + strict CSP** in nginx. (M-1)
13. **Clear PWA cache on logout**, exclude sensitive endpoints. (M-2)
14. **Non-root containers**, remove backend host port, switch to `npm ci`. (M-5, M-6)

---

## Files most frequently implicated

- `backend/src/main/resources/application.yml`
- `backend/src/main/resources/db/migration/V5__seed_initial_data.sql`
- `backend/src/main/java/com/shoestore/security/JwtAuthenticationFilter.java`
- `backend/src/main/java/com/shoestore/security/JwtTokenProvider.java`
- `backend/src/main/java/com/shoestore/config/SecurityConfig.java`
- `backend/src/main/java/com/shoestore/controller/StorefrontController.java`
- `backend/src/main/java/com/shoestore/service/OrderService.java`
- `backend/src/main/java/com/shoestore/service/ProductImageGenerationService.java`
- `admin-web/src/pages/ProductsPage.jsx`
- `staff-pwa/src/pages/ProductsPage.jsx`, `GenerateQRPage.jsx`, `services/productService.js`, `services/authService.js`, `sw.js`
- `reverse-proxy/nginx.conf`
- `docker-compose.yml`, `.env`, `.env.example`, `.dockerignore`

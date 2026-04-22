-- V20: Add a human-friendly order_number to customer_orders.
--
-- Until now the only order identifier exposed to customers was the numeric
-- BIGSERIAL `id`, which is small, monotonic, and trivially enumerable. We
-- still keep `id` as the primary key (referenced by FKs and tokens), but
-- the *public* identifier — printed in emails, typed into the storefront
-- "Track order" form, and shared in support tickets — is now an opaque
-- 8-character Crockford base32 code prefixed with `STP-`.
--
-- Format reasoning:
--   * Crockford base32 alphabet excludes the visually ambiguous I/L/O/U,
--     so dictation/copy-paste from a printed/email receipt is robust.
--   * 8 random characters give 32^8 ≈ 1.1×10^12 distinct values, plenty
--     of headroom for retail volume + collision-retry on insert.
--   * The `STP-` prefix is purely cosmetic: it lets a customer recognise
--     the string instantly as a Steps order number rather than a generic
--     code, and lets us search logs/grep for one easily.

-- 1. Add the column nullable so the migration can run on an existing
--    database without breaking the NOT NULL constraint mid-flight.
ALTER TABLE customer_orders
    ADD COLUMN order_number VARCHAR(16);

-- 2. Backfill any pre-existing rows with a placeholder built from the
--    primary key. This is intentionally NOT real Crockford output — it's
--    a one-off legacy marker so admins can still tell pre-V20 orders
--    apart in reports. New orders go through OrderNumberService and get
--    proper random codes.
UPDATE customer_orders
   SET order_number = 'STP-LEGACY' || LPAD(id::text, 6, '0')
 WHERE order_number IS NULL;

-- 3. Lock down the column once every row has a value.
ALTER TABLE customer_orders
    ALTER COLUMN order_number SET NOT NULL;

ALTER TABLE customer_orders
    ADD CONSTRAINT uq_customer_orders_order_number UNIQUE (order_number);

-- 4. Lookups by order_number happen on every track-order request and
--    every order-confirmation email click. Index for O(log n) regardless
--    of orders table size; UNIQUE constraint above already implies an
--    index on most engines but we name it explicitly for clarity.
CREATE INDEX idx_customer_orders_order_number ON customer_orders(order_number);

-- Extend customer_orders with shipping address + Stripe payment tracking.
-- Also replace the PENDING/CONFIRMED/FULFILLED/CANCELLED status check with
-- the new PENDING/PAID/FULFILLED/CANCELLED lifecycle.

ALTER TABLE customer_orders
    ADD COLUMN shipping_line1 VARCHAR(200),
    ADD COLUMN shipping_line2 VARCHAR(200),
    ADD COLUMN shipping_city VARCHAR(100),
    ADD COLUMN shipping_postal_code VARCHAR(20),
    ADD COLUMN shipping_country CHAR(2),
    ADD COLUMN stripe_payment_intent_id VARCHAR(64) UNIQUE,
    ADD COLUMN stripe_payment_status VARCHAR(30),
    ADD COLUMN paid_at TIMESTAMP;

-- Migrate any legacy CONFIRMED rows to PAID before re-adding the check constraint.
UPDATE customer_orders SET status = 'PAID' WHERE status = 'CONFIRMED';

ALTER TABLE customer_orders
    DROP CONSTRAINT IF EXISTS customer_orders_status_check;

ALTER TABLE customer_orders
    ADD CONSTRAINT customer_orders_status_check
    CHECK (status IN ('PENDING', 'PAID', 'FULFILLED', 'CANCELLED'));

CREATE INDEX idx_customer_orders_stripe_pi
    ON customer_orders(stripe_payment_intent_id);

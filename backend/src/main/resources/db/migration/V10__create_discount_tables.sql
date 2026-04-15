CREATE TABLE discounts (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('PERCENTAGE', 'FIXED')),
    value DECIMAL(10, 2) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    start_at TIMESTAMP,
    end_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_discounts (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    discount_id BIGINT NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
    CONSTRAINT uk_product_discount UNIQUE (product_id, discount_id)
);

CREATE INDEX idx_discounts_active ON discounts(active);
CREATE INDEX idx_discounts_period ON discounts(start_at, end_at);

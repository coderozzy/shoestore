-- V4: Create scan history table for audit trail
CREATE TABLE scan_history (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL DEFAULT 'SCAN',
    scanned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for analytics queries
CREATE INDEX idx_scan_history_product ON scan_history(product_id);
CREATE INDEX idx_scan_history_user ON scan_history(user_id);
CREATE INDEX idx_scan_history_date ON scan_history(scanned_at);

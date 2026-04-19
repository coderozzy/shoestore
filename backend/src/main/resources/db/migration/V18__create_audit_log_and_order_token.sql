-- M-9: admin action audit trail.
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    actor_username VARCHAR(100),
    actor_role VARCHAR(20),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(100),
    target_id VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    ip VARCHAR(64),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_log_created_at ON audit_log (created_at DESC);
CREATE INDEX idx_audit_log_actor ON audit_log (actor_username);

-- C-4: customer order lookup is now gated by a signed HMAC token handed back
-- at checkout. The token carries orderId+paymentIntentId+expiry, so the
-- backend does not need a side table for verification. No schema change here
-- beyond the audit log; this migration number is reserved so follow-ups keep
-- a stable history.

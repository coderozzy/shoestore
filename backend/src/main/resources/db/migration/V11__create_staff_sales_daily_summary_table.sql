CREATE TABLE staff_sales_daily_summary (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,
    total_quantity INTEGER NOT NULL DEFAULT 0,
    total_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_staff_sales_daily_summary UNIQUE (user_id, summary_date)
);

CREATE INDEX idx_staff_sales_summary_date ON staff_sales_daily_summary(summary_date);

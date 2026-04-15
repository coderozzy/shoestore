-- Fix shipping_country column type: CHAR(2) -> VARCHAR(2)
-- Hibernate 6.4 cannot validate PostgreSQL's bpchar (CHAR) against VARCHAR,
-- causing schema-validation failure on startup.
ALTER TABLE customer_orders
    ALTER COLUMN shipping_country TYPE VARCHAR(2);

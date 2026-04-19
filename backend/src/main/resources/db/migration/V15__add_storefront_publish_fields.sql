ALTER TABLE products
    ADD COLUMN published_to_store BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN store_display_order INTEGER;

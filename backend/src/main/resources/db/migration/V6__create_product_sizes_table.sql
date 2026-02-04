-- V6: Refactor products to separate sizes
-- Step 1: Create product_sizes table
CREATE TABLE product_sizes (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    size DECIMAL(4, 1) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_sizes_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT uk_product_size UNIQUE (product_id, size)
);

-- Create index for fast lookups
CREATE INDEX idx_product_sizes_product_id ON product_sizes(product_id);
CREATE INDEX idx_product_sizes_stock ON product_sizes(stock_quantity);

-- Step 2: Migrate existing data - consolidate products by model+gender+color+price
-- First, insert unique products into a temp structure, then migrate sizes

-- For each unique (model_name, gender, color, price), keep one product and migrate its size to product_sizes
INSERT INTO product_sizes (product_id, size, stock_quantity, created_at, updated_at)
SELECT id, size, stock_quantity, created_at, updated_at FROM products;

-- Step 3: Remove size and stock_quantity from products table
ALTER TABLE products DROP COLUMN size;
ALTER TABLE products DROP COLUMN stock_quantity;

-- V2: Create products table
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('MALE', 'FEMALE')),
    size DECIMAL(4, 1) NOT NULL,
    color VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    qr_code_value UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    category_id BIGINT REFERENCES categories(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on QR code for fast lookups
CREATE INDEX idx_products_qr_code ON products(qr_code_value);

-- Create index on gender for filtering
CREATE INDEX idx_products_gender ON products(gender);

-- Create index on stock for low stock queries
CREATE INDEX idx_products_stock ON products(stock_quantity);

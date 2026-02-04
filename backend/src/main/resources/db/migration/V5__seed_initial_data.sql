-- V5: Seed initial data
-- Password is 'admin123' encoded with BCrypt
INSERT INTO users (username, password, email, role) VALUES 
('admin', '$2a$10$5lFw/NWEHzFuTkcMzG.yce/U2rqGY3BPkLAAPFaOGddS4KJxYp4KG', 'admin@shoestore.com', 'ADMIN'),
('staff', '$2a$10$5lFw/NWEHzFuTkcMzG.yce/U2rqGY3BPkLAAPFaOGddS4KJxYp4KG', 'staff@shoestore.com', 'STAFF');

-- Semple products removed per user request
-- INSERT INTO products (model_name, gender, size, color, price, stock_quantity, category_id) VALUES ...

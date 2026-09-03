CREATE TABLE IF NOT EXISTS categories (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    description   TEXT,
    price         DECIMAL(10,2) NOT NULL,
    stock_qty     INT NOT NULL DEFAULT 0,
    sku           VARCHAR(100) NOT NULL UNIQUE,
    image_url     VARCHAR(500),
    category_id   BIGINT,
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME ON UPDATE CURRENT_TIMESTAMP,
    version       INT NOT NULL DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    INDEX idx_products_category (category_id),
    INDEX idx_products_sku (sku),
    FULLTEXT INDEX idx_products_search (name, description)
);

-- Seed categories
INSERT INTO categories (name, description) VALUES
    ('Electronics', 'Phones, laptops, gadgets'),
    ('Clothing', 'Apparel and fashion'),
    ('Books', 'Physical and digital books'),
    ('Home & Garden', 'Furniture and decor');

-- Seed products
INSERT INTO products (name, description, price, stock_qty, sku, category_id) VALUES
    ('iPhone 15 Pro', 'Apple flagship smartphone 2023', 999.99, 50, 'APPL-IP15P-128', 1),
    ('Samsung Galaxy S24', 'Samsung flagship phone', 849.99, 40, 'SAMS-GS24-256', 1),
    ('MacBook Air M3', '13-inch laptop with M3 chip', 1299.99, 25, 'APPL-MBA-M3-13', 1),
    ('Classic Oxford Shirt', 'Premium cotton shirt', 49.99, 100, 'CLT-OXF-M-BLU', 2),
    ('Clean Code', 'By Robert C. Martin', 34.99, 200, 'BK-CC-MARTIN', 3),
    ('Garden Tool Set', '10-piece stainless steel set', 79.99, 60, 'HG-GTS-10PC', 4);

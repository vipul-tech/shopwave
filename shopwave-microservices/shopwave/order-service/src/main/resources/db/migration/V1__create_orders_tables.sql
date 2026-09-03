CREATE TABLE IF NOT EXISTS orders (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_number    VARCHAR(50) NOT NULL UNIQUE,
    user_id         BIGINT NOT NULL,
    user_email      VARCHAR(255) NOT NULL,
    status          ENUM('PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED') NOT NULL DEFAULT 'PENDING',
    total_amount    DECIMAL(12,2) NOT NULL,
    shipping_address TEXT NOT NULL,
    notes           TEXT,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME ON UPDATE CURRENT_TIMESTAMP,
    version         INT NOT NULL DEFAULT 0,
    INDEX idx_orders_user_id (user_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_number (order_number)
);

CREATE TABLE IF NOT EXISTS order_items (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id        BIGINT NOT NULL,
    product_id      BIGINT NOT NULL,
    product_name    VARCHAR(255) NOT NULL,
    product_sku     VARCHAR(100) NOT NULL,
    quantity        INT NOT NULL,
    unit_price      DECIMAL(10,2) NOT NULL,
    total_price     DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_order_items_order (order_id)
);

CREATE TABLE IF NOT EXISTS cart_items (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    product_id      BIGINT NOT NULL,
    product_name    VARCHAR(255) NOT NULL,
    product_sku     VARCHAR(100) NOT NULL,
    quantity        INT NOT NULL DEFAULT 1,
    unit_price      DECIMAL(10,2) NOT NULL,
    added_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cart_user_product (user_id, product_id),
    INDEX idx_cart_user (user_id)
);

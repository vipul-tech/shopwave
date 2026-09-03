CREATE TABLE IF NOT EXISTS users (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    first_name  VARCHAR(100) NOT NULL,
    last_name   VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER',
    enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    phone       VARCHAR(20),
    address     TEXT,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email)
);

INSERT INTO users (first_name, last_name, email, password, role)
VALUES (
    'Admin', 'User',
    'admin@shopwave.com',
    -- BCrypt of 'Admin@1234'
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.y',
    'ADMIN'
);

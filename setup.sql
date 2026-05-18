-- Chạy file này trong MySQL Workbench hoặc terminal MySQL
-- Lệnh: mysql -u root -p < setup.sql

-- Tạo database
CREATE DATABASE IF NOT EXISTS mylove_diary
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mylove_diary;

-- Tạo bảng memories
CREATE TABLE IF NOT EXISTS memories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255)  NOT NULL,
  date        DATE          NOT NULL,
  description TEXT,
  image       VARCHAR(255),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kiểm tra
SELECT 'Database và bảng đã được tạo thành công! ♥' AS status;

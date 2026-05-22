-- PostgreSQL setup for mylove_diary
-- Hướng dẫn:
--   psql -U <user> -d postgres -f setup.sql
-- hoặc tạo DB trước rồi chạy phần CREATE TABLE.

-- Tạo database
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'mylove_diary') THEN
    CREATE DATABASE mylove_diary;
  END IF;
END $$;

-- Chuyển sang database
\connect mylove_diary;

-- Tạo table memories
CREATE TABLE IF NOT EXISTS memories (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  image VARCHAR(255),
  mood VARCHAR(50) DEFAULT 'happy',
  location VARCHAR(255) DEFAULT NULL,
  music VARCHAR(255) DEFAULT NULL,
  pos_x FLOAT DEFAULT NULL,
  pos_y FLOAT DEFAULT NULL,
  pos_rotate FLOAT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo table videos
CREATE TABLE IF NOT EXISTS videos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  filename VARCHAR(255),
  pos_x FLOAT DEFAULT NULL,
  pos_y FLOAT DEFAULT NULL,
  pos_rotate FLOAT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kiểm tra
SELECT 'Database and tables created successfully! ♥' AS status;


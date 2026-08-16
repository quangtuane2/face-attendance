-- ============================================================
-- CHẠY TRONG MYSQL WORKBENCH TRƯỚC KHI RESTART BACKEND!
-- ============================================================

USE face_attendance;

-- Bước 1: Convert tất cả role cũ sang role mới (PHẢI làm trước khi đổi enum)
UPDATE users SET role = 'CHUYEN_VIEN' WHERE role IN ('EMPLOYEE', 'HR', 'VIEWER');
UPDATE users SET role = 'ADMIN'       WHERE role = 'ADMIN';

-- Bước 2: Cập nhật kiểu enum trong MySQL
ALTER TABLE users 
    MODIFY COLUMN role 
    ENUM('ADMIN','TRUONG_PHONG','PHO_PHONG','CHUYEN_VIEN') 
    NOT NULL DEFAULT 'CHUYEN_VIEN';

-- Bước 3: Kiểm tra kết quả
SELECT id, username, full_name, role FROM users;

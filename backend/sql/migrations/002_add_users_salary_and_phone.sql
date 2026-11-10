-- Migration: 002_add_users_salary_and_phone.sql
-- Deskripsi: Menambahkan kolom phone dan base_salary (gaji pokok) pada tabel users
--            agar admin & kasir memiliki gaji pokok untuk rekap gaji karyawan.

SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'phone'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN phone VARCHAR(30) NULL AFTER role',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'base_salary'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN base_salary DECIMAL(12,0) DEFAULT 0 AFTER phone',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


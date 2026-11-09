-- Migration: 001_add_users_role_marketers_commissions.sql
-- Deskripsi: Menambahkan role pada users, tabel marketers (komisi 10-15%),
--            serta kolom komisi admin (1%) dan team marketing pada transactions.

CREATE TABLE IF NOT EXISTS marketers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(30),
  commission_percent DECIMAL(5,2) DEFAULT 10,
  base_salary DECIMAL(12,0) DEFAULT 0,
  active TINYINT DEFAULT 1
) CHARACTER SET utf8mb4;

-- Tambah kolom users.role jika belum ada
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN role ENUM(''admin'',''kasir'') NOT NULL DEFAULT ''admin'' AFTER name',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tambah kolom transactions.admin_id jika belum ada
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'admin_id'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE transactions ADD COLUMN admin_id INT NULL AFTER service_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tambah kolom transactions.marketing_id jika belum ada
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'marketing_id'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE transactions ADD COLUMN marketing_id INT NULL AFTER admin_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tambah kolom transactions.marketing_percent jika belum ada
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'marketing_percent'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE transactions ADD COLUMN marketing_percent DECIMAL(5,2) DEFAULT 0 AFTER marketing_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tambah kolom transactions.admin_commission jika belum ada
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'admin_commission'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE transactions ADD COLUMN admin_commission DECIMAL(12,0) DEFAULT 0 AFTER commission',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tambah kolom transactions.marketing_commission jika belum ada
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'marketing_commission'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE transactions ADD COLUMN marketing_commission DECIMAL(12,0) DEFAULT 0 AFTER admin_commission',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


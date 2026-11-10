const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
});


(async () => {
  try {
    await ensureSchema();
    const [[{ n }]] = await pool.query('SELECT COUNT(*) n FROM users');
    if (!n) {
      await pool.query('INSERT INTO users(username, password, name, role) VALUES(?, ?, ?, ?)', [
        'admin',
        await bcrypt.hash('admin123', 10),
        'Administrator',
        'admin',
      ]);
    }
    app.listen(process.env.PORT || 5000, () => console.log('Kamara API running'));
  } catch (err) {
    console.error('Gagal menghubungkan database saat startup:', err.code || err.message || err);
    process.exit(1);
  }
})();

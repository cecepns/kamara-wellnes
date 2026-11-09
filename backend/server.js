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

const ok = (res, data, pagination) =>
  res.json({ success: true, data, ...(pagination && { pagination }) });

const fail = (res, code, message) =>
  res.status(code).json({ success: false, message });

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err);
    fail(res, 500, 'Terjadi kesalahan pada server');
  });

// ---- Resource config: f=fields, s=searchable cols, req=required, j=join, x=extra select
const CUST = ' LEFT JOIN customers c ON c.id=t.customer_id';
const THER = ' LEFT JOIN therapists th ON th.id=t.therapist_id';
const SERV = ' LEFT JOIN services sv ON sv.id=t.service_id';
const USER_JOIN = ' LEFT JOIN users u ON u.id=t.admin_id';
const MKT_JOIN = ' LEFT JOIN marketers mk ON mk.id=t.marketing_id';

const R = {
  customers: {
    f: ['name', 'phone', 'address', 'birth_date', 'member_level', 'points', 'notes'],
    s: ['t.name', 't.phone'],
    req: ['name'],
  },
  services: {
    f: ['name', 'category', 'price', 'promo_price', 'commission_percent', 'active'],
    s: ['t.name', 't.category'],
    req: ['name', 'price'],
  },
  therapists: {
    f: ['name', 'phone', 'base_salary', 'active'],
    s: ['t.name', 't.phone'],
    req: ['name'],
  },
  marketers: {
    f: ['name', 'phone', 'commission_percent', 'base_salary', 'active'],
    s: ['t.name', 't.phone'],
    req: ['name'],
    pre: 'mkt',
  },
  promos: {
    f: ['name', 'discount_type', 'discount_value', 'start_date', 'end_date', 'active'],
    s: ['t.name'],
    req: ['name', 'discount_value'],
  },
  products: {
    f: ['name', 'unit', 'stock', 'min_stock', 'price'],
    s: ['t.name'],
    req: ['name'],
  },
  bookings: {
    f: ['customer_id', 'therapist_id', 'service_id', 'booking_date', 'booking_time', 'status', 'notes'],
    s: ['c.name', 'c.phone', 'sv.name'],
    req: ['customer_id', 'service_id', 'booking_date', 'booking_time'],
    j: CUST + THER + SERV,
    x: ',c.name customer_name,c.phone customer_phone,th.name therapist_name,sv.name service_name',
  },
  transactions: {
    f: [
      'customer_id',
      'therapist_id',
      'service_id',
      'admin_id',
      'marketing_id',
      'marketing_percent',
      'price',
      'discount',
      'total',
      'commission',
      'admin_commission',
      'marketing_commission',
      'payment_method',
      'trx_date',
    ],
    s: ['c.name', 'sv.name', 'th.name', 'u.name', 'mk.name'],
    req: ['service_id', 'trx_date'],
    j: CUST + THER + SERV + USER_JOIN + MKT_JOIN,
    x: ',c.name customer_name,c.phone customer_phone,th.name therapist_name,sv.name service_name,u.name admin_name,mk.name marketing_name',
    pre: 'trx',
    post: 'points',
  },
  attendance: {
    f: ['therapist_id', 'att_date', 'check_in', 'check_out', 'status'],
    s: ['th.name'],
    req: ['therapist_id', 'att_date'],
    j: THER,
    x: ',th.name therapist_name',
  },
  'medical-records': {
    f: [
      'customer_id',
      'visit_date',
      'complaint',
      'diagnosis',
      'treatment',
      'blood_sugar',
      'uric_acid',
      'blood_pressure',
    ],
    s: ['c.name', 't.diagnosis'],
    req: ['customer_id', 'visit_date'],
    j: CUST,
    x: ',c.name customer_name',
  },
};

const clean = (v) => (typeof v === 'string' ? (v.trim() === '' ? null : v.trim()) : v);

function mktPre(b) {
  const pct =
    b.commission_percent !== undefined &&
    b.commission_percent !== null &&
    b.commission_percent !== ''
      ? Number(b.commission_percent)
      : 10;

  if (Number.isNaN(pct) || pct < 10 || pct > 15) {
    throw new Error('Komisi team marketing harus antara 10% - 15%');
  }

  b.commission_percent = pct;
  if (b.base_salary === undefined || b.base_salary === null || b.base_salary === '') {
    b.base_salary = 0;
  }
}

// Kasir: hitung total & komisi terapis, admin (1%), marketing (10-15%) di server
async function trxPre(b) {
  const [[sv]] = await pool.query(
    'SELECT price, commission_percent FROM services WHERE id=?',
    [b.service_id]
  );
  if (!sv) throw new Error('Layanan tidak ditemukan');

  b.price = +b.price || +sv.price;
  b.discount = +b.discount || 0;
  b.total = Math.max(b.price - b.discount, 0);
  b.commission = b.therapist_id ? Math.round((b.total * sv.commission_percent) / 100) : 0;
  b.admin_commission = b.admin_id ? Math.round((b.total * 1) / 100) : 0;

  if (b.marketing_id) {
    const [[mk]] = await pool.query(
      'SELECT commission_percent FROM marketers WHERE id=?',
      [b.marketing_id]
    );
    if (!mk) throw new Error('Team marketing tidak ditemukan');

    const pct =
      b.marketing_percent !== undefined &&
      b.marketing_percent !== null &&
      b.marketing_percent !== ''
        ? Number(b.marketing_percent)
        : Number(mk.commission_percent || 10);

    if (Number.isNaN(pct) || pct < 10 || pct > 15) {
      throw new Error('Komisi marketing harus antara 10% - 15%');
    }

    b.marketing_percent = pct;
    b.marketing_commission = Math.round((b.total * pct) / 100);
  } else {
    b.marketing_id = null;
    b.marketing_percent = 0;
    b.marketing_commission = 0;
  }
}

// ---- Auth
app.post(
  '/api/auth/login',
  wrap(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return fail(res, 400, 'Username dan password wajib diisi');
    }

    const [[u]] = await pool.query('SELECT * FROM users WHERE username=?', [username]);
    if (!u || !(await bcrypt.compare(password, u.password))) {
      return fail(res, 401, 'Username atau password salah');
    }

    const role = u.role || 'admin';
    const token = jwt.sign({ id: u.id, role }, process.env.JWT_SECRET, {
      expiresIn: '12h',
    });

    ok(res, {
      token,
      user: { id: u.id, name: u.name, username: u.username, role },
    });
  })
);

app.use('/api', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const payload = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
    const [[u]] = await pool.query('SELECT id, name, username, role FROM users WHERE id=?', [
      payload.id,
    ]);
    if (!u) return fail(res, 401, 'Sesi berakhir, silakan login ulang');
    req.user = { ...u, role: u.role || 'admin' };
    next();
  } catch {
    fail(res, 401, 'Sesi berakhir, silakan login ulang');
  }
});

const requireAdmin = (req, res, next) =>
  req.user?.role === 'admin' ? next() : fail(res, 403, 'Akses khusus admin');

app.get(
  '/api/auth/profile',
  wrap(async (req, res) => {
    ok(res, req.user);
  })
);

app.put(
  '/api/auth/password',
  wrap(async (req, res) => {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return fail(res, 400, 'Password lama dan password baru wajib diisi');
    }
    if (String(new_password).length < 6) {
      return fail(res, 400, 'Password baru minimal 6 karakter');
    }

    const [[u]] = await pool.query('SELECT id, password FROM users WHERE id=?', [req.user.id]);
    if (!u || !(await bcrypt.compare(current_password, u.password))) {
      return fail(res, 400, 'Password lama salah');
    }

    await pool.query('UPDATE users SET password=? WHERE id=?', [
      await bcrypt.hash(new_password, 10),
      req.user.id,
    ]);
    ok(res, null);
  })
);

app.get(
  '/api/options/staff',
  wrap(async (req, res) => {
    const [users] = await pool.query(
      'SELECT id, name, username, role FROM users ORDER BY name ASC'
    );
    const [marketers] = await pool.query(
      'SELECT id, name, phone, commission_percent FROM marketers WHERE active=1 ORDER BY name ASC'
    );
    ok(res, { users, marketers });
  })
);

// ---- User management (Admin only)
app.get(
  '/api/users',
  requireAdmin,
  wrap(async (req, res) => {
    const { search = '' } = req.query;
    const page = Math.max(+req.query.page || 1, 1);
    const limit = [10, 25, 50, 100].includes(+req.query.limit) ? +req.query.limit : 10;
    const where = search ? 'WHERE name LIKE ? OR username LIKE ?' : '';
    const params = search ? [`%${search}%`, `%${search}%`] : [];

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM users ${where}`, params);
    const [rows] = await pool.query(
      `SELECT id, name, username, role, created_at FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );

    ok(res, rows, {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  })
);

app.post(
  '/api/users',
  requireAdmin,
  wrap(async (req, res) => {
    const name = clean(req.body.name);
    const username = clean(req.body.username);
    const password = req.body.password || '';
    const role = req.body.role === 'kasir' ? 'kasir' : 'admin';

    if (!name || !username || !password) {
      return fail(res, 400, 'Nama, username, dan password wajib diisi');
    }
    if (String(password).length < 6) {
      return fail(res, 400, 'Password minimal 6 karakter');
    }

    const [[dup]] = await pool.query('SELECT id FROM users WHERE username=?', [username]);
    if (dup) return fail(res, 409, 'Username sudah digunakan');

    const [result] = await pool.query(
      'INSERT INTO users(name, username, password, role) VALUES(?, ?, ?, ?)',
      [name, username, await bcrypt.hash(password, 10), role]
    );
    ok(res, { id: result.insertId });
  })
);

app.put(
  '/api/users/:id',
  requireAdmin,
  wrap(async (req, res) => {
    const id = +req.params.id;
    const name = clean(req.body.name);
    const username = clean(req.body.username);
    const role = req.body.role === 'kasir' ? 'kasir' : 'admin';

    if (!name || !username) {
      return fail(res, 400, 'Nama dan username wajib diisi');
    }
    if (id === req.user.id && role !== 'admin') {
      return fail(res, 400, 'Tidak dapat menurunkan role akun sendiri');
    }

    const [[dup]] = await pool.query('SELECT id FROM users WHERE username=? AND id<>?', [
      username,
      id,
    ]);
    if (dup) return fail(res, 409, 'Username sudah digunakan');

    if (req.body.password) {
      if (String(req.body.password).length < 6) {
        return fail(res, 400, 'Password minimal 6 karakter');
      }
      await pool.query('UPDATE users SET name=?, username=?, role=?, password=? WHERE id=?', [
        name,
        username,
        role,
        await bcrypt.hash(req.body.password, 10),
        id,
      ]);
    } else {
      await pool.query('UPDATE users SET name=?, username=?, role=? WHERE id=?', [
        name,
        username,
        role,
        id,
      ]);
    }

    ok(res, { id });
  })
);

app.put(
  '/api/users/:id/password',
  requireAdmin,
  wrap(async (req, res) => {
    const password = req.body.password || '';
    if (String(password).length < 6) {
      return fail(res, 400, 'Password minimal 6 karakter');
    }

    await pool.query('UPDATE users SET password=? WHERE id=?', [
      await bcrypt.hash(password, 10),
      +req.params.id,
    ]);
    ok(res, null);
  })
);

app.delete(
  '/api/users/:id',
  requireAdmin,
  wrap(async (req, res) => {
    const id = +req.params.id;
    if (id === req.user.id) {
      return fail(res, 400, 'Tidak dapat menghapus akun yang sedang dipakai');
    }
    await pool.query('DELETE FROM users WHERE id=?', [id]);
    ok(res, null);
  })
);

// ---- Reports & dashboard
app.get(
  '/api/reports/summary',
  wrap(async (req, res) => {
    const month = /^\d{4}-\d{2}$/.test(req.query.month || '')
      ? req.query.month
      : new Date().toISOString().slice(0, 7);

    const [[tot]] = await pool.query(
      `SELECT
        COALESCE(SUM(total), 0) revenue,
        COALESCE(SUM(commission), 0) commission,
        COALESCE(SUM(admin_commission), 0) adminCommission,
        COALESCE(SUM(marketing_commission), 0) marketingCommission,
        COUNT(*) trx
      FROM transactions
      WHERE DATE_FORMAT(trx_date, '%Y-%m')=?`,
      [month]
    );

    const [payroll] = await pool.query(
      `SELECT
        th.id,
        th.name,
        th.base_salary,
        COALESCE(SUM(t.commission), 0) commission,
        th.base_salary + COALESCE(SUM(t.commission), 0) total_salary
      FROM therapists th
      LEFT JOIN transactions t
        ON t.therapist_id = th.id
        AND DATE_FORMAT(t.trx_date, '%Y-%m') = ?
      GROUP BY th.id, th.name, th.base_salary`,
      [month]
    );

    const [adminPayroll] = await pool.query(
      `SELECT
        u.id,
        u.name,
        u.username,
        u.role,
        COUNT(t.id) trx,
        COALESCE(SUM(t.admin_commission), 0) commission
      FROM users u
      LEFT JOIN transactions t
        ON t.admin_id = u.id
        AND DATE_FORMAT(t.trx_date, '%Y-%m') = ?
      GROUP BY u.id, u.name, u.username, u.role
      ORDER BY commission DESC, u.name ASC`,
      [month]
    );

    const [marketingPayroll] = await pool.query(
      `SELECT
        m.id,
        m.name,
        m.commission_percent,
        m.base_salary,
        COUNT(t.id) trx,
        COALESCE(SUM(t.marketing_commission), 0) commission,
        m.base_salary + COALESCE(SUM(t.marketing_commission), 0) total_salary
      FROM marketers m
      LEFT JOIN transactions t
        ON t.marketing_id = m.id
        AND DATE_FORMAT(t.trx_date, '%Y-%m') = ?
      GROUP BY m.id, m.name, m.commission_percent, m.base_salary
      ORDER BY total_salary DESC, m.name ASC`,
      [month]
    );

    const [daily] = await pool.query(
      `SELECT
        trx_date date,
        COALESCE(SUM(total), 0) total,
        COUNT(*) trx
      FROM transactions
      WHERE DATE_FORMAT(trx_date, '%Y-%m') = ?
      GROUP BY trx_date
      ORDER BY trx_date`,
      [month]
    );

    const [byService] = await pool.query(
      `SELECT
        sv.id,
        sv.name,
        COUNT(*) trx,
        COALESCE(SUM(t.total), 0) total
      FROM transactions t
      JOIN services sv ON sv.id = t.service_id
      WHERE DATE_FORMAT(t.trx_date, '%Y-%m') = ?
      GROUP BY sv.id, sv.name
      ORDER BY total DESC
      LIMIT 6`,
      [month]
    );

    const [byPayment] = await pool.query(
      `SELECT
        payment_method method,
        COUNT(*) trx,
        COALESCE(SUM(total), 0) total
      FROM transactions
      WHERE DATE_FORMAT(trx_date, '%Y-%m') = ?
      GROUP BY payment_method
      ORDER BY total DESC`,
      [month]
    );

    const [monthly] = await pool.query(
      `SELECT
        DATE_FORMAT(trx_date, '%Y-%m') month,
        COALESCE(SUM(total), 0) total,
        COUNT(*) trx
      FROM transactions
      WHERE trx_date BETWEEN
        DATE_SUB(STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'), INTERVAL 5 MONTH)
        AND LAST_DAY(STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'))
      GROUP BY DATE_FORMAT(trx_date, '%Y-%m')
      ORDER BY month`,
      [month, month]
    );

    const [[{ customerCount }]] = await pool.query('SELECT COUNT(*) customerCount FROM customers');
    const [lowStock] = await pool.query(
      'SELECT id, name, stock, min_stock FROM products WHERE stock <= min_stock'
    );
    const [today] = await pool.query(
      `SELECT
        b.*,
        c.name customer_name,
        c.phone customer_phone,
        sv.name service_name
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      JOIN services sv ON sv.id = b.service_id
      WHERE b.booking_date = CURDATE()
        AND b.status IN ('Menunggu', 'Dikonfirmasi')
      ORDER BY b.booking_time`
    );

    ok(res, {
      month,
      ...tot,
      customerCount,
      payroll,
      adminPayroll,
      marketingPayroll,
      daily,
      byService,
      byPayment,
      monthly,
      lowStock,
      today,
    });
  })
);

// ---- Generic CRUD
Object.entries(R).forEach(([name, c]) => {
  const tbl = name.replace('-', '_');
  const base = `/api/${name}`;
  const cols = ['id', ...c.f];

  app.get(
    base,
    wrap(async (req, res) => {
      const { search = '', sort = 'id', order = 'desc' } = req.query;
      const page = Math.max(+req.query.page || 1, 1);
      const limit = [10, 25, 50, 100].includes(+req.query.limit) ? +req.query.limit : 10;
      const where = [];
      const params = [];

      if (search) {
        where.push(`(${c.s.map((col) => `${col} LIKE ?`).join(' OR ')})`);
        c.s.forEach(() => params.push(`%${search}%`));
      }

      cols.forEach((k) => {
        if (req.query[k] !== undefined && req.query[k] !== '') {
          where.push(`t.${k}=?`);
          params.push(req.query[k]);
        }
      });

      const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const from = `FROM ${tbl} t${c.j || ''} ${w}`;
      const [[{ total }]] = await pool.query(`SELECT COUNT(*) total ${from}`, params);
      const sortCol = cols.includes(sort) ? sort : 'id';
      const sortDir = order === 'asc' ? 'ASC' : 'DESC';

      const [rows] = await pool.query(
        `SELECT t.*${c.x || ''} ${from} ORDER BY t.${sortCol} ${sortDir} LIMIT ? OFFSET ?`,
        [...params, limit, (page - 1) * limit]
      );

      ok(res, rows, {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      });
    })
  );

  const save = (isNew) =>
    wrap(async (req, res) => {
      const b = {};
      c.f.forEach((k) => {
        if (req.body[k] !== undefined) b[k] = clean(req.body[k]);
      });

      const missing = c.req.filter(
        (k) => b[k] === undefined || b[k] === null || b[k] === ''
      );
      if (isNew && missing.length) {
        return fail(res, 400, `Field wajib diisi: ${missing.join(', ')}`);
      }

      if (c.pre === 'trx') {
        try {
          await trxPre(b);
        } catch (err) {
          return fail(res, 400, err.message);
        }
      }

      if (c.pre === 'mkt') {
        try {
          mktPre(b);
        } catch (err) {
          return fail(res, 400, err.message);
        }
      }

      const keys = Object.keys(b);
      if (isNew) {
        const [result] = await pool.query(
          `INSERT INTO ${tbl}(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`,
          keys.map((k) => b[k])
        );
        if (c.post === 'points' && b.customer_id) {
          await pool.query('UPDATE customers SET points = points + ? WHERE id=?', [
            Math.floor(b.total / 10000),
            b.customer_id,
          ]);
        }
        return ok(res, { id: result.insertId });
      }

      await pool.query(
        `UPDATE ${tbl} SET ${keys.map((k) => `${k}=?`).join(',')} WHERE id=?`,
        [...keys.map((k) => b[k]), req.params.id]
      );
      ok(res, { id: +req.params.id });
    });

  app.post(base, save(true));
  app.put(`${base}/:id`, save(false));

  app.get(
    `${base}/:id`,
    wrap(async (req, res) => {
      const [[row]] = await pool.query(
        `SELECT t.*${c.x || ''} FROM ${tbl} t${c.j || ''} WHERE t.id=?`,
        [req.params.id]
      );
      row ? ok(res, row) : fail(res, 404, 'Data tidak ditemukan');
    })
  );

  app.delete(
    `${base}/:id`,
    wrap(async (req, res) => {
      try {
        await pool.query(`DELETE FROM ${tbl} WHERE id=?`, [req.params.id]);
        ok(res, null);
      } catch {
        fail(res, 409, 'Data masih dipakai oleh data lain');
      }
    })
  );
});

async function ensureSchema() {
  const addCol = async (table, col, def) => {
    const [[{ n }]] = await pool.query(
      'SELECT COUNT(*) n FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',
      [table, col]
    );
    if (!n) {
      await pool.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
    }
  };

  await pool.query(
    `CREATE TABLE IF NOT EXISTS marketers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(30),
      commission_percent DECIMAL(5,2) DEFAULT 10,
      base_salary DECIMAL(12,0) DEFAULT 0,
      active TINYINT DEFAULT 1
    )`
  );

  await addCol('users', 'role', "ENUM('admin','kasir') NOT NULL DEFAULT 'admin'");
  await addCol('transactions', 'admin_id', 'INT NULL');
  await addCol('transactions', 'admin_commission', 'DECIMAL(12,0) DEFAULT 0');
  await addCol('transactions', 'marketing_id', 'INT NULL');
  await addCol('transactions', 'marketing_percent', 'DECIMAL(5,2) DEFAULT 0');
  await addCol('transactions', 'marketing_commission', 'DECIMAL(12,0) DEFAULT 0');
}

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

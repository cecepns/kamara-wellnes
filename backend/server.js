require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express'), cors = require('cors'), mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');
const app = express();
app.use(cors()); app.use(express.json({ limit: '1mb' }));
const pool = mysql.createPool({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, waitForConnections: true, connectionLimit: 10, dateStrings: true });
const ok = (res, data, pagination) => res.json({ success: true, data, ...(pagination && { pagination }) });
const fail = (res, code, message) => res.status(code).json({ success: false, message });
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { console.error(e); fail(res, 500, 'Terjadi kesalahan pada server'); });

// ---- Resource config: f=fields, s=searchable cols, req=required, j=join, x=extra select
const CUST = ' LEFT JOIN customers c ON c.id=t.customer_id', THER = ' LEFT JOIN therapists th ON th.id=t.therapist_id', SERV = ' LEFT JOIN services sv ON sv.id=t.service_id';
const R = {
  customers: { f: ['name', 'phone', 'address', 'birth_date', 'member_level', 'points', 'notes'], s: ['t.name', 't.phone'], req: ['name'] },
  services: { f: ['name', 'category', 'price', 'promo_price', 'commission_percent', 'active'], s: ['t.name', 't.category'], req: ['name', 'price'] },
  therapists: { f: ['name', 'phone', 'base_salary', 'active'], s: ['t.name', 't.phone'], req: ['name'] },
  promos: { f: ['name', 'discount_type', 'discount_value', 'start_date', 'end_date', 'active'], s: ['t.name'], req: ['name', 'discount_value'] },
  products: { f: ['name', 'unit', 'stock', 'min_stock', 'price'], s: ['t.name'], req: ['name'] },
  bookings: { f: ['customer_id', 'therapist_id', 'service_id', 'booking_date', 'booking_time', 'status', 'notes'], s: ['c.name', 'c.phone', 'sv.name'], req: ['customer_id', 'service_id', 'booking_date', 'booking_time'], j: CUST + THER + SERV, x: ',c.name customer_name,c.phone customer_phone,th.name therapist_name,sv.name service_name' },
  transactions: { f: ['customer_id', 'therapist_id', 'service_id', 'price', 'discount', 'total', 'commission', 'payment_method', 'trx_date'], s: ['c.name', 'sv.name', 'th.name'], req: ['service_id', 'trx_date'], j: CUST + THER + SERV, x: ',c.name customer_name,th.name therapist_name,sv.name service_name', pre: 'trx', post: 'points' },
  attendance: { f: ['therapist_id', 'att_date', 'check_in', 'check_out', 'status'], s: ['th.name'], req: ['therapist_id', 'att_date'], j: THER, x: ',th.name therapist_name' },
  'medical-records': { f: ['customer_id', 'visit_date', 'complaint', 'diagnosis', 'treatment', 'blood_sugar', 'uric_acid', 'blood_pressure'], s: ['c.name', 't.diagnosis'], req: ['customer_id', 'visit_date'], j: CUST, x: ',c.name customer_name' },
};
const clean = (v) => (typeof v === 'string' ? (v.trim() === '' ? null : v.trim()) : v);

// Kasir: hitung total & komisi terapis di server
async function trxPre(b) {
  const [[sv]] = await pool.query('SELECT price,commission_percent FROM services WHERE id=?', [b.service_id]);
  if (!sv) throw new Error('Layanan tidak ditemukan');
  b.price = +b.price || +sv.price; b.discount = +b.discount || 0;
  b.total = Math.max(b.price - b.discount, 0);
  b.commission = b.therapist_id ? Math.round((b.total * sv.commission_percent) / 100) : 0;
}

// ---- Auth
app.post('/api/auth/login', wrap(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return fail(res, 400, 'Username dan password wajib diisi');
  const [[u]] = await pool.query('SELECT * FROM users WHERE username=?', [username]);
  if (!u || !(await bcrypt.compare(password, u.password))) return fail(res, 401, 'Username atau password salah');
  ok(res, { token: jwt.sign({ id: u.id }, process.env.JWT_SECRET, { expiresIn: '12h' }), user: { id: u.id, name: u.name, username: u.username } });
}));
app.use('/api', (req, res, next) => {
  try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET); next(); }
  catch { fail(res, 401, 'Sesi berakhir, silakan login ulang'); }
});
app.get('/api/auth/profile', wrap(async (req, res) => { const [[u]] = await pool.query('SELECT id,name,username FROM users WHERE id=?', [req.user.id]); ok(res, u); }));

// ---- Reports & dashboard
app.get('/api/reports/summary', wrap(async (req, res) => {
  const month = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : new Date().toISOString().slice(0, 7);
  const [[tot]] = await pool.query("SELECT COALESCE(SUM(total),0) revenue,COALESCE(SUM(commission),0) commission,COUNT(*) trx FROM transactions WHERE DATE_FORMAT(trx_date,'%Y-%m')=?", [month]);
  const [payroll] = await pool.query("SELECT th.id,th.name,th.base_salary,COALESCE(SUM(t.commission),0) commission,th.base_salary+COALESCE(SUM(t.commission),0) total_salary FROM therapists th LEFT JOIN transactions t ON t.therapist_id=th.id AND DATE_FORMAT(t.trx_date,'%Y-%m')=? GROUP BY th.id", [month]);
  const [daily] = await pool.query("SELECT trx_date date,COALESCE(SUM(total),0) total,COUNT(*) trx FROM transactions WHERE DATE_FORMAT(trx_date,'%Y-%m')=? GROUP BY trx_date ORDER BY trx_date", [month]);
  const [byService] = await pool.query("SELECT sv.id,sv.name,COUNT(*) trx,COALESCE(SUM(t.total),0) total FROM transactions t JOIN services sv ON sv.id=t.service_id WHERE DATE_FORMAT(t.trx_date,'%Y-%m')=? GROUP BY sv.id,sv.name ORDER BY total DESC LIMIT 6", [month]);
  const [byPayment] = await pool.query("SELECT payment_method method,COUNT(*) trx,COALESCE(SUM(total),0) total FROM transactions WHERE DATE_FORMAT(trx_date,'%Y-%m')=? GROUP BY payment_method ORDER BY total DESC", [month]);
  const [monthly] = await pool.query("SELECT DATE_FORMAT(trx_date,'%Y-%m') month,COALESCE(SUM(total),0) total,COUNT(*) trx FROM transactions WHERE trx_date BETWEEN DATE_SUB(STR_TO_DATE(CONCAT(?,'-01'),'%Y-%m-%d'), INTERVAL 5 MONTH) AND LAST_DAY(STR_TO_DATE(CONCAT(?,'-01'),'%Y-%m-%d')) GROUP BY DATE_FORMAT(trx_date,'%Y-%m') ORDER BY month", [month, month]);
  const [[{ customerCount }]] = await pool.query('SELECT COUNT(*) customerCount FROM customers');
  const [lowStock] = await pool.query('SELECT id,name,stock,min_stock FROM products WHERE stock<=min_stock');
  const [today] = await pool.query("SELECT b.*,c.name customer_name,c.phone customer_phone,sv.name service_name FROM bookings b JOIN customers c ON c.id=b.customer_id JOIN services sv ON sv.id=b.service_id WHERE b.booking_date=CURDATE() AND b.status IN ('Menunggu','Dikonfirmasi') ORDER BY b.booking_time");
  ok(res, { month, ...tot, customerCount, payroll, daily, byService, byPayment, monthly, lowStock, today });
}));

// ---- Generic CRUD
Object.entries(R).forEach(([name, c]) => {
  const tbl = name.replace('-', '_'); const base = `/api/${name}`, cols = ['id', ...c.f];
  app.get(base, wrap(async (req, res) => {
    const { search = '', sort = 'id', order = 'desc' } = req.query;
    const page = Math.max(+req.query.page || 1, 1), limit = [10, 25, 50, 100].includes(+req.query.limit) ? +req.query.limit : 10;
    const where = [], p = [];
    if (search) { where.push('(' + c.s.map((x) => `${x} LIKE ?`).join(' OR ') + ')'); c.s.forEach(() => p.push(`%${search}%`)); }
    cols.forEach((k) => { if (req.query[k] !== undefined && req.query[k] !== '') { where.push(`t.${k}=?`); p.push(req.query[k]); } });
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const from = `FROM ${tbl} t${c.j || ''} ${w}`;
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) total ${from}`, p);
    const [rows] = await pool.query(`SELECT t.*${c.x || ''} ${from} ORDER BY t.${cols.includes(sort) ? sort : 'id'} ${order === 'asc' ? 'ASC' : 'DESC'} LIMIT ? OFFSET ?`, [...p, limit, (page - 1) * limit]);
    ok(res, rows, { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) });
  }));
  const save = (isNew) => wrap(async (req, res) => {
    const b = {}; c.f.forEach((k) => { if (req.body[k] !== undefined) b[k] = clean(req.body[k]); });
    const missing = c.req.filter((k) => b[k] === undefined || b[k] === null || b[k] === '');
    if (isNew && missing.length) return fail(res, 400, `Field wajib diisi: ${missing.join(', ')}`);
    if (c.pre === 'trx') { try { await trxPre(b); } catch (e) { return fail(res, 400, e.message); } }
    const keys = Object.keys(b);
    if (isNew) {
      const [r] = await pool.query(`INSERT INTO ${tbl}(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`, keys.map((k) => b[k]));
      if (c.post === 'points' && b.customer_id) await pool.query('UPDATE customers SET points=points+? WHERE id=?', [Math.floor(b.total / 10000), b.customer_id]);
      return ok(res, { id: r.insertId });
    }
    await pool.query(`UPDATE ${tbl} SET ${keys.map((k) => `${k}=?`).join(',')} WHERE id=?`, [...keys.map((k) => b[k]), req.params.id]);
    ok(res, { id: +req.params.id });
  });
  app.post(base, save(true)); app.put(`${base}/:id`, save(false));
  app.get(`${base}/:id`, wrap(async (req, res) => { const [[r]] = await pool.query(`SELECT * FROM ${tbl} WHERE id=?`, [req.params.id]); r ? ok(res, r) : fail(res, 404, 'Data tidak ditemukan'); }));
  app.delete(`${base}/:id`, wrap(async (req, res) => {
    try { await pool.query(`DELETE FROM ${tbl} WHERE id=?`, [req.params.id]); ok(res, null); }
    catch (e) { fail(res, 409, 'Data masih dipakai oleh data lain'); }
  }));
});

(async () => {
  try {
    const [[{ n }]] = await pool.query('SELECT COUNT(*) n FROM users');
    if (!n) await pool.query('INSERT INTO users(username,password,name) VALUES(?,?,?)', ['admin', await bcrypt.hash('admin123', 10), 'Administrator']);
    app.listen(process.env.PORT || 5000, () => console.log('Kamara API running'));
  } catch (err) {
    console.error('Gagal menghubungkan database saat startup:', err.code || err.message || err);
    process.exit(1);
  }
})();

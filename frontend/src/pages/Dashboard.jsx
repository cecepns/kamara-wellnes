import { useEffect, useMemo, useState } from 'react';
import { Award, CalendarClock, MessageCircle, AlertTriangle, ReceiptText, TrendingUp, Users, Wallet } from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { request, rupiah, waLink } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const PIE_COLORS = ['#ae9142', '#1f2927', '#d4b86a', '#64748b'];

const compactRp = (v) => {
  const n = Number(v) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return `${n}`;
};

const formatMonthLabel = (ym) => {
  const [y, m] = (ym || '').split('-').map(Number);
  if (!y || !m) return ym;
  return `${MONTHS_ID[m - 1]} ${String(y).slice(2)}`;
};

const buildDailySeries = (ym, rows = []) => {
  const [y, m] = (ym || '').split('-').map(Number);
  if (!y || !m) return [];
  const days = new Date(y, m, 0).getDate();
  const map = new Map(rows.map((r) => [String(r.date).slice(0, 10), r]));
  return Array.from({ length: days }, (_, i) => {
    const day = String(i + 1).padStart(2, '0');
    const key = `${ym}-${day}`;
    const hit = map.get(key);
    return {
      day: String(i + 1),
      fullDate: `${day} ${MONTHS_ID[m - 1]} ${y}`,
      total: Number(hit?.total) || 0,
      trx: Number(hit?.trx) || 0,
    };
  });
};

const buildMonthlySeries = (endYm, rows = []) => {
  const [y, m] = (endYm || '').split('-').map(Number);
  if (!y || !m) return [];
  const map = new Map(rows.map((r) => [r.month, r]));
  return Array.from({ length: 6 }, (_, idx) => {
    const offset = idx - 5;
    const d = new Date(y, m - 1 + offset, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const hit = map.get(key);
    return {
      month: key,
      label: formatMonthLabel(key),
      total: Number(hit?.total) || 0,
      trx: Number(hit?.trx) || 0,
    };
  });
};

function ChartTooltip({ active, payload, labelKey }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  const title = labelKey ? item[labelKey] : item.name || item.method;
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-ink-900">{title}</p>
      <p className="mt-0.5 font-bold text-gold-700">{rupiah(item.total)}</p>
      {item.trx !== undefined && <p className="text-stone-500">{item.trx} transaksi</p>}
    </div>
  );
}

function EmptyChart({ text }) {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/60 p-4 text-center text-xs text-stone-400">
      {text}
    </div>
  );
}

export default function Dashboard() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [d, setD] = useState(null);

  useEffect(() => {
    setD(null);
    request('get', API_ENDPOINTS.REPORTS.SUMMARY, { params: { month } })
      .then((r) => setD(r.data))
      .catch(() => {});
  }, [month]);

  const dailyData = useMemo(() => buildDailySeries(d?.month || month, d?.daily), [d, month]);
  const monthlyData = useMemo(() => buildMonthlySeries(d?.month || month, d?.monthly), [d, month]);
  const serviceData = useMemo(
    () => (d?.byService || []).map((s) => ({
      name: s.name,
      shortName: s.name.length > 18 ? `${s.name.slice(0, 17)}…` : s.name,
      total: Number(s.total) || 0,
      trx: Number(s.trx) || 0,
    })),
    [d]
  );
  const paymentData = useMemo(
    () => (d?.byPayment || []).map((p) => ({
      method: p.method || 'Lainnya',
      total: Number(p.total) || 0,
      trx: Number(p.trx) || 0,
    })),
    [d]
  );
  const paymentTotal = useMemo(() => paymentData.reduce((acc, p) => acc + p.total, 0), [paymentData]);

  if (!d) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-stone-200" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-stone-200" />)}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-stone-200" />
      </div>
    );
  }

  const stats = [
    { label: 'Omzet bulan ini', value: rupiah(d.revenue), icon: Wallet, sub: formatMonthLabel(d.month) },
    { label: 'Komisi terapis', value: rupiah(d.commission), icon: Award, sub: `${(d.payroll || []).length} terapis aktif` },
    { label: 'Total transaksi', value: d.trx, icon: ReceiptText, sub: 'Transaksi selesai' },
    { label: 'Total pelanggan', value: d.customerCount ?? 0, icon: Users, sub: `${d.today.length} booking hari ini` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-stone-500">Ringkasan performa & aktivitas Kamara Wellness</p>
        </div>
        <input type="month" className="input !w-auto" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className="flex items-start justify-between rounded-2xl border border-stone-200 bg-white p-4">
            <div>
              <p className="text-sm text-stone-500">{label}</p>
              <p className="mt-1 text-2xl font-bold text-gold-700">{value}</p>
              <p className="mt-1 text-xs text-stone-400">{sub}</p>
            </div>
            <div className="rounded-xl bg-gold-50 p-2.5 text-gold-600">
              <Icon size={20} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-stone-200 bg-white p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-bold"><TrendingUp size={17} className="text-gold-600" />Pendapatan Harian</h2>
              <p className="text-xs text-stone-400">Grafik omzet harian periode {formatMonthLabel(d.month)}</p>
            </div>
          </div>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="kamaraRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ae9142" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="#ae9142" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#78716c' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={compactRp} tick={{ fontSize: 11, fill: '#78716c' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip labelKey="fullDate" />} />
                <Area type="monotone" dataKey="total" stroke="#968036" strokeWidth={2.5} fill="url(#kamaraRevGrad)" activeDot={{ r: 5, fill: '#ae9142', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="flex flex-col rounded-2xl border border-stone-200 bg-white p-4">
          <div className="mb-3">
            <h2 className="font-bold">Metode Pembayaran</h2>
            <p className="text-xs text-stone-400">Distribusi omzet bulan {formatMonthLabel(d.month)}</p>
          </div>
          {!paymentData.length ? (
            <div className="h-64"><EmptyChart text="Belum ada transaksi di bulan ini." /></div>
          ) : (
            <div className="flex flex-1 flex-col justify-between">
              <div className="h-44 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentData} dataKey="total" nameKey="method" cx="50%" cy="50%" innerRadius={46} outerRadius={72} paddingAngle={3}>
                      {paymentData.map((entry, idx) => (
                        <Cell key={entry.method} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip labelKey="method" />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1.5 border-t border-stone-100 pt-2.5 text-xs">
                {paymentData.map((p, idx) => {
                  const pct = paymentTotal ? Math.round((p.total / paymentTotal) * 100) : 0;
                  return (
                    <div key={p.method} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-medium text-ink-800">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        {p.method} <span className="text-stone-400">({pct}%)</span>
                      </span>
                      <span className="font-semibold text-ink-900">{rupiah(p.total)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="mb-3">
            <h2 className="font-bold">Layanan Terlaris</h2>
            <p className="text-xs text-stone-400">Kontribusi pendapatan per layanan bulan {formatMonthLabel(d.month)}</p>
          </div>
          <div className="h-60 w-full min-w-0">
            {!serviceData.length ? (
              <EmptyChart text="Belum ada transaksi layanan di bulan ini." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
                  <XAxis type="number" tickFormatter={compactRp} tick={{ fontSize: 11, fill: '#78716c' }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="shortName" width={125} tick={{ fontSize: 11, fill: '#1f2927' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip labelKey="name" />} />
                  <Bar dataKey="total" fill="#ae9142" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="mb-3">
            <h2 className="font-bold">Tren Omzet 6 Bulan Terakhir</h2>
            <p className="text-xs text-stone-400">Perbandingan pendapatan bulanan hingga {formatMonthLabel(d.month)}</p>
          </div>
          <div className="h-60 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={compactRp} tick={{ fontSize: 11, fill: '#78716c' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip labelKey="label" />} />
                <Bar dataKey="total" fill="#1f2927" radius={[6, 6, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="mb-3 flex items-center gap-2 font-bold"><CalendarClock size={17} className="text-gold-600" />Booking hari ini: follow up via WhatsApp</h2>
          {!d.today.length && <p className="text-sm text-stone-500">Tidak ada booking aktif hari ini.</p>}
          {d.today.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-2 border-t border-stone-100 py-2 text-sm">
              <span><b>{b.booking_time.slice(0, 5)}</b> · {b.customer_name} · {b.service_name}</span>
              <a className="btn-primary !py-1" target="_blank" rel="noreferrer"
                href={waLink(b.customer_phone, `Halo ${b.customer_name}, kami mengingatkan jadwal ${b.service_name} Anda hari ini pukul ${b.booking_time.slice(0, 5)} di Kamara Wellness. Terima kasih.`)}>
                <MessageCircle size={16} />Ingatkan</a></div>))}
        </section>

        <section className={`rounded-2xl border p-4 text-sm ${d.lowStock.length ? 'border-amber-300 bg-amber-50' : 'border-stone-200 bg-white'}`}>
          <h2 className="mb-2 flex items-center gap-2 font-bold"><AlertTriangle size={16} className={d.lowStock.length ? 'text-amber-600' : 'text-stone-400'} />Stok menipis</h2>
          {!d.lowStock.length ? (
            <p className="text-stone-500">Semua stok produk dalam kondisi aman.</p>
          ) : (
            d.lowStock.map((p) => <p key={p.id} className="py-0.5">{p.name}: sisa <b>{p.stock}</b> (minimum {p.min_stock})</p>)
          )}
        </section>
      </div>
    </div>
  );
}

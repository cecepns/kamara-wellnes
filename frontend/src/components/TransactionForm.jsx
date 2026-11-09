import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { request, rupiah } from '@/utils/request';
import { API_ENDPOINTS as E } from '@/utils/endpoints';
import CustomerSelect from './CustomerSelect';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function TransactionForm({ initial, onSubmit, onCancel }) {
  const isNew = !initial?.id;
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  }, []);

  const [form, setForm] = useState(() => ({
    trx_date: initial?.trx_date ? String(initial.trx_date).slice(0, 10) : todayStr(),
    customer_id: initial?.customer_id ?? null,
    customer_name: initial?.customer_name || '',
    service_id: initial?.service_id ?? '',
    therapist_id: initial?.therapist_id ?? '',
    admin_id: isNew ? (currentUser?.id ?? '') : (initial?.admin_id ?? ''),
    marketing_id: initial?.marketing_id ?? '',
    marketing_percent: initial?.marketing_id ? (initial?.marketing_percent ?? 10) : '',
    price: initial?.price ?? '',
    discount: initial?.discount ?? 0,
    payment_method: initial?.payment_method || 'Tunai',
  }));

  const [services, setServices] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [users, setUsers] = useState([]);
  const [marketers, setMarketers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      request('get', E.SERVICES.LIST, { params: { limit: 100 } }),
      request('get', E.THERAPISTS.LIST, { params: { limit: 100 } }),
      request('get', E.OPTIONS.STAFF),
    ]).then(([sv, th, st]) => {
      setServices(sv.data || []);
      setTherapists(th.data || []);
      setUsers(st.data?.users || []);
      setMarketers(st.data?.marketers || []);
    }).catch(() => {});
  }, []);

  const selectedService = useMemo(
    () => services.find((s) => String(s.id) === String(form.service_id)),
    [services, form.service_id]
  );

  const calc = useMemo(() => {
    const price = Number(form.price) || Number(selectedService?.price) || 0;
    const discount = Number(form.discount) || 0;
    const total = Math.max(price - discount, 0);
    const therapistPct = Number(selectedService?.commission_percent) || 0;
    const therapistComm = form.therapist_id ? Math.round((total * therapistPct) / 100) : 0;
    const adminComm = form.admin_id ? Math.round((total * 1) / 100) : 0;
    const mktPct = form.marketing_id ? (Number(form.marketing_percent) || 0) : 0;
    const mktComm = form.marketing_id ? Math.round((total * mktPct) / 100) : 0;
    return { price, discount, total, therapistPct, therapistComm, adminComm, mktPct, mktComm };
  }, [form, selectedService]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleMarketingChange = (val) => {
    if (!val) {
      setForm((p) => ({ ...p, marketing_id: '', marketing_percent: '' }));
      return;
    }
    const found = marketers.find((m) => String(m.id) === String(val));
    setForm((p) => ({ ...p, marketing_id: val, marketing_percent: found?.commission_percent ?? 10 }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.trx_date) return toast.error('Tanggal wajib diisi');
    if (!form.service_id) return toast.error('Layanan wajib diisi');
    if (form.marketing_id) {
      const pct = Number(form.marketing_percent);
      if (Number.isNaN(pct) || pct < 10 || pct > 15) {
        return toast.error('Komisi marketing harus antara 10% sampai 15%');
      }
    }
    setSaving(true);
    try {
      await onSubmit({
        trx_date: form.trx_date,
        customer_id: form.customer_id || null,
        service_id: form.service_id,
        therapist_id: form.therapist_id || null,
        admin_id: form.admin_id || null,
        marketing_id: form.marketing_id || null,
        marketing_percent: form.marketing_id ? Number(form.marketing_percent) : 0,
        price: form.price,
        discount: form.discount || 0,
        payment_method: form.payment_method || 'Tunai',
      });
    } catch { /* toast ditangani request() */ } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Tanggal *</span>
          <input type="date" className="input" value={form.trx_date} onChange={(e) => set('trx_date', e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Pembayaran</span>
          <select className="input" value={form.payment_method} onChange={(e) => set('payment_method', e.target.value)}>
            {['Tunai', 'Transfer', 'QRIS'].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      </div>

      <div className="block text-sm">
        <span className="mb-1 block font-medium">Pelanggan</span>
        <CustomerSelect
          value={form.customer_id}
          initialLabel={form.customer_name}
          onChange={(val, label) => setForm((p) => ({ ...p, customer_id: val, customer_name: label || '' }))}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Layanan *</span>
          <select className="input" value={form.service_id} onChange={(e) => set('service_id', e.target.value)}>
            <option value="">-- Pilih Layanan --</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({rupiah(s.price)})</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Terapis</span>
          <select className="input" value={form.therapist_id} onChange={(e) => set('therapist_id', e.target.value)}>
            <option value="">-- Tanpa Terapis --</option>
            {therapists.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Admin / Kasir (Komisi 1%)</span>
          <select className="input" value={form.admin_id} onChange={(e) => set('admin_id', e.target.value)}>
            <option value="">-- Tanpa Komisi Admin --</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Team Marketing</span>
          <select className="input" value={form.marketing_id} onChange={(e) => handleMarketingChange(e.target.value)}>
            <option value="">-- Tanpa Marketing --</option>
            {marketers.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.commission_percent}%)</option>)}
          </select>
        </label>
      </div>

      {form.marketing_id && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs">
          <span className="font-medium text-stone-700">Persentase Komisi Marketing (10% – 15%)</span>
          <div className="flex items-center gap-1.5">
            {[10, 12, 15].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => set('marketing_percent', pct)}
                className={`rounded-md px-2 py-1 font-semibold ${Number(form.marketing_percent) === pct ? 'bg-gold-500 text-white' : 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-100'}`}
              >
                {pct}%
              </button>
            ))}
            <input
              type="number"
              min="10"
              max="15"
              step="0.5"
              className="input !w-20 !py-1 text-center"
              value={form.marketing_percent}
              onChange={(e) => set('marketing_percent', e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Harga (kosong = harga layanan)</span>
          <input
            type="number"
            className="input"
            placeholder={selectedService ? String(selectedService.price) : '0'}
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Diskon / promo (Rp)</span>
          <input type="number" className="input" value={form.discount} onChange={(e) => set('discount', e.target.value)} />
        </label>
      </div>

      <div className="space-y-1 rounded-xl border border-gold-500/30 bg-gold-50/70 p-3 text-xs">
        <div className="flex items-center justify-between text-sm font-bold text-ink-900">
          <span>Total Bayar</span>
          <span className="text-gold-700">{rupiah(calc.total)}</span>
        </div>
        <div className="grid gap-1 border-t border-gold-500/20 pt-1.5 text-stone-600 sm:grid-cols-3">
          <span>Terapis ({calc.therapistPct}%): <b>{rupiah(calc.therapistComm)}</b></span>
          <span>Admin (1%): <b>{rupiah(calc.adminComm)}</b></span>
          <span>Marketing ({calc.mktPct}%): <b>{rupiah(calc.mktComm)}</b></span>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Batal</button>
        <button className="btn-primary" disabled={saving}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          {isNew ? 'Simpan & Invoice' : 'Simpan Perubahan'}
        </button>
      </div>
    </form>
  );
}


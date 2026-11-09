import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { request } from '@/utils/request';
import { API_ENDPOINTS as E } from '@/utils/endpoints';
import CustomerSelect from './CustomerSelect';

const REF = { customers: E.CUSTOMERS, services: E.SERVICES, therapists: E.THERAPISTS };
const Field = ({ f, value, onChange, refs }) => {
  const common = { className: 'input', value: value ?? '', onChange: (e) => onChange(e.target.value) };
  if (f.type === 'textarea') return <textarea rows={2} {...common} />;
  if (f.type === 'select') {
    const options = f.ref ? (refs[f.ref] || []).map((r) => ({ value: r.id, label: r.name })) : f.options;
    return <select {...common}><option value="">-- Pilih --</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
  }
  return <input type={f.type || 'text'} {...common} />;
};

export default function ResourceForm({ fields, initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial || {});
  const [refs, setRefs] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    [...new Set(fields.filter((f) => f.ref).map((f) => f.ref))].forEach(async (k) => {
      const res = await request('get', REF[k].LIST, { params: { limit: 100 } });
      setRefs((p) => ({ ...p, [k]: res.data }));
    });
  }, [fields]);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    const miss = fields.find((f) => f.required && (form[f.key] === undefined || form[f.key] === null || form[f.key] === ''));
    if (miss) return toast.error(`${miss.label} wajib diisi`);
    setSaving(true);
    try { await onSubmit(form); } catch { /* toast sudah muncul */ } finally { setSaving(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      {fields.filter((f) => f.type !== 'hidden').map((f) => (
        f.type === 'customer-select' ? (
          <div key={f.key} className="block text-sm">
            <span className="mb-1 block font-medium">{f.label}{f.required && ' *'}</span>
            <CustomerSelect
              value={form[f.key]}
              initialLabel={typeof f.table === 'string' ? form[f.table] : ''}
              required={f.required}
              onChange={(val, label) => setForm((p) => ({ ...p, [f.key]: val, ...(typeof f.table === 'string' && { [f.table]: label }) }))}
            />
          </div>
        ) : (
          <label key={f.key} className="block text-sm"><span className="mb-1 block font-medium">{f.label}{f.required && ' *'}</span>
            <Field f={f} value={form[f.key]} refs={refs} onChange={(v) => set(f.key, v)} /></label>
        )
      ))}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Batal</button>
        <button className="btn-primary" disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />}Simpan</button></div>
    </form>
  );
}

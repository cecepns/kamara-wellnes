import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Pencil, ShieldCheck, Users } from 'lucide-react';
import Modal from '@/components/Modal';
import { request, rupiah } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';

export default function Reports() {
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  }, []);
  const isAdmin = currentUser?.role === 'admin';

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [d, setD] = useState(null);
  const [salaryModal, setSalaryModal] = useState(null);

  const load = useCallback(() => {
    setD(null);
    request('get', API_ENDPOINTS.REPORTS.SUMMARY, { params: { month } }).then((r) => setD(r.data)).catch(() => {});
  }, [month]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Laporan & Gaji</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/rekap-karyawan" className="btn-ghost text-xs">
            <Users size={15} />
            Rekap Karyawan
          </Link>
          <input type="month" className="input !w-auto" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
      </div>

      {!d ? <div className="h-40 animate-pulse rounded-2xl bg-stone-200" /> : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Omzet ' + d.month, rupiah(d.revenue)],
              ['Komisi Terapis', rupiah(d.commission)],
              ['Komisi Admin (1%)', rupiah(d.adminCommission)],
              ['Komisi Marketing (10–15%)', rupiah(d.marketingCommission)],
            ].map(([label, val]) => (
              <div key={label} className="rounded-2xl border border-stone-200 bg-white p-4">
                <p className="text-sm text-stone-500">{label}</p>
                <p className="mt-1 text-2xl font-bold text-gold-700">{val}</p>
              </div>
            ))}
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-bold">Gaji & Komisi Terapis</h2>
            <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-stone-50">
                  <tr>
                    {['Terapis', 'Transaksi', 'Gaji pokok', 'Komisi', 'Total gaji'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}
                    {isAdmin && <th className="px-4 py-3 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {(d.payroll || []).map((p) => (
                    <tr key={p.id} className="border-t border-stone-100">
                      <td className="px-4 py-3">{p.name}</td>
                      <td className="px-4 py-3">{p.trx ?? 0}</td>
                      <td className="px-4 py-3">{rupiah(p.base_salary)}</td>
                      <td className="px-4 py-3">{rupiah(p.commission)}</td>
                      <td className="px-4 py-3 font-bold text-gold-700">{rupiah(p.total_salary)}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100"
                            onClick={() => setSalaryModal({ id: p.id, name: p.name, division: 'Terapis', roleLabel: 'Terapis', base_salary: p.base_salary })}
                          >
                            <Pencil size={12} />Atur Gaji
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold">Gaji Pokok & Komisi Admin (1%)</h2>
                <p className="text-xs text-stone-500">Admin &amp; Kasir mendapatkan gaji pokok ditambah komisi 1% per transaksi</p>
              </div>
              {isAdmin && (
                <Link to="/users" className="inline-flex items-center gap-1.5 rounded-lg border border-gold-500/40 bg-gold-50 px-3 py-1.5 text-xs font-semibold text-gold-700 hover:bg-gold-100">
                  <ShieldCheck size={14} />
                  Kelola User &amp; Gaji Admin
                </Link>
              )}
            </div>
            <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-stone-50">
                  <tr>
                    {['Nama', 'Role', 'Transaksi', 'Gaji pokok', 'Komisi 1%', 'Total gaji'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}
                    {isAdmin && <th className="px-4 py-3 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {(d.adminPayroll || []).map((a) => (
                    <tr key={a.id} className="border-t border-stone-100">
                      <td className="px-4 py-3">{a.name}</td>
                      <td className="px-4 py-3 capitalize">{a.role}</td>
                      <td className="px-4 py-3">{a.trx}</td>
                      <td className="px-4 py-3">{rupiah(a.base_salary)}</td>
                      <td className="px-4 py-3">{rupiah(a.commission)}</td>
                      <td className="px-4 py-3 font-bold text-gold-700">{rupiah(a.total_salary)}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-gold-500/40 bg-gold-50/80 px-2.5 py-1 text-xs font-semibold text-gold-700 hover:bg-gold-100"
                            onClick={() => setSalaryModal({ id: a.id, name: a.name, division: 'Admin', roleLabel: a.role === 'kasir' ? 'Kasir (1%)' : 'Admin (1%)', base_salary: a.base_salary })}
                          >
                            <Pencil size={12} />Atur Gaji
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">Gaji & Komisi Team Marketing (10–15%)</h2>
            <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-stone-50">
                  <tr>
                    {['Marketing', 'Default %', 'Transaksi', 'Gaji pokok', 'Komisi', 'Total diterima'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}
                    {isAdmin && <th className="px-4 py-3 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {!(d.marketingPayroll || []).length ? (
                    <tr><td colSpan={isAdmin ? 7 : 6} className="px-4 py-6 text-center text-stone-400">Belum ada data team marketing.</td></tr>
                  ) : (
                    d.marketingPayroll.map((m) => (
                      <tr key={m.id} className="border-t border-stone-100">
                        <td className="px-4 py-3">{m.name}</td>
                        <td className="px-4 py-3">{m.commission_percent}%</td>
                        <td className="px-4 py-3">{m.trx}</td>
                        <td className="px-4 py-3">{rupiah(m.base_salary)}</td>
                        <td className="px-4 py-3">{rupiah(m.commission)}</td>
                        <td className="px-4 py-3 font-bold text-gold-700">{rupiah(m.total_salary)}</td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100"
                              onClick={() => setSalaryModal({ id: m.id, name: m.name, division: 'Marketing', roleLabel: `Marketing (${m.commission_percent}%)`, base_salary: m.base_salary })}
                            >
                              <Pencil size={12} />Atur Gaji
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <Modal open={!!salaryModal} title={`Atur Gaji Pokok · ${salaryModal?.name || ''}`} onClose={() => setSalaryModal(null)}>
        {salaryModal && (
          <ReportSalaryForm
            employee={salaryModal}
            onCancel={() => setSalaryModal(null)}
            onSaved={() => { setSalaryModal(null); load(); }}
          />
        )}
      </Modal>
    </div>
  );
}

function ReportSalaryForm({ employee, onCancel, onSaved }) {
  const [salary, setSalary] = useState(employee.base_salary ?? 0);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request('put', API_ENDPOINTS.EMPLOYEES.SALARY, {
        data: { division: employee.division, id: employee.id, base_salary: Math.max(Number(salary) || 0, 0) },
        success: 'Gaji pokok diperbarui',
      });
      onSaved();
    } catch { /* toast sudah muncul */ } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-xs text-stone-500">Divisi: <b>{employee.division}</b> ({employee.roleLabel})</p>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Gaji Pokok (Rp)</span>
        <input type="number" min="0" className="input" value={salary} onChange={(e) => setSalary(e.target.value)} autoFocus />
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Batal</button>
        <button className="btn-primary" disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />}Simpan</button>
      </div>
    </form>
  );
}

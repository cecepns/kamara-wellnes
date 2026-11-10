import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Info, Loader2, Pencil, Printer, Search, Users, Wallet } from 'lucide-react';
import Modal from '@/components/Modal';
import { request, rupiah } from '@/utils/request';
import { API_ENDPOINTS as E } from '@/utils/endpoints';

const DIVISIONS = ['Semua', 'Terapis', 'Admin', 'Marketing'];

const DIV_BADGE = {
  Terapis: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Admin: 'bg-gold-100 text-gold-700 border-gold-500/30',
  Marketing: 'bg-sky-50 text-sky-700 border-sky-200',
};

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export default function EmployeeRecap() {
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  }, []);
  const isAdmin = currentUser?.role === 'admin';

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [division, setDivision] = useState('Semua');
  const [search, setSearch] = useState('');
  const [d, setD] = useState(null);
  const [salaryModal, setSalaryModal] = useState(null);

  const load = useCallback(() => {
    setD(null);
    request('get', E.REPORTS.SUMMARY, { params: { month } })
      .then((r) => setD(r.data))
      .catch(() => {});
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const list = d?.employeeRecap || [];
    const q = search.trim().toLowerCase();
    return list.filter((item) => {
      if (division !== 'Semua' && item.division !== division) return false;
      if (q && !item.name.toLowerCase().includes(q) && !item.roleLabel.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [d, division, search]);

  const counts = useMemo(() => {
    const list = d?.employeeRecap || [];
    return {
      total: list.length,
      terapis: list.filter((x) => x.division === 'Terapis').length,
      admin: list.filter((x) => x.division === 'Admin').length,
      marketing: list.filter((x) => x.division === 'Marketing').length,
    };
  }, [d]);

  const filteredTotals = useMemo(() => rows.reduce(
    (acc, r) => ({
      trx: acc.trx + (Number(r.trx) || 0),
      base: acc.base + (Number(r.base_salary) || 0),
      comm: acc.comm + (Number(r.commission) || 0),
      total: acc.total + (Number(r.total_salary) || 0),
    }),
    { trx: 0, base: 0, comm: 0, total: 0 }
  ), [rows]);

  const exportCsv = () => {
    const header = ['Nama', 'Divisi', 'Jabatan / Rate', 'No. HP', 'Transaksi', 'Gaji Pokok', 'Komisi', 'Total Diterima'];
    const lines = [
      header.join(','),
      ...rows.map((r) => [
        `"${String(r.name || '').replace(/"/g, '""')}"`,
        r.division,
        `"${String(r.roleLabel || '').replace(/"/g, '""')}"`,
        `"${String(r.phone || '-').replace(/"/g, '""')}"`,
        r.trx,
        r.base_salary,
        r.commission,
        r.total_salary,
      ].join(',')),
    ];
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-karyawan-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printRecap = () => {
    const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>Rekap Karyawan ${esc(month)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #151d1b; font-size: 12px; margin: 0; }
  h1 { margin: 0 0 4px; font-size: 18px; }
  p { margin: 0 0 14px; color: #57534e; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 8px 10px; border: 1px solid #d6d3d1; text-align: left; }
  th { background: #1f2927; color: #fff; font-size: 11px; }
  .r { text-align: right; }
  tfoot td { font-weight: 700; background: #faf6ea; }
</style>
</head>
<body>
  <h1>Rekap Gaji & Komisi Karyawan — Kamara Wellness</h1>
  <p>Periode: <b>${esc(month)}</b> · Filter Divisi: <b>${esc(division)}</b></p>
  <table>
    <thead>
      <tr>
        <th>Nama</th>
        <th>Divisi</th>
        <th>Jabatan / Rate</th>
        <th class="r">Transaksi</th>
        <th class="r">Gaji Pokok</th>
        <th class="r">Komisi</th>
        <th class="r">Total Diterima</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((r) => `
        <tr>
          <td>${esc(r.name)}</td>
          <td>${esc(r.division)}</td>
          <td>${esc(r.roleLabel)}</td>
          <td class="r">${r.trx}</td>
          <td class="r">${esc(rupiah(r.base_salary))}</td>
          <td class="r">${esc(rupiah(r.commission))}</td>
          <td class="r"><b>${esc(rupiah(r.total_salary))}</b></td>
        </tr>`).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3">TOTAL (${rows.length} karyawan)</td>
        <td class="r">${filteredTotals.trx}</td>
        <td class="r">${esc(rupiah(filteredTotals.base))}</td>
        <td class="r">${esc(rupiah(filteredTotals.comm))}</td>
        <td class="r">${esc(rupiah(filteredTotals.total))}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    let done = false;
    const trigger = () => {
      if (done) return;
      done = true;
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.parentNode?.removeChild(iframe), 1500);
    };
    iframe.onload = () => setTimeout(trigger, 100);
    const doc = iframe.contentWindow?.document;
    if (doc) { doc.open(); doc.write(html); doc.close(); setTimeout(trigger, 400); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rekap Karyawan</h1>
          <p className="text-sm text-stone-500">Rekap gaji pokok & komisi seluruh karyawan (Terapis, Admin, Team Marketing)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="month" className="input !w-auto" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button type="button" className="btn-ghost text-xs" disabled={!rows.length} onClick={exportCsv}>
            <Download size={15} />Export CSV
          </button>
          <button type="button" className="btn-primary text-xs" disabled={!rows.length} onClick={printRecap}>
            <Printer size={15} />Cetak Rekap
          </button>
        </div>
      </div>

      {!d ? <div className="h-40 animate-pulse rounded-2xl bg-stone-200" /> : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-start justify-between rounded-2xl border border-stone-200 bg-white p-4">
              <div>
                <p className="text-sm text-stone-500">Total Karyawan</p>
                <p className="mt-1 text-2xl font-bold text-gold-700">{counts.total}</p>
                <p className="mt-1 text-xs text-stone-400">{counts.terapis} Terapis · {counts.admin} Admin · {counts.marketing} Marketing</p>
              </div>
              <div className="rounded-xl bg-gold-50 p-2.5 text-gold-600"><Users size={20} /></div>
            </div>
            <div className="flex items-start justify-between rounded-2xl border border-stone-200 bg-white p-4">
              <div>
                <p className="text-sm text-stone-500">Total Gaji Pokok</p>
                <p className="mt-1 text-2xl font-bold text-gold-700">{rupiah(d.totalBaseSalary)}</p>
                <p className="mt-1 text-xs text-stone-400">Seluruh divisi</p>
              </div>
              <div className="rounded-xl bg-gold-50 p-2.5 text-gold-600"><Wallet size={20} /></div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-sm text-stone-500">Total Komisi</p>
              <p className="mt-1 text-2xl font-bold text-gold-700">{rupiah(d.totalCommission)}</p>
              <p className="mt-1 text-xs text-stone-400">Terapis + Admin 1% + Marketing</p>
            </div>
            <div className="rounded-2xl border border-gold-500/30 bg-gold-50/60 p-4">
              <p className="text-sm font-medium text-gold-700">Total Pengeluaran Gaji</p>
              <p className="mt-1 text-2xl font-bold text-ink-900">{rupiah(d.totalPayroll)}</p>
              <p className="mt-1 text-xs text-stone-500">Periode {d.month}</p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs text-stone-600">
              <Info size={15} className="shrink-0 text-gold-600" />
              <span>
                Pengaturan gaji pokok dapat diubah langsung lewat tombol <b>Atur Gaji</b> di tabel, atau di menu{' '}
                <Link to="/therapists" className="font-semibold text-gold-700 underline">Terapis</Link>,{' '}
                <Link to="/users" className="font-semibold text-gold-700 underline">Manajemen User (Admin/Kasir)</Link>, dan{' '}
                <Link to="/marketers" className="font-semibold text-gold-700 underline">Team Marketing</Link>.
              </span>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {DIVISIONS.map((div) => (
                <button
                  key={div}
                  type="button"
                  onClick={() => setDivision(div)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${division === div ? 'bg-gold-500 text-white' : 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-50'}`}
                >
                  {div}
                </button>
              ))}
            </div>
            <div className="relative sm:w-64">
              <Search size={16} className="absolute left-3 top-3 text-stone-400" />
              <input className="input !pl-9" placeholder="Cari nama karyawan..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
            <table className="w-full min-w-[740px] text-left text-sm">
              <thead className="bg-stone-50 text-stone-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nama</th>
                  <th className="px-4 py-3 font-semibold">Divisi</th>
                  <th className="px-4 py-3 font-semibold">Jabatan / Rate</th>
                  <th className="px-4 py-3 text-right font-semibold">Transaksi</th>
                  <th className="px-4 py-3 text-right font-semibold">Gaji Pokok</th>
                  <th className="px-4 py-3 text-right font-semibold">Komisi</th>
                  <th className="px-4 py-3 text-right font-semibold">Total Diterima</th>
                  {isAdmin && <th className="px-4 py-3 text-right font-semibold">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {!rows.length ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-stone-400">
                      Tidak ada data karyawan untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.key} className="border-t border-stone-100 hover:bg-gold-50/40">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink-900">{r.name}</p>
                        {r.phone && <p className="text-xs text-stone-400">{r.phone}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${DIV_BADGE[r.division] || ''}`}>
                          {r.division}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600">{r.roleLabel}</td>
                      <td className="px-4 py-3 text-right">{r.trx}</td>
                      <td className="px-4 py-3 text-right">{rupiah(r.base_salary)}</td>
                      <td className="px-4 py-3 text-right">{rupiah(r.commission)}</td>
                      <td className="px-4 py-3 text-right font-bold text-gold-700">{rupiah(r.total_salary)}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-gold-500/40 bg-gold-50/80 px-2.5 py-1 text-xs font-semibold text-gold-700 hover:bg-gold-100"
                            onClick={() => setSalaryModal(r)}
                          >
                            <Pencil size={13} />
                            Atur Gaji
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
              {!!rows.length && (
                <tfoot>
                  <tr className="border-t-2 border-stone-200 bg-gold-50/60 font-bold">
                    <td colSpan={3} className="px-4 py-3">TOTAL ({rows.length} karyawan)</td>
                    <td className="px-4 py-3 text-right">{filteredTotals.trx}</td>
                    <td className="px-4 py-3 text-right">{rupiah(filteredTotals.base)}</td>
                    <td className="px-4 py-3 text-right">{rupiah(filteredTotals.comm)}</td>
                    <td className="px-4 py-3 text-right text-gold-700">{rupiah(filteredTotals.total)}</td>
                    {isAdmin && <td />}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      <Modal open={!!salaryModal} title={`Atur Gaji Pokok · ${salaryModal?.name || ''}`} onClose={() => setSalaryModal(null)}>
        {salaryModal && (
          <EditSalaryForm
            employee={salaryModal}
            onCancel={() => setSalaryModal(null)}
            onSaved={() => { setSalaryModal(null); load(); }}
          />
        )}
      </Modal>
    </div>
  );
}

function EditSalaryForm({ employee, onCancel, onSaved }) {
  const [salary, setSalary] = useState(employee.base_salary ?? 0);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request('put', E.EMPLOYEES.SALARY, {
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


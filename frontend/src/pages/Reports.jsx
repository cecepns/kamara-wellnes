import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { request, rupiah } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';

export default function Reports() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [d, setD] = useState(null);
  useEffect(() => {
    setD(null);
    request('get', API_ENDPOINTS.REPORTS.SUMMARY, { params: { month } }).then((r) => setD(r.data)).catch(() => {});
  }, [month]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Laporan & Gaji</h1>
        <div className="flex items-center gap-2">
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
              <table className="w-full min-w-[540px] text-left text-sm">
                <thead className="bg-stone-50"><tr>{['Terapis', 'Transaksi', 'Gaji pokok', 'Komisi', 'Total gaji'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                <tbody>
                  {(d.payroll || []).map((p) => (
                    <tr key={p.id} className="border-t border-stone-100">
                      <td className="px-4 py-3">{p.name}</td>
                      <td className="px-4 py-3">{p.trx ?? 0}</td>
                      <td className="px-4 py-3">{rupiah(p.base_salary)}</td>
                      <td className="px-4 py-3">{rupiah(p.commission)}</td>
                      <td className="px-4 py-3 font-bold text-gold-700">{rupiah(p.total_salary)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">Gaji & Komisi Admin (1%)</h2>
            <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-stone-50"><tr>{['Nama', 'Role', 'Transaksi', 'Gaji pokok', 'Komisi 1%', 'Total gaji'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                <tbody>
                  {(d.adminPayroll || []).map((a) => (
                    <tr key={a.id} className="border-t border-stone-100">
                      <td className="px-4 py-3">{a.name}</td>
                      <td className="px-4 py-3 capitalize">{a.role}</td>
                      <td className="px-4 py-3">{a.trx}</td>
                      <td className="px-4 py-3">{rupiah(a.base_salary)}</td>
                      <td className="px-4 py-3">{rupiah(a.commission)}</td>
                      <td className="px-4 py-3 font-bold text-gold-700">{rupiah(a.total_salary)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold">Gaji & Komisi Team Marketing (10–15%)</h2>
            <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
              <table className="w-full min-w-[580px] text-left text-sm">
                <thead className="bg-stone-50"><tr>{['Marketing', 'Default %', 'Transaksi', 'Gaji pokok', 'Komisi', 'Total diterima'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                <tbody>
                  {!(d.marketingPayroll || []).length ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-stone-400">Belum ada data team marketing.</td></tr>
                  ) : (
                    d.marketingPayroll.map((m) => (
                      <tr key={m.id} className="border-t border-stone-100">
                        <td className="px-4 py-3">{m.name}</td>
                        <td className="px-4 py-3">{m.commission_percent}%</td>
                        <td className="px-4 py-3">{m.trx}</td>
                        <td className="px-4 py-3">{rupiah(m.base_salary)}</td>
                        <td className="px-4 py-3">{rupiah(m.commission)}</td>
                        <td className="px-4 py-3 font-bold text-gold-700">{rupiah(m.total_salary)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

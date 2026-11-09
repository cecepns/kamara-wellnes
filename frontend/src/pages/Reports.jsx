import { useEffect, useState } from 'react';
import { request, rupiah } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';

export default function Reports() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [d, setD] = useState(null);
  useEffect(() => { setD(null); request('get', API_ENDPOINTS.REPORTS.SUMMARY, { params: { month } }).then((r) => setD(r.data)).catch(() => {}); }, [month]);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Laporan & Gaji</h1>
        <input type="month" className="input !w-auto" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
      {!d ? <div className="h-40 animate-pulse rounded-2xl bg-stone-200" /> : (<>
        <div className="rounded-2xl border border-stone-200 bg-white p-4"><p className="text-sm text-stone-500">Omzet {d.month}</p><p className="text-3xl font-bold text-gold-700">{rupiah(d.revenue)}</p></div>
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-stone-50"><tr>{['Terapis', 'Gaji pokok', 'Komisi', 'Total gaji'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
            <tbody>{d.payroll.map((p) => <tr key={p.id} className="border-t border-stone-100"><td className="px-4 py-3">{p.name}</td><td className="px-4 py-3">{rupiah(p.base_salary)}</td><td className="px-4 py-3">{rupiah(p.commission)}</td><td className="px-4 py-3 font-bold">{rupiah(p.total_salary)}</td></tr>)}</tbody></table></div>
      </>)}
    </div>
  );
}

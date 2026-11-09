import { Pencil, Trash2, Inbox, AlertTriangle } from 'lucide-react';
export default function DataTable({ columns, rows, loading, error, onRetry, onEdit, onDelete }) {
  if (error) return <div className="flex flex-col items-center gap-2 p-10 text-stone-500"><AlertTriangle />Data gagal dimuat.<button className="btn-ghost" onClick={onRetry}>Coba lagi</button></div>;
  if (loading) return <div className="space-y-2 p-4">{[...Array(5)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-stone-100" />)}</div>;
  if (!rows.length) return <div className="flex flex-col items-center gap-2 p-10 text-stone-500"><Inbox />Belum ada data. Klik “Tambah” untuk mulai.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-stone-50 text-stone-600"><tr>{columns.map((c) => <th key={c.key} className="px-4 py-3 font-semibold">{c.label}</th>)}<th className="px-4 py-3 text-right">Aksi</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id} className="border-t border-stone-100 hover:bg-gold-50/50">
            {columns.map((c) => <td key={c.key} className="px-4 py-3">{c.render ? c.render(r[c.key], r) : r[c.key] ?? '-'}</td>)}
            <td className="px-4 py-3 text-right"><div className="flex justify-end gap-1">
              <button className="rounded p-1.5 hover:bg-stone-100" onClick={() => onEdit(r)} aria-label="Ubah"><Pencil size={16} /></button>
              <button className="rounded p-1.5 text-red-600 hover:bg-red-50" onClick={() => onDelete(r.id)} aria-label="Hapus"><Trash2 size={16} /></button></div></td>
          </tr>))}</tbody>
      </table>
    </div>
  );
}

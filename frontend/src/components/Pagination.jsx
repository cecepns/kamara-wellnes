import { ChevronLeft, ChevronRight } from 'lucide-react';
export default function Pagination({ pagination, onPage, onLimit }) {
  const { page, totalPages, total, limit } = pagination;
  const start = Math.max(1, Math.min(page - 2, totalPages - 4)), nums = [];
  for (let i = start; i <= Math.min(totalPages, start + 4); i++) nums.push(i);
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-stone-200 p-3 text-sm sm:flex-row">
      <div className="flex items-center gap-2">
        <span className="text-stone-500">{total} data · per halaman</span>
        <select className="input !w-auto !py-1" value={limit} onChange={(e) => onLimit(+e.target.value)}>
          {[10, 25, 50, 100].map((n) => <option key={n}>{n}</option>)}</select>
      </div>
      <div className="flex items-center gap-1">
        <button className="btn-ghost !px-2 !py-1" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={16} />Sebelumnya</button>
        {nums.map((n) => <button key={n} onClick={() => onPage(n)} className={`h-8 w-8 rounded-lg ${n === page ? 'bg-gold-500 font-bold text-white' : 'hover:bg-stone-100'}`}>{n}</button>)}
        <button className="btn-ghost !px-2 !py-1" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Berikutnya<ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

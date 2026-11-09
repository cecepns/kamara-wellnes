import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { request } from '@/utils/request';
import useDebounce from './useDebounce';

export default function useCrud(endpoint) {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const debounced = useDebounce(search, 300);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res = await request('get', endpoint.LIST, { params: { page, limit, search: debounced } });
      setRows(res.data); setPagination(res.pagination);
    } catch { setError(true); } finally { setLoading(false); }
  }, [endpoint, page, limit, debounced]);

  useEffect(() => { setPage(1); }, [debounced, limit]);
  useEffect(() => { load(); }, [load]);

  const save = async (form, id) => {
    await request(id ? 'put' : 'post', id ? endpoint.DETAIL(id) : endpoint.LIST, { data: form, success: id ? 'Data diperbarui' : 'Data ditambahkan' });
    load();
  };
  const remove = (id) => toast((t) => (
    <span className="flex items-center gap-3 text-sm">Hapus data ini?
      <button className="rounded bg-red-600 px-2 py-1 text-white" onClick={async () => { toast.dismiss(t.id); await request('delete', endpoint.DETAIL(id), { success: 'Data dihapus' }); load(); }}>Hapus</button>
      <button className="rounded border px-2 py-1" onClick={() => toast.dismiss(t.id)}>Batal</button>
    </span>), { duration: 8000 });

  return { rows, pagination, page, setPage, limit, setLimit, search, setSearch, loading, error, load, save, remove };
}

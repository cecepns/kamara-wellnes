import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { RESOURCES } from '@/config/resources';
import useCrud from '@/hooks/useCrud';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import ResourceForm from '@/components/ResourceForm';

export default function ResourcePage() {
  const { name } = useParams();
  const cfg = RESOURCES[name];
  if (!cfg) return <Navigate to="/" />;
  return <Inner key={name} cfg={cfg} />;
}

function Inner({ cfg }) {
  const crud = useCrud(cfg.endpoint);
  const [modal, setModal] = useState(null);
  const columns = cfg.fields.filter((f) => f.table).map((f) => ({
    key: typeof f.table === 'string' ? f.table : f.key, label: f.label, render: f.render }));
  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{cfg.title}</h1>
        <div className="flex gap-2">
          <div className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-stone-400" />
            <input className="input !pl-9" placeholder="Cari..." value={crud.search} onChange={(e) => crud.setSearch(e.target.value)} /></div>
          <button className="btn-primary" onClick={() => setModal({})}><Plus size={16} />Tambah</button></div>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white">
        <DataTable columns={columns} rows={crud.rows} loading={crud.loading} error={crud.error} onRetry={crud.load} onEdit={(r) => setModal(r)} onDelete={crud.remove} />
        <Pagination pagination={crud.pagination} onPage={crud.setPage} onLimit={crud.setLimit} />
      </div>
      <Modal open={!!modal} title={`${modal?.id ? 'Ubah' : 'Tambah'} ${cfg.title}`} onClose={() => setModal(null)}>
        {modal && <ResourceForm fields={cfg.fields} initial={modal} onCancel={() => setModal(null)}
          onSubmit={async (f) => { await crud.save(f, modal.id); setModal(null); }} />}
      </Modal>
    </div>
  );
}

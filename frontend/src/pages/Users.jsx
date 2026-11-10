import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { KeyRound, Loader2, Plus, Search } from 'lucide-react';
import useCrud from '@/hooks/useCrud';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import { API_ENDPOINTS as E } from '@/utils/endpoints';
import { request, rupiah } from '@/utils/request';

export default function Users() {
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  })();
  if (currentUser && currentUser.role !== 'admin') return <Navigate to="/" replace />;

  const crud = useCrud(E.USERS);
  const [modal, setModal] = useState(null);
  const [pwdModal, setPwdModal] = useState(null);

  const columns = [
    { key: 'name', label: 'Nama' },
    { key: 'username', label: 'Username' },
    {
      key: 'role',
      label: 'Role',
      render: (v) => (
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${v === 'admin' ? 'bg-gold-100 text-gold-700' : 'bg-stone-100 text-stone-700'}`}>
          {v === 'admin' ? 'Admin' : 'Kasir'}
        </span>
      ),
    },
    { key: 'phone', label: 'No. HP' },
    { key: 'base_salary', label: 'Gaji pokok', render: (v) => rupiah(v) },
    { key: 'created_at', label: 'Dibuat', render: (v) => (v ? String(v).slice(0, 10) : '-') },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manajemen User & Gaji Admin</h1>
          <p className="text-sm text-stone-500">Kelola akun admin & kasir, atur gaji pokok, serta ubah password</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-3 text-stone-400" />
            <input className="input !pl-9" placeholder="Cari nama atau username..." value={crud.search} onChange={(e) => crud.setSearch(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={() => setModal({ role: 'kasir', base_salary: 0 })}><Plus size={16} />Tambah User</button>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-gold-500/30 bg-gold-50/70 px-4 py-2.5 text-xs text-stone-700">
        <b>Gaji Pokok Admin &amp; Kasir:</b> Atur gaji pokok bulanan pada kolom <b>Gaji Pokok (Rp)</b> di bawah ini (di luar <b>komisi 1%</b> per transaksi). Totalnya otomatis dijumlahkan di menu <b>Laporan &amp; Gaji</b> serta <b>Rekap Karyawan</b>.
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white">
        <DataTable
          columns={columns}
          rows={crud.rows}
          loading={crud.loading}
          error={crud.error}
          onRetry={crud.load}
          onEdit={(r) => setModal(r)}
          onDelete={crud.remove}
          canDelete={(r) => r.id !== currentUser?.id}
          extraActions={(r) => (
            <button
              className="rounded p-1.5 text-gold-700 hover:bg-gold-50"
              onClick={() => setPwdModal(r)}
              aria-label="Ganti Password"
              title="Ganti Password"
            >
              <KeyRound size={16} />
            </button>
          )}
        />
        <Pagination pagination={crud.pagination} onPage={crud.setPage} onLimit={crud.setLimit} />
      </div>

      <Modal open={!!modal} title={modal?.id ? 'Ubah User' : 'Tambah User Baru'} onClose={() => setModal(null)}>
        {modal && (
          <UserForm
            initial={modal}
            isSelf={modal.id === currentUser?.id}
            onCancel={() => setModal(null)}
            onSubmit={async (f) => { await crud.save(f, modal.id); setModal(null); }}
          />
        )}
      </Modal>

      <Modal open={!!pwdModal} title={`Ganti Password · ${pwdModal?.name || ''}`} onClose={() => setPwdModal(null)}>
        {pwdModal && (
          <ResetPasswordForm
            user={pwdModal}
            onCancel={() => setPwdModal(null)}
            onDone={() => setPwdModal(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function UserForm({ initial, isSelf, onSubmit, onCancel }) {
  const isNew = !initial?.id;
  const [form, setForm] = useState({
    name: initial?.name || '',
    username: initial?.username || '',
    role: initial?.role || 'kasir',
    phone: initial?.phone || '',
    base_salary: initial?.base_salary ?? 0,
    password: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.username.trim()) return toast.error('Nama dan username wajib diisi');
    if (isNew && !form.password) return toast.error('Password wajib diisi');
    if (form.password && form.password.length < 6) return toast.error('Password minimal 6 karakter');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        username: form.username.trim(),
        role: form.role,
        phone: form.phone.trim(),
        base_salary: Math.max(Number(form.base_salary) || 0, 0),
      };
      if (form.password) payload.password = form.password;
      await onSubmit(payload);
    } catch { /* toast sudah muncul */ } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Nama *</span>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Username *</span>
          <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Role</span>
          <select className="input" disabled={isSelf} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="kasir">Kasir</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">No. HP</span>
          <input className="input" placeholder="08..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Gaji Pokok (Rp) <span className="font-normal text-stone-400">· di luar komisi 1%</span></span>
        <input type="number" min="0" className="input" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">{isNew ? 'Password *' : 'Password baru (kosongkan jika tidak diubah)'}</span>
        <input type="password" className="input" placeholder="Minimal 6 karakter" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Batal</button>
        <button className="btn-primary" disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />}Simpan</button>
      </div>
    </form>
  );
}

function ResetPasswordForm({ user, onCancel, onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('Password minimal 6 karakter');
    if (password !== confirm) return toast.error('Konfirmasi password tidak cocok');
    setSaving(true);
    try {
      await request('put', E.USERS.PASSWORD(user.id), { data: { password }, success: 'Password berhasil diubah' });
      onDone();
    } catch { /* toast sudah muncul */ } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-xs text-stone-500">Username: <b>{user.username}</b></p>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Password Baru *</span>
        <input type="password" className="input" placeholder="Minimal 6 karakter" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Konfirmasi Password Baru *</span>
        <input type="password" className="input" placeholder="Ulangi password baru" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Batal</button>
        <button className="btn-primary" disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />}Simpan Password</button>
      </div>
    </form>
  );
}

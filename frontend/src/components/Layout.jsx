import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LayoutDashboard, Menu, LogOut, X, BarChart3, ShieldCheck, KeyRound, Loader2 } from 'lucide-react';
import { RESOURCES, GROUPS } from '@/config/resources';
import { API_ENDPOINTS as E } from '@/utils/endpoints';
import { request } from '@/utils/request';
import Modal from './Modal';

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });
  const nav = useNavigate();

  useEffect(() => {
    request('get', E.AUTH.PROFILE)
      .then((res) => {
        if (res?.data) {
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        }
      })
      .catch(() => {});
  }, []);

  const link = ({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-gold-500 font-semibold text-white' : 'text-stone-300 hover:bg-white/10'}`;
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    nav('/login');
  };

  return (
    <div className="min-h-screen lg:flex">
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-ink-800 p-4 transition-transform duration-300 lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-4 flex items-center justify-between"><img src="/logo.png" alt="Kamara Wellness" className="h-16 rounded-lg" />
          <button className="text-white lg:hidden" onClick={() => setOpen(false)}><X /></button></div>
        <nav className="flex-1 space-y-4 overflow-y-auto" onClick={() => setOpen(false)}>
          <NavLink to="/" end className={link}><LayoutDashboard size={18} />Dashboard</NavLink>
          {GROUPS.map((g) => (
            <div key={g} className="space-y-1">
              <p className="px-3 text-xs text-stone-500">{g}</p>
              {Object.entries(RESOURCES).filter(([, r]) => r.group === g).map(([k, r]) => (
                <NavLink key={k} to={`/${k}`} className={link}><r.icon size={18} />{r.title}</NavLink>
              ))}
            </div>
          ))}
          <NavLink to="/laporan" className={link}><BarChart3 size={18} />Laporan & Gaji</NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/users" className={link}><ShieldCheck size={18} />Manajemen User</NavLink>
          )}
        </nav>

        <div className="mt-3 space-y-1 border-t border-white/10 pt-3">
          {user && (
            <div className="px-3 py-1.5 text-xs text-stone-400">
              <p className="truncate font-semibold text-white">{user.name}</p>
              <p className="capitalize">{user.username} · {user.role || 'admin'}</p>
            </div>
          )}
          <button onClick={() => setPwdOpen(true)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-300 hover:bg-white/10">
            <KeyRound size={18} />Ganti Password
          </button>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-300 hover:bg-white/10">
            <LogOut size={18} />Keluar
          </button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Menu"><Menu /></button><span className="font-bold">Kamara Wellness</span></header>
        <main className="p-4 lg:p-8"><Outlet /></main>
      </div>

      <Modal open={pwdOpen} title="Ganti Password Saya" onClose={() => setPwdOpen(false)}>
        {pwdOpen && <ChangeOwnPasswordForm onClose={() => setPwdOpen(false)} />}
      </Modal>
    </div>
  );
}

function ChangeOwnPasswordForm({ onClose }) {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.current_password || !form.new_password) return toast.error('Semua field password wajib diisi');
    if (form.new_password.length < 6) return toast.error('Password baru minimal 6 karakter');
    if (form.new_password !== form.confirm) return toast.error('Konfirmasi password baru tidak cocok');
    setSaving(true);
    try {
      await request('put', E.AUTH.PASSWORD, {
        data: { current_password: form.current_password, new_password: form.new_password },
        success: 'Password berhasil diperbarui',
      });
      onClose();
    } catch { /* toast sudah muncul */ } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Password Lama *</span>
        <input type="password" className="input" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} autoFocus />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Password Baru *</span>
        <input type="password" className="input" placeholder="Minimal 6 karakter" value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Konfirmasi Password Baru *</span>
        <input type="password" className="input" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
        <button className="btn-primary" disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />}Simpan Password</button>
      </div>
    </form>
  );
}

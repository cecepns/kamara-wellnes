import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Menu, LogOut, X, BarChart3 } from 'lucide-react';
import { RESOURCES, GROUPS } from '@/config/resources';

export default function Layout() {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const link = ({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-gold-500 font-semibold text-white' : 'text-stone-300 hover:bg-white/10'}`;
  const logout = () => { localStorage.removeItem('token'); nav('/login'); };
  return (
    <div className="min-h-screen lg:flex">
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-ink-800 p-4 transition-transform duration-300 lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-4 flex items-center justify-between"><img src="/logo.png" alt="Kamara Wellness" className="h-16 rounded-lg" />
          <button className="text-white lg:hidden" onClick={() => setOpen(false)}><X /></button></div>
        <nav className="flex-1 space-y-4 overflow-y-auto" onClick={() => setOpen(false)}>
          <NavLink to="/" end className={link}><LayoutDashboard size={18} />Dashboard</NavLink>
          {GROUPS.map((g) => (<div key={g} className="space-y-1"><p className="px-3 text-xs text-stone-500">{g}</p>
            {Object.entries(RESOURCES).filter(([, r]) => r.group === g).map(([k, r]) => <NavLink key={k} to={`/${k}`} className={link}><r.icon size={18} />{r.title}</NavLink>)}</div>))}
          <NavLink to="/laporan" className={link}><BarChart3 size={18} />Laporan & Gaji</NavLink>
        </nav>
        <button onClick={logout} className="mt-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-300 hover:bg-white/10"><LogOut size={18} />Keluar</button>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Menu"><Menu /></button><span className="font-bold">Kamara Wellness</span></header>
        <main className="p-4 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}

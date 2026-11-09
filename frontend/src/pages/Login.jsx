import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const submit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return toast.error('Username dan password wajib diisi');
    setLoading(true);
    try { const res = await request('post', API_ENDPOINTS.AUTH.LOGIN, { data: form }); localStorage.setItem('token', res.data.token); nav('/'); }
    catch { /* toast sudah muncul */ } finally { setLoading(false); }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-800 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6">
        <img src="/logo.png" alt="Kamara Wellness" className="mx-auto h-28" />
        <input className="input" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input className="input" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn-primary w-full" disabled={loading}>{loading && <Loader2 size={16} className="animate-spin" />}Masuk</button>
      </form>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Download, Loader2, X } from 'lucide-react';
import { request } from '@/utils/request';
import { API_ENDPOINTS } from '@/utils/endpoints';
import { getInstallPrompt, isStandalone, subscribeInstallPrompt, triggerInstallPrompt } from '@/utils/pwaInstall';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(() => getInstallPrompt());
  const [showInstallPopup, setShowInstallPopup] = useState(false);
  const [installing, setInstalling] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    if (isStandalone()) return;
    return subscribeInstallPrompt((promptEvent) => {
      setInstallPrompt(promptEvent);
      if (promptEvent) setShowInstallPopup(true);
      else setShowInstallPopup(false);
    });
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const choice = await triggerInstallPrompt();
      if (choice?.outcome === 'accepted') {
        toast.success('Aplikasi Kamara Wellness sedang dipasang');
      }
      setShowInstallPopup(false);
    } catch {
      /* abaikan jika dibatalkan browser */
    } finally {
      setInstalling(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return toast.error('Username dan password wajib diisi');
    setLoading(true);
    try {
      const res = await request('post', API_ENDPOINTS.AUTH.LOGIN, { data: form });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      nav('/');
    } catch { /* toast sudah muncul */ } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-800 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <img src="/logo.png" alt="Kamara Wellness" className="mx-auto h-28" />
        <input className="input" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input className="input" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn-primary w-full" disabled={loading}>{loading && <Loader2 size={16} className="animate-spin" />}Masuk</button>
        {installPrompt && !isStandalone() && (
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className="btn-ghost w-full !border-gold-500/40 !text-gold-700 hover:!bg-gold-50"
          >
            <Download size={16} />
            Install Aplikasi
          </button>
        )}
      </form>

      {showInstallPopup && installPrompt && !isStandalone() && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => setShowInstallPopup(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img src="/pwa-192x192.png" alt="Kamara Wellness" className="h-12 w-12 rounded-xl border border-stone-200 object-contain" />
                <div>
                  <h2 className="text-base font-bold text-ink-900">Install Kamara Wellness</h2>
                  <p className="text-xs text-stone-500">Pasang aplikasi langsung di perangkat Anda untuk akses lebih cepat.</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowInstallPopup(false)} className="text-stone-400 hover:text-stone-700" aria-label="Tutup">
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" className="btn-ghost flex-1" onClick={() => setShowInstallPopup(false)}>
                Nanti
              </button>
              <button type="button" className="btn-primary flex-1" disabled={installing} onClick={handleInstall}>
                {installing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Install Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

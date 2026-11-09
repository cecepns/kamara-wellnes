import { useEffect, useMemo, useRef, useState } from 'react';
import CreatableSelect from 'react-select/creatable';
import toast from 'react-hot-toast';
import { Loader2, UserPlus, X } from 'lucide-react';
import useDebounce from '@/hooks/useDebounce';
import { request } from '@/utils/request';
import { API_ENDPOINTS as E } from '@/utils/endpoints';

const formatCustomer = (c) => ({
  value: c.id,
  label: c.phone ? `${c.name} (${c.phone})` : c.name,
  customer: c,
});

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '38px',
    borderRadius: '0.5rem',
    borderColor: state.isFocused ? '#ae9142' : '#d6d3d1',
    boxShadow: state.isFocused ? '0 0 0 2px #f1e8c8' : 'none',
    fontSize: '0.875rem',
    backgroundColor: '#ffffff',
    '&:hover': { borderColor: state.isFocused ? '#ae9142' : '#a8a29e' },
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.5rem',
    border: '1px solid #e7e5e4',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
    fontSize: '0.875rem',
    overflow: 'hidden',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#ae9142' : state.isFocused ? '#faf6ea' : '#ffffff',
    color: state.isSelected ? '#ffffff' : '#151d1b',
    cursor: 'pointer',
  }),
  placeholder: (base) => ({ ...base, color: '#a8a29e' }),
  singleValue: (base) => ({ ...base, color: '#151d1b' }),
};

export default function CustomerSelect({ value, initialLabel, required, onChange }) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [options, setOptions] = useState([]);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', member_level: 'Reguler', address: '' });
  const reqIdRef = useRef(0);

  useEffect(() => {
    const id = ++reqIdRef.current;
    let active = true;
    setLoading(true);
    request('get', E.CUSTOMERS.LIST, { params: { search: debouncedSearch, limit: 20 } })
      .then((res) => {
        if (!active || id !== reqIdRef.current) return;
        setOptions((res.data || []).map(formatCustomer));
      })
      .catch(() => {})
      .finally(() => {
        if (active && id === reqIdRef.current) setLoading(false);
      });
    return () => { active = false; };
  }, [debouncedSearch]);

  useEffect(() => {
    if (!value) {
      setSelectedOpt(null);
      return;
    }
    const found = options.find((o) => String(o.value) === String(value));
    if (found) {
      setSelectedOpt(found);
      return;
    }
    if (selectedOpt && String(selectedOpt.value) === String(value)) return;
    if (initialLabel) {
      setSelectedOpt({ value, label: initialLabel });
      return;
    }
    let active = true;
    request('get', E.CUSTOMERS.DETAIL(value))
      .then((res) => {
        if (active && res.data) setSelectedOpt(formatCustomer(res.data));
      })
      .catch(() => {});
    return () => { active = false; };
  }, [value, initialLabel, options]);

  const mergedOptions = useMemo(() => {
    if (!selectedOpt) return options;
    if (options.some((o) => String(o.value) === String(selectedOpt.value))) return options;
    return [selectedOpt, ...options];
  }, [options, selectedOpt]);

  const openQuickAdd = (seed = '') => {
    const trimmed = seed.trim();
    const isPhone = /^[\d+\s-]{3,}$/.test(trimmed);
    setNewCustomer({
      name: isPhone ? '' : trimmed,
      phone: isPhone ? trimmed : '',
      member_level: 'Reguler',
      address: '',
    });
    setShowAdd(true);
  };

  const handleQuickSave = async () => {
    const name = newCustomer.name.trim();
    if (!name) return toast.error('Nama pelanggan wajib diisi');
    setSavingNew(true);
    try {
      const payload = {
        name,
        phone: newCustomer.phone.trim(),
        member_level: newCustomer.member_level || 'Reguler',
        address: newCustomer.address.trim(),
      };
      const res = await request('post', E.CUSTOMERS.LIST, { data: payload, success: 'Pelanggan ditambahkan' });
      const created = { id: res.data.id, ...payload };
      const opt = formatCustomer(created);
      setOptions((prev) => [opt, ...prev.filter((o) => String(o.value) !== String(opt.value))]);
      setSelectedOpt(opt);
      onChange(created.id, opt.label);
      setShowAdd(false);
      setSearch('');
    } catch {
      /* toast sudah ditangani request() */
    } finally {
      setSavingNew(false);
    }
  };

  const handleQuickKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleQuickSave();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <CreatableSelect
            value={selectedOpt}
            options={mergedOptions}
            isLoading={loading}
            isClearable={!required}
            filterOption={() => true}
            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            menuPosition="fixed"
            styles={selectStyles}
            placeholder="Cari nama atau no. HP pelanggan..."
            loadingMessage={() => 'Mencari pelanggan...'}
            noOptionsMessage={({ inputValue }) => (loading ? 'Mencari pelanggan...' : inputValue ? 'Pelanggan tidak ditemukan' : 'Ketik nama atau no. HP')}
            formatCreateLabel={(inputValue) => `+ Tambah pelanggan "${inputValue}"`}
            onInputChange={(val, meta) => {
              if (meta.action === 'input-change') setSearch(val);
              else if (meta.action === 'menu-close' || meta.action === 'set-value') setSearch('');
            }}
            onChange={(opt) => {
              setSelectedOpt(opt || null);
              onChange(opt ? opt.value : null, opt ? opt.label : '');
            }}
            onCreateOption={(inputValue) => openQuickAdd(inputValue)}
          />
        </div>
        <button
          type="button"
          className="btn-ghost shrink-0 !px-3 !py-2 text-xs"
          onClick={() => (showAdd ? setShowAdd(false) : openQuickAdd(search))}
          title="Tambah pelanggan baru"
        >
          {showAdd ? <X size={15} /> : <UserPlus size={15} />}
          <span>{showAdd ? 'Tutup' : 'Baru'}</span>
        </button>
      </div>

      {showAdd && (
        <div className="space-y-2.5 rounded-xl border border-gold-500/40 bg-gold-50/60 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-gold-700">Tambah Pelanggan Baru</span>
            <button type="button" className="text-stone-400 hover:text-stone-700" onClick={() => setShowAdd(false)} aria-label="Tutup form pelanggan">
              <X size={15} />
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <span className="mb-1 block text-xs font-medium text-stone-700">Nama *</span>
              <input
                type="text"
                className="input !py-1.5"
                placeholder="Nama pelanggan"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer((p) => ({ ...p, name: e.target.value }))}
                onKeyDown={handleQuickKeyDown}
                autoFocus
              />
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium text-stone-700">No. WhatsApp</span>
              <input
                type="text"
                className="input !py-1.5"
                placeholder="08..."
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer((p) => ({ ...p, phone: e.target.value }))}
                onKeyDown={handleQuickKeyDown}
              />
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium text-stone-700">Member</span>
              <select
                className="input !py-1.5"
                value={newCustomer.member_level}
                onChange={(e) => setNewCustomer((p) => ({ ...p, member_level: e.target.value }))}
              >
                <option value="Reguler">Reguler</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
              </select>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium text-stone-700">Alamat</span>
              <input
                type="text"
                className="input !py-1.5"
                placeholder="Opsional"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer((p) => ({ ...p, address: e.target.value }))}
                onKeyDown={handleQuickKeyDown}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setShowAdd(false)}>
              Batal
            </button>
            <button type="button" className="btn-primary !px-3 !py-1.5 text-xs" disabled={savingNew} onClick={handleQuickSave}>
              {savingNew && <Loader2 size={14} className="animate-spin" />}
              Simpan Pelanggan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


import toast from 'react-hot-toast';
import { api } from './api';
export const errorMessage = (e) => e.response?.data?.message || 'Gagal terhubung ke server';
export const request = async (method, url, { data, params, success } = {}) => {
  try {
    const res = await api.request({ method, url, data, params });
    if (success) toast.success(success);
    return res.data;
  } catch (e) { toast.error(errorMessage(e)); throw e; }
};
export const rupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
export const waLink = (phone, text) => `https://wa.me/${(phone || '').replace(/^0/, '62').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;

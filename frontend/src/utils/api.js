import axios from 'axios';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "https://api.kingcreativestudio.my.id/kamara-wellnes/api" });
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
api.interceptors.response.use((r) => r, (err) => {
  if (err.response?.status === 401 && !err.config.url.includes('/auth/login')) { localStorage.removeItem('token'); window.location.href = '/login'; }
  return Promise.reject(err);
});

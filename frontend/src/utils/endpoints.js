const crud = (path) => ({ LIST: path, DETAIL: (id) => `${path}/${id}` });
export const API_ENDPOINTS = {
  AUTH: { LOGIN: '/auth/login', REGISTER: '/auth/register', PROFILE: '/auth/profile', PASSWORD: '/auth/password' },
  OPTIONS: { STAFF: '/options/staff' },
  REPORTS: { SUMMARY: '/reports/summary' },
  USERS: { ...crud('/users'), PASSWORD: (id) => `/users/${id}/password` },
  CUSTOMERS: crud('/customers'),
  SERVICES: crud('/services'),
  THERAPISTS: crud('/therapists'),
  MARKETERS: crud('/marketers'),
  PROMOS: crud('/promos'),
  PRODUCTS: crud('/products'),
  BOOKINGS: crud('/bookings'),
  TRANSACTIONS: crud('/transactions'),
  ATTENDANCE: crud('/attendance'),
  MEDICAL_RECORDS: crud('/medical-records'),
};

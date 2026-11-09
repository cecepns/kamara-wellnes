const crud = (path) => ({ LIST: path, DETAIL: (id) => `${path}/${id}` });
export const API_ENDPOINTS = {
  AUTH: { LOGIN: '/auth/login', REGISTER: '/auth/register', PROFILE: '/auth/profile' },
  REPORTS: { SUMMARY: '/reports/summary' },
  CUSTOMERS: crud('/customers'),
  SERVICES: crud('/services'),
  THERAPISTS: crud('/therapists'),
  PROMOS: crud('/promos'),
  PRODUCTS: crud('/products'),
  BOOKINGS: crud('/bookings'),
  TRANSACTIONS: crud('/transactions'),
  ATTENDANCE: crud('/attendance'),
  MEDICAL_RECORDS: crud('/medical-records'),
};

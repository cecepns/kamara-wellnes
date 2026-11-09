import { Users, Sparkles, UserCog, Tag, Package, CalendarCheck, ReceiptText, Clock, ClipboardList, Megaphone } from 'lucide-react';
import { API_ENDPOINTS as E } from '@/utils/endpoints';
import { rupiah } from '@/utils/request';

const opt = (arr) => arr.map((v) => ({ value: v, label: v }));
const yn = [{ value: 1, label: 'Aktif' }, { value: 0, label: 'Nonaktif' }];
const sel = (key, label, ref, extra = {}) => ({ key, label, type: 'select', ref, ...extra });
const money = (v) => rupiah(v);

export const GROUPS = ['Operasional', 'Pasien', 'Data master'];
export const RESOURCES = {
  bookings: { title: 'Booking', group: 'Operasional', icon: CalendarCheck, endpoint: E.BOOKINGS, fields: [
    sel('customer_id', 'Pelanggan', 'customers', { required: true, table: 'customer_name' }),
    sel('service_id', 'Layanan', 'services', { required: true, table: 'service_name' }),
    sel('therapist_id', 'Terapis', 'therapists', { table: 'therapist_name' }),
    { key: 'booking_date', label: 'Tanggal', type: 'date', required: true, table: true },
    { key: 'booking_time', label: 'Jam', type: 'time', required: true, table: true },
    { key: 'status', label: 'Status', type: 'select', options: opt(['Menunggu', 'Dikonfirmasi', 'Selesai', 'Batal']), table: true },
    { key: 'notes', label: 'Catatan', type: 'textarea' }] },
  transactions: { title: 'Kasir', group: 'Operasional', icon: ReceiptText, endpoint: E.TRANSACTIONS, fields: [
    { key: 'trx_date', label: 'Tanggal', type: 'date', required: true, table: true },
    { key: 'customer_id', label: 'Pelanggan', type: 'customer-select', table: 'customer_name' },
    sel('service_id', 'Layanan', 'services', { required: true, table: 'service_name' }),
    sel('therapist_id', 'Terapis', 'therapists', { table: 'therapist_name' }),
    { key: 'admin_id', label: 'Admin (1%)', type: 'hidden', table: 'admin_name' },
    { key: 'marketing_id', label: 'Marketing', type: 'hidden', table: 'marketing_name' },
    { key: 'price', label: 'Harga (kosong = harga layanan)', type: 'number' },
    { key: 'discount', label: 'Diskon / promo (Rp)', type: 'number' },
    { key: 'total', label: 'Total', type: 'hidden', table: true, render: money },
    { key: 'commission', label: 'Komisi Terapis', type: 'hidden', table: true, render: money },
    { key: 'admin_commission', label: 'Komisi Admin', type: 'hidden', table: true, render: money },
    { key: 'marketing_commission', label: 'Komisi Marketing', type: 'hidden', table: true, render: (v, r) => (r.marketing_id ? `${money(v)} (${r.marketing_percent || 0}%)` : '-') },
    { key: 'payment_method', label: 'Pembayaran', type: 'select', options: opt(['Tunai', 'Transfer', 'QRIS']), table: true }] },
  attendance: { title: 'Absensi', group: 'Operasional', icon: Clock, endpoint: E.ATTENDANCE, fields: [
    sel('therapist_id', 'Terapis', 'therapists', { required: true, table: 'therapist_name' }),
    { key: 'att_date', label: 'Tanggal', type: 'date', required: true, table: true },
    { key: 'check_in', label: 'Masuk', type: 'time', table: true }, { key: 'check_out', label: 'Pulang', type: 'time', table: true },
    { key: 'status', label: 'Status', type: 'select', options: opt(['Hadir', 'Izin', 'Sakit', 'Alpha']), table: true }] },
  products: { title: 'Stok', group: 'Operasional', icon: Package, endpoint: E.PRODUCTS, fields: [
    { key: 'name', label: 'Nama barang', required: true, table: true }, { key: 'unit', label: 'Satuan', table: true },
    { key: 'stock', label: 'Stok', type: 'number', table: true }, { key: 'min_stock', label: 'Stok minimum', type: 'number', table: true },
    { key: 'price', label: 'Harga', type: 'number', table: true, render: money }] },
  customers: { title: 'Pelanggan & Member', group: 'Pasien', icon: Users, endpoint: E.CUSTOMERS, fields: [
    { key: 'name', label: 'Nama', required: true, table: true }, { key: 'phone', label: 'No. WhatsApp', table: true },
    { key: 'member_level', label: 'Member', type: 'select', options: opt(['Reguler', 'Silver', 'Gold']), table: true },
    { key: 'points', label: 'Poin', type: 'number', table: true }, { key: 'birth_date', label: 'Tanggal lahir', type: 'date' },
    { key: 'address', label: 'Alamat' }, { key: 'notes', label: 'Catatan', type: 'textarea' }] },
  'medical-records': { title: 'Rekam Medis', group: 'Pasien', icon: ClipboardList, endpoint: E.MEDICAL_RECORDS, fields: [
    sel('customer_id', 'Pasien', 'customers', { required: true, table: 'customer_name' }),
    { key: 'visit_date', label: 'Tanggal kunjungan', type: 'date', required: true, table: true },
    { key: 'complaint', label: 'Keluhan', type: 'textarea', table: true }, { key: 'diagnosis', label: 'Diagnosa', type: 'textarea', table: true },
    { key: 'treatment', label: 'Tindakan', type: 'textarea' },
    { key: 'blood_sugar', label: 'Gula darah (mg/dL)' }, { key: 'uric_acid', label: 'Asam urat (mg/dL)' }, { key: 'blood_pressure', label: 'Tekanan darah' }] },
  services: { title: 'Layanan', group: 'Data master', icon: Sparkles, endpoint: E.SERVICES, fields: [
    { key: 'name', label: 'Nama layanan', required: true, table: true }, { key: 'category', label: 'Kategori', table: true },
    { key: 'price', label: 'Harga', type: 'number', required: true, table: true, render: money },
    { key: 'promo_price', label: 'Harga promo', type: 'number', table: true, render: (v) => (v ? rupiah(v) : '-') },
    { key: 'commission_percent', label: 'Komisi terapis (%)', type: 'number', table: true },
    { key: 'active', label: 'Status', type: 'select', options: yn }] },
  therapists: { title: 'Terapis', group: 'Data master', icon: UserCog, endpoint: E.THERAPISTS, fields: [
    { key: 'name', label: 'Nama', required: true, table: true }, { key: 'phone', label: 'No. HP', table: true },
    { key: 'base_salary', label: 'Gaji pokok', type: 'number', table: true, render: money }, { key: 'active', label: 'Status', type: 'select', options: yn }] },
  marketers: { title: 'Team Marketing', group: 'Data master', icon: Megaphone, endpoint: E.MARKETERS, fields: [
    { key: 'name', label: 'Nama', required: true, table: true },
    { key: 'phone', label: 'No. HP', table: true },
    { key: 'commission_percent', label: 'Komisi default (10–15%)', type: 'number', min: 10, max: 15, step: 0.5, default: 10, required: true, table: true, render: (v) => `${v ?? 10}%` },
    { key: 'base_salary', label: 'Gaji pokok', type: 'number', default: 0, table: true, render: money },
    { key: 'active', label: 'Status', type: 'select', options: yn, default: 1 }] },
  promos: { title: 'Promo', group: 'Data master', icon: Tag, endpoint: E.PROMOS, fields: [
    { key: 'name', label: 'Nama promo', required: true, table: true },
    { key: 'discount_type', label: 'Jenis', type: 'select', options: opt(['persen', 'nominal']), table: true },
    { key: 'discount_value', label: 'Nilai diskon', type: 'number', required: true, table: true },
    { key: 'start_date', label: 'Mulai', type: 'date', table: true }, { key: 'end_date', label: 'Selesai', type: 'date', table: true },
    { key: 'active', label: 'Status', type: 'select', options: yn }] },
};

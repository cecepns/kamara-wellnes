import { useState } from 'react';
import { Printer, Receipt, FileText } from 'lucide-react';
import Modal from './Modal';
import { rupiah } from '@/utils/request';

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const formatDateId = (dateStr) => {
  if (!dateStr) return '-';
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  if (!y || !m || !d) return dateStr;
  return `${String(d).padStart(2, '0')} ${months[m - 1]} ${y}`;
};

const invoiceNumber = (trx) => {
  const datePart = String(trx?.trx_date || '').slice(0, 10).replace(/-/g, '') || '00000000';
  return `INV-${datePart}-${String(trx?.id || 0).padStart(4, '0')}`;
};

function buildA4Html(trx, logoUrl) {
  const invNo = invoiceNumber(trx);
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>${esc(invNo)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; color: #151d1b; margin: 0; padding: 0; font-size: 13px; }
  .wrap { max-width: 720px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ae9142; padding-bottom: 14px; margin-bottom: 18px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand img { height: 52px; width: auto; object-fit: contain; }
  .brand h1 { margin: 0; font-size: 20px; color: #1f2927; }
  .brand p { margin: 2px 0 0; font-size: 12px; color: #78716c; }
  .inv-meta { text-align: right; }
  .inv-badge { display: inline-block; font-size: 18px; font-weight: 800; color: #7a6a2d; letter-spacing: 0.08em; }
  .inv-meta p { margin: 3px 0 0; font-size: 12px; color: #57534e; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; background: #faf6ea; border: 1px solid #f1e8c8; border-radius: 10px; padding: 12px 14px; }
  .info-grid p { margin: 3px 0; font-size: 12px; }
  .label { color: #78716c; display: inline-block; min-width: 92px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #1f2927; color: #fff; text-align: left; padding: 10px 12px; font-size: 12px; }
  td { padding: 10px 12px; border-bottom: 1px solid #e7e5e4; }
  .right { text-align: right; }
  .totals { width: 280px; margin-left: auto; border-top: 1px solid #d6d3d1; padding-top: 8px; }
  .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .totals-row.grand { font-size: 16px; font-weight: 800; color: #7a6a2d; border-top: 2px solid #ae9142; margin-top: 6px; padding-top: 8px; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px dashed #d6d3d1; text-align: center; font-size: 12px; color: #78716c; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="brand">
        <img src="${esc(logoUrl)}" alt="Kamara Wellness" />
        <div>
          <h1>Kamara Wellness</h1>
          <p>by Akupunktur Banda Aceh</p>
        </div>
      </div>
      <div class="inv-meta">
        <div class="inv-badge">INVOICE</div>
        <p><b>${esc(invNo)}</b></p>
        <p>Tanggal: ${esc(formatDateId(trx.trx_date))}</p>
      </div>
    </div>

    <div class="info-grid">
      <div>
        <p><span class="label">Pelanggan:</span> <b>${esc(trx.customer_name || 'Pelanggan Umum')}</b></p>
        <p><span class="label">No. WhatsApp:</span> ${esc(trx.customer_phone || '-')}</p>
      </div>
      <div>
        <p><span class="label">Terapis:</span> ${esc(trx.therapist_name || '-')}</p>
        <p><span class="label">Kasir / Admin:</span> ${esc(trx.admin_name || '-')}</p>
        <p><span class="label">Pembayaran:</span> <b>${esc(trx.payment_method || 'Tunai')}</b></p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Layanan</th>
          <th class="right">Harga</th>
          <th class="right">Diskon</th>
          <th class="right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><b>${esc(trx.service_name || '-')}</b></td>
          <td class="right">${esc(rupiah(trx.price))}</td>
          <td class="right">${Number(trx.discount) > 0 ? '-' + esc(rupiah(trx.discount)) : 'Rp 0'}</td>
          <td class="right"><b>${esc(rupiah(trx.total))}</b></td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row"><span>Harga Layanan</span><span>${esc(rupiah(trx.price))}</span></div>
      <div class="totals-row"><span>Diskon / Promo</span><span>${Number(trx.discount) > 0 ? '-' + esc(rupiah(trx.discount)) : 'Rp 0'}</span></div>
      <div class="totals-row grand"><span>Total Bayar</span><span>${esc(rupiah(trx.total))}</span></div>
    </div>

    <div class="footer">
      Terima kasih atas kunjungan Anda di Kamara Wellness. Semoga sehat selalu!
    </div>
  </div>
</body>
</html>`;
}

function buildThermalHtml(trx, widthMm) {
  const invNo = invoiceNumber(trx);
  const paperWidth = widthMm === '58mm' ? '58mm' : '80mm';
  const contentWidth = widthMm === '58mm' ? '52mm' : '72mm';
  const fontSize = widthMm === '58mm' ? '10.5px' : '12px';

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>${esc(invNo)}</title>
<style>
  @page { size: ${paperWidth} auto; margin: 2mm; }
  * { box-sizing: border-box; }
  body {
    width: ${contentWidth};
    margin: 0 auto;
    padding: 2mm 0;
    font-family: 'Courier New', Courier, monospace;
    font-size: ${fontSize};
    line-height: 1.35;
    color: #000;
  }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .title { font-size: 1.15em; font-weight: 700; letter-spacing: 0.04em; }
  .sub { font-size: 0.9em; }
  .hr { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 6px; margin: 2px 0; }
  .row span:last-child { text-align: right; white-space: nowrap; }
  .total { font-size: 1.12em; font-weight: 700; margin-top: 3px; }
  .foot { margin-top: 8px; font-size: 0.9em; text-align: center; }
</style>
</head>
<body>
  <div class="center">
    <div class="title">KAMARA WELLNESS</div>
    <div class="sub">Akupunktur Banda Aceh</div>
  </div>
  <div class="hr"></div>
  <div class="row"><span>No</span><span>${esc(invNo)}</span></div>
  <div class="row"><span>Tgl</span><span>${esc(formatDateId(trx.trx_date))}</span></div>
  <div class="row"><span>Pelanggan</span><span>${esc(trx.customer_name || 'Umum')}</span></div>
  ${trx.therapist_name ? `<div class="row"><span>Terapis</span><span>${esc(trx.therapist_name)}</span></div>` : ''}
  ${trx.admin_name ? `<div class="row"><span>Kasir</span><span>${esc(trx.admin_name)}</span></div>` : ''}
  <div class="hr"></div>
  <div class="bold">${esc(trx.service_name || '-')}</div>
  <div class="row"><span>Harga</span><span>${esc(rupiah(trx.price))}</span></div>
  ${Number(trx.discount) > 0 ? `<div class="row"><span>Diskon</span><span>-${esc(rupiah(trx.discount))}</span></div>` : ''}
  <div class="hr"></div>
  <div class="row total"><span>TOTAL</span><span>${esc(rupiah(trx.total))}</span></div>
  <div class="row"><span>Bayar</span><span>${esc(trx.payment_method || 'Tunai')}</span></div>
  <div class="hr"></div>
  <div class="foot">
    Terima kasih atas kunjungan Anda.<br/>
    Semoga sehat selalu!
  </div>
</body>
</html>`;
}

export default function InvoiceModal({ trx, onClose }) {
  const [mode, setMode] = useState('a4');
  if (!trx) return null;
  const invNo = invoiceNumber(trx);

  const handlePrint = () => {
    const logoUrl = `${window.location.origin}/logo.png`;
    const html = mode === 'a4' ? buildA4Html(trx, logoUrl) : buildThermalHtml(trx, mode);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    let printed = false;
    const triggerPrint = () => {
      if (printed) return;
      printed = true;
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1500);
    };

    iframe.onload = () => setTimeout(triggerPrint, 120);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(triggerPrint, 450);
    }
  };

  return (
    <Modal open={!!trx} title={`Cetak Invoice · ${invNo}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'a4', label: 'Print Biasa (A4)', icon: FileText },
            { id: '58mm', label: 'Print Termal 58mm', icon: Receipt },
            { id: '80mm', label: 'Print Termal 80mm', icon: Receipt },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={`btn !px-3 !py-1.5 text-xs ${mode === id ? 'bg-gold-500 text-white' : 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-50'}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-stone-200 bg-stone-100 p-4">
          {mode === 'a4' ? (
            <div className="mx-auto max-w-lg rounded-lg border border-stone-200 bg-white p-5 text-xs shadow-sm">
              <div className="flex items-center justify-between border-b-2 border-gold-500 pb-3">
                <div className="flex items-center gap-2.5">
                  <img src="/logo.png" alt="Kamara Wellness" className="h-10 w-auto" />
                  <div>
                    <p className="text-sm font-bold text-ink-900">Kamara Wellness</p>
                    <p className="text-[11px] text-stone-500">by Akupunktur Banda Aceh</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold tracking-wider text-gold-700">INVOICE</p>
                  <p className="font-semibold text-ink-800">{invNo}</p>
                  <p className="text-[11px] text-stone-500">{formatDateId(trx.trx_date)}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-2 rounded-lg bg-gold-50/70 p-2.5 sm:grid-cols-2">
                <div>
                  <p><span className="text-stone-500">Pelanggan:</span> <b>{trx.customer_name || 'Pelanggan Umum'}</b></p>
                  <p><span className="text-stone-500">WhatsApp:</span> {trx.customer_phone || '-'}</p>
                </div>
                <div>
                  <p><span className="text-stone-500">Terapis:</span> {trx.therapist_name || '-'}</p>
                  <p><span className="text-stone-500">Kasir:</span> {trx.admin_name || '-'}</p>
                  <p><span className="text-stone-500">Bayar:</span> <b>{trx.payment_method || 'Tunai'}</b></p>
                </div>
              </div>

              <table className="mt-3 w-full text-left">
                <thead>
                  <tr className="bg-ink-800 text-white">
                    <th className="px-2.5 py-1.5">Layanan</th>
                    <th className="px-2.5 py-1.5 text-right">Harga</th>
                    <th className="px-2.5 py-1.5 text-right">Diskon</th>
                    <th className="px-2.5 py-1.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-stone-200">
                    <td className="px-2.5 py-2 font-medium">{trx.service_name || '-'}</td>
                    <td className="px-2.5 py-2 text-right">{rupiah(trx.price)}</td>
                    <td className="px-2.5 py-2 text-right">{Number(trx.discount) > 0 ? `-${rupiah(trx.discount)}` : 'Rp 0'}</td>
                    <td className="px-2.5 py-2 text-right font-bold">{rupiah(trx.total)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-3 flex justify-end">
                <div className="w-52 space-y-1 border-t border-stone-200 pt-2">
                  <div className="flex justify-between"><span>Harga</span><span>{rupiah(trx.price)}</span></div>
                  <div className="flex justify-between"><span>Diskon</span><span>{Number(trx.discount) > 0 ? `-${rupiah(trx.discount)}` : 'Rp 0'}</span></div>
                  <div className="flex justify-between border-t border-gold-500 pt-1 text-sm font-bold text-gold-700">
                    <span>Total Bayar</span><span>{rupiah(trx.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={`mx-auto rounded bg-white p-3 font-mono text-[11px] leading-relaxed text-black shadow-sm ${mode === '58mm' ? 'max-w-[230px]' : 'max-w-[300px]'}`}>
              <div className="text-center">
                <p className="text-xs font-bold tracking-wide">KAMARA WELLNESS</p>
                <p className="text-[10px]">Akupunktur Banda Aceh</p>
              </div>
              <div className="my-1.5 border-t border-dashed border-black" />
              <div className="flex justify-between"><span>No</span><span>{invNo}</span></div>
              <div className="flex justify-between"><span>Tgl</span><span>{formatDateId(trx.trx_date)}</span></div>
              <div className="flex justify-between"><span>Pelanggan</span><span className="truncate pl-2">{trx.customer_name || 'Umum'}</span></div>
              {trx.therapist_name && <div className="flex justify-between"><span>Terapis</span><span>{trx.therapist_name}</span></div>}
              {trx.admin_name && <div className="flex justify-between"><span>Kasir</span><span>{trx.admin_name}</span></div>}
              <div className="my-1.5 border-t border-dashed border-black" />
              <p className="font-bold">{trx.service_name || '-'}</p>
              <div className="flex justify-between"><span>Harga</span><span>{rupiah(trx.price)}</span></div>
              {Number(trx.discount) > 0 && <div className="flex justify-between"><span>Diskon</span><span>-{rupiah(trx.discount)}</span></div>}
              <div className="my-1.5 border-t border-dashed border-black" />
              <div className="flex justify-between text-xs font-bold"><span>TOTAL</span><span>{rupiah(trx.total)}</span></div>
              <div className="flex justify-between"><span>Bayar</span><span>{trx.payment_method || 'Tunai'}</span></div>
              <div className="my-1.5 border-t border-dashed border-black" />
              <p className="text-center text-[10px]">Terima kasih atas kunjungan Anda.<br />Semoga sehat selalu!</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Tutup</button>
          <button type="button" className="btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            Cetak {mode === 'a4' ? 'Biasa (A4)' : `Termal ${mode}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}


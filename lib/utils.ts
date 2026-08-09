import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string, locale = 'ar-EG') {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateStr));
}

// #5 — 12-hour AM/PM format
export function formatTime12h(time: string, locale = 'ar'): string {
  const [hourStr, minuteStr = '00'] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const isPM = hour >= 12;
  const hour12 = hour % 12 || 12;
  const period = locale === 'ar' ? (isPM ? 'م' : 'ص') : (isPM ? 'PM' : 'AM');
  return `${hour12}:${minuteStr} ${period}`;
}

export function generateInvoiceNumber(id: string) {
  return `INV-${id.slice(0, 8).toUpperCase()}`;
}

export function formatClientCode(code: number): string {
  return `#${code}`;
}

export function getPaymentMethodLabel(method: string, locale: string) {
  const labels: Record<string, Record<string, string>> = {
    cash: { ar: 'نقدي', en: 'Cash' },
    card: { ar: 'بطاقة', en: 'Card' },
    instapay: { ar: 'InstaPay', en: 'InstaPay' },
    vodafone_cash: { ar: 'Vodafone Cash', en: 'Vodafone Cash' },
  };
  return labels[method]?.[locale] ?? method;
}

// ── WhatsApp digital invoices ────────────────────────────────────────────────
// wa.me deep link with a pre-filled message — no WhatsApp Business API needed.
// Assumes a stored local Egyptian "01xxxxxxxxx" number and prepends country
// code "2". If the number already has a country code (starts with "20"),
// it's used as-is to avoid double-prefixing.
export function buildWhatsAppLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '');
  const withCc = digits.startsWith('20') ? digits : '2' + digits;
  return 'https://wa.me/' + withCc + '?text=' + encodeURIComponent(text);
}

interface InvoiceMessageInput {
  id: string;
  net_total: number;
  total: number;
  discount: number;
  created_at: string;
  items: { name: string; qty: number; lineTotal: number }[];
}

// Plain-text receipt used as the wa.me pre-filled message.
export function buildInvoiceWhatsAppMessage(inv: InvoiceMessageInput, shopName: string): string {
  const lines: string[] = [
    `*${shopName}*`,
    'فاتورة ' + generateInvoiceNumber(inv.id),
    new Date(inv.created_at).toLocaleString('ar-EG'),
    '',
    ...inv.items.map((it) => it.name + ' × ' + it.qty + ' — ' + it.lineTotal.toFixed(2) + ' ج.م'),
    '',
  ];
  if (inv.discount) lines.push('خصم: ' + inv.discount.toFixed(2) + ' ج.م');
  lines.push('*الإجمالي: ' + inv.net_total.toFixed(2) + ' ج.م*');
  lines.push('');
  lines.push('شكرًا لتعاملكم معنا 🙏');
  return lines.join('\n');
}

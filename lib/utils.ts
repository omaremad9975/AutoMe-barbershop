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

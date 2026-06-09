'use client';

import { useMemo, useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Printer, TrendingUp, FileText, Award } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DEMO_INVOICES } from '@/lib/demo/data';
import { createClient } from '@/lib/supabase/client';
import type { Invoice, ShiftSettings, ShiftConfig, PaymentMethod } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert "HH:MM" to total minutes from midnight */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Return current time as "HH:MM" */
function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Detect which shift the current time falls into */
function detectCurrentShift(shifts: ShiftConfig[]): ShiftConfig | null {
  const nowMin = timeToMinutes(nowHHMM());
  for (const shift of shifts) {
    const start = timeToMinutes(shift.start_time);
    const end = timeToMinutes(shift.end_time);
    if (start < end) {
      // Normal range e.g. 08:00 – 14:00
      if (nowMin >= start && nowMin < end) return shift;
    } else {
      // Overnight range e.g. 22:00 – 08:00
      if (nowMin >= start || nowMin < end) return shift;
    }
  }
  return shifts[0] ?? null; // fallback to first shift
}

/** Filter invoices from shift start time (when cashier logged in) until now */
function filterInvoicesForShift(invoices: Invoice[]): Invoice[] {
  const shiftStart = localStorage.getItem('shift-start-time');
  if (!shiftStart) {
    const todayStr = new Date().toDateString();
    return invoices.filter((inv) => new Date(inv.created_at).toDateString() === todayStr);
  }
  const startTime = new Date(shiftStart);
  return invoices.filter((inv) => new Date(inv.created_at) >= startTime);
}

/** Read shift settings from localStorage */
function getShiftSettings(): ShiftSettings | null {
  try {
    const raw = localStorage.getItem('barber-shift-settings');
    if (raw) return JSON.parse(raw) as ShiftSettings;
  } catch { }
  return null;
}

// ── Payment method display ────────────────────────────────────────────────────

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'instapay', 'vodafone_cash'];

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  cashierName?: string;
}

export function ShiftSummaryModal({ open, onClose, cashierName }: Props) {
  const t = useTranslations('shiftClose');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Invoice state ──────────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (!open) return;

    if (DEMO_MODE) {
      // In demo mode use the local demo data (filtered by shift below in useMemo)
      setInvoices(DEMO_INVOICES);
      return;
    }

    // Non-demo: fetch from Supabase — use shift start time (when cashier logged in)
    const shiftStart = localStorage.getItem('shift-start-time') ?? new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const supabase = createClient();
    supabase
      .from('invoices')
      .select('*, employee:employees(id, name)')
      .eq('status', 'paid')
      .gte('created_at', shiftStart)
      .lte('created_at', todayEnd)
      .order('created_at')
      .then(({ data }) => {
        setInvoices((data as Invoice[]) ?? []);
      });
  }, [open]);

  // ── Compute summary on every open / when invoices change ──────────────────
  const summary = useMemo(() => {
    const settings = getShiftSettings();

    // Determine current shift
    let currentShift: ShiftConfig | null = null;
    if (settings && settings.shifts.length > 0) {
      currentShift = detectCurrentShift(settings.shifts);
    } else {
      // Fallback: treat whole day as one shift
      currentShift = { id: 1, name: locale === 'ar' ? 'اليوم كامل' : 'Full Day', start_time: '00:00', end_time: '23:59' };
    }

    // Filter invoices to this session's shift window
    const shiftInvoices = filterInvoicesForShift(invoices);

    // Revenue by payment method
    const revenueByMethod: Record<PaymentMethod, { amount: number; count: number }> = {
      cash: { amount: 0, count: 0 },
      card: { amount: 0, count: 0 },
      instapay: { amount: 0, count: 0 },
      vodafone_cash: { amount: 0, count: 0 },
    };

    let totalDiscounts = 0;
    let grossTotal = 0; // sum of inv.total (before discounts)
    let netTotal = 0; // sum of inv.net_total (after discounts)
    const employeeCount: Record<string, { count: number; name: string }> = {};

    for (const inv of shiftInvoices) {
      revenueByMethod[inv.payment_method].amount += inv.net_total;
      revenueByMethod[inv.payment_method].count += 1;
      totalDiscounts += inv.discount;
      grossTotal += inv.total;
      netTotal += inv.net_total;
      if (inv.employee_id) {
        const empName = inv.employee?.name ?? inv.employee_id;
        if (!employeeCount[inv.employee_id]) {
          employeeCount[inv.employee_id] = { count: 0, name: empName };
        }
        employeeCount[inv.employee_id].count += 1;
      }
    }

    // Top employee
    let topEmployee: { name: string; count: number } | null = null;
    const empEntries = Object.entries(employeeCount);
    if (empEntries.length > 0) {
      const [, topData] = empEntries.sort((a, b) => b[1].count - a[1].count)[0];
      topEmployee = { name: topData.name, count: topData.count };
    }

    return {
      currentShift,
      invoices: shiftInvoices,
      revenueByMethod,
      totalDiscounts,
      grossTotal,
      netTotal,
      topEmployee,
      date: (() => {
        const d = new Date().toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });
        return locale === 'ar' ? d.replace('،', ' ،') : d;
      })(),
      dateShort: (() => {
        const now = new Date();
        const d = now.getDate();
        const m = now.getMonth() + 1;
        const y = now.getFullYear();
        const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        return `${time} , ${d}/${m}/${y}`;
      })(),
      shiftSessionStart: (() => {
        const raw = localStorage.getItem('shift-start-time');
        if (!raw) return null;
        const d = new Date(raw);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      })(),
      shiftSessionEnd: (() => {
        const now = new Date();
        return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      })(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, locale, invoices]);

  // ── Print ──────────────────────────────────────────────────────────────────
  function handlePrint() {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;
    const content = document.getElementById('shift-print-content')?.innerHTML ?? '';
    const now = new Date();
    const d = now.getDate();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    const h = String(now.getHours() % 12 || 12).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    const printTitle = `${d}-${m}-${y} ${h}-${min} ${ampm} Shift Summary`;
    // Reset shift start time — new shift begins after closing
    localStorage.setItem('shift-start-time', new Date().toISOString());
    printWindow.document.write(`
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
        <head>
          <title>${printTitle}</title>
          <style>
            @page { margin: 0mm; size: auto; }
            body { font-family: Arial, sans-serif; font-size: 13px; padding: 24px; margin: 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .divider { border-top: 1px dashed #ccc; margin: 10px 0; }
            .bold { font-weight: 700; }
            .center { text-align: center; }
            .muted { color: #555; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function methodLabel(m: PaymentMethod): string {
    const map: Record<PaymentMethod, string> = {
      cash: t('cash'),
      card: t('card'),
      instapay: t('instapay'),
      vodafone_cash: t('vodafoneCash'),
    };
    return map[m];
  }

  function methodColor(m: PaymentMethod): string {
    const map: Record<PaymentMethod, string> = {
      cash: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      card: 'bg-blue-50   text-blue-700   border-blue-200',
      instapay: 'bg-violet-50 text-violet-700 border-violet-200',
      vodafone_cash: 'bg-red-50    text-red-700    border-red-200',
    };
    return map[m];
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!mounted) return null;

  return (
    <>
      {/* Hidden print target */}
      <div style={{ display: 'none' }}>
        <PrintLayout summary={summary} t={t} methodLabel={methodLabel} locale={locale} cashierName={cashierName} />
      </div>

      {/* Screen modal */}
      <Modal open={open} onClose={onClose} size="xl">
        <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t('title')}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{summary.date}</p>
            </div>
            <div className="text-end">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-sm font-semibold"
                style={{ color: 'var(--brand-color)' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--brand-color)' }} />
                {summary.currentShift?.name ?? t('currentShift')}
              </span>
              <p className="text-xs text-gray-400 mt-1">
                {summary.currentShift?.start_time} – {summary.currentShift?.end_time}
              </p>
            </div>
          </div>

          {summary.invoices.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t('noInvoices')}</p>
            </div>
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 gap-3">
                <KpiCard
                  icon={<FileText className="w-5 h-5" />}
                  label={t('totalInvoices')}
                  value={String(summary.invoices.length)}
                  color="blue"
                />
                <KpiCard
                  icon={<TrendingUp className="w-5 h-5" />}
                  label={t('netRevenue')}
                  value={`${summary.netTotal.toLocaleString()} ${locale === 'ar' ? 'ج' : 'EGP'}`}
                  color="emerald"
                />
              </div>

              {/* Revenue by payment method */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="font-semibold text-gray-700 mb-3 text-sm">{t('revenueByMethod')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((m) => {
                    const d = summary.revenueByMethod[m];
                    return (
                      <div key={m} className={`rounded-xl border p-3 ${methodColor(m)}`}>
                        <p className="text-xs font-medium opacity-75">{methodLabel(m)}</p>
                        <p className="text-lg font-bold mt-0.5">{d.amount.toLocaleString()}</p>
                        <p className="text-xs opacity-60">{d.count} {t('invoices')}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Revenue Before / After Discounts */}
              <div className="flex gap-3">
                <div className="flex-1 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 font-medium">
                    {locale === 'ar' ? 'الإيراد قبل الخصومات' : 'Revenue Before Discounts'}
                  </p>
                  <p className="text-lg font-bold text-gray-800 mt-0.5">
                    {summary.grossTotal.toLocaleString()}
                  </p>
                </div>
                <div className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-600 font-medium">
                    {locale === 'ar' ? 'الإيراد بعد الخصومات' : 'Revenue After Discounts'}
                  </p>
                  <p className="text-lg font-bold text-emerald-700 mt-0.5">
                    {summary.netTotal.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Top employee */}
              {summary.topEmployee && (
                <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-3">
                  <div className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-yellow-700 font-medium">{t('topEmployee')}</p>
                    <p className="font-semibold text-yellow-900">
                      {summary.topEmployee.name}
                      <span className="text-xs font-normal ms-2 text-yellow-700">
                        ({summary.topEmployee.count} {t('invoices')})
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2 no-print">
            <Button variant="outline" onClick={onClose} className="flex-1">
              {locale === 'ar' ? 'إغلاق' : 'Close'}
            </Button>
            <Button onClick={handlePrint} className="flex-1">
              <Printer className="w-4 h-4" />
              {t('printSummary')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'blue' | 'violet' | 'emerald';
}) {
  const colorMap = {
    blue: 'bg-blue-50   text-blue-600   border-blue-200',
    violet: 'bg-violet-50 text-violet-600 border-violet-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  };
  return (
    <div className={`rounded-xl border p-3 ${colorMap[color]}`}>
      <div className="opacity-70 mb-1">{icon}</div>
      <p className="text-xs font-medium opacity-75 leading-tight">{label}</p>
      <p className="text-base font-bold mt-0.5">{value}</p>
    </div>
  );
}

// ── Print layout (receipt style) ──────────────────────────────────────────────

interface SummaryData {
  currentShift: ShiftConfig | null;
  invoices: Invoice[];
  revenueByMethod: Record<PaymentMethod, { amount: number; count: number }>;
  totalDiscounts: number;
  grossTotal: number;
  netTotal: number;
  topEmployee: { name: string; count: number } | null;
  date: string;
  dateShort: string;
  shiftSessionStart: string | null;
  shiftSessionEnd: string;
}

function PrintLayout({
  summary,
  t,
  methodLabel,
  locale,
  cashierName,
}: {
  summary: SummaryData;
  t: ReturnType<typeof useTranslations<'shiftClose'>>;
  methodLabel: (m: PaymentMethod) => string;
  locale: string;
  cashierName?: string;
}) {
  return (
    <div id="shift-print-content" style={{ maxWidth: 340, margin: '0 auto', fontFamily: 'Arial, sans-serif', fontSize: 13 }}>
      <div style={{ textAlign: 'center', borderBottom: '1px dashed #ccc', paddingBottom: 12, marginBottom: 12 }}>
        <p style={{ fontWeight: 700, fontSize: 16 }}>{t('title')}</p>
        <p style={{ color: '#555' }}>{summary.currentShift?.name}</p>
        <p style={{ color: '#555' }}>{summary.date}</p>
        <p style={{ color: '#555', direction: 'ltr', unicodeBidi: 'embed' }}>{summary.dateShort}</p>
        {summary.shiftSessionStart && (
          <p style={{ color: '#555', direction: 'ltr', unicodeBidi: 'embed' }}>
            {summary.shiftSessionStart} – {summary.shiftSessionEnd}
          </p>
        )}
        {cashierName && (
          <p style={{ color: '#555', marginTop: 4 }}>
            {locale === 'ar' ? 'الكاشير: ' : 'Cashier: '}<strong>{cashierName}</strong>
          </p>
        )}
      </div>

      {/* KPIs */}
      <div style={{ borderBottom: '1px dashed #ccc', paddingBottom: 10, marginBottom: 10 }}>
        <PrintRow label={t('totalInvoices')} value={String(summary.invoices.length)} />
      </div>

      {/* Revenue by method */}
      <p style={{ fontWeight: 700, marginBottom: 6 }}>{t('revenueByMethod')}</p>
      <div style={{ borderBottom: '1px dashed #ccc', paddingBottom: 10, marginBottom: 10 }}>
        {PAYMENT_METHODS.map((m) => {
          const d = summary.revenueByMethod[m];
          return (
            <PrintRow
              key={m}
              label={`${methodLabel(m)} (${d.count})`}
              value={d.amount.toLocaleString()}
            />
          );
        })}
      </div>

      {/* Revenue Before / After Discounts */}
      <div style={{ borderBottom: '1px dashed #ccc', paddingBottom: 10, marginBottom: 10 }}>
        <PrintRow label={locale === 'ar' ? 'الإيراد قبل الخصومات' : 'Revenue Before Discounts'} value={String(summary.grossTotal)} />
        <PrintRow label={locale === 'ar' ? 'الإيراد بعد الخصومات' : 'Revenue After Discounts'} value={String(summary.netTotal)} bold />
      </div>

      {/* Top employee */}
      {summary.topEmployee && (
        <div style={{ borderBottom: '1px dashed #ccc', paddingBottom: 10, marginBottom: 10 }}>
          <PrintRow
            label={t('topEmployee')}
            value={`${summary.topEmployee.name} (${summary.topEmployee.count})`}
          />
        </div>
      )}

    </div>
  );
}

function PrintRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
      <span style={{ color: '#555' }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  );
}

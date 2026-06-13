'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, parse, isValid } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency, getPaymentMethodLabel, formatTime12h, generateInvoiceNumber } from '@/lib/utils';
import { TrendingUp, LayoutList, Search, X, Download, ChevronDown } from 'lucide-react';
import { DEMO_INVOICES } from '@/lib/demo/data';
import type { Invoice } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

interface Props {
  initialInvoices: Invoice[];
  defaultFrom: string;
  defaultTo: string;
}

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

// #8 — custom Y-axis tick — shows full name, wraps if very long
function ServiceTick({ x, y, payload }: any) {
  const name: string = payload.value ?? '';
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{name}</title>
      <text x={-8} y={0} dy={4} textAnchor="end" fill="#6b7280" fontSize={12}>
        {name}
      </text>
    </g>
  );
}

export function ReportsClient({ initialInvoices, defaultFrom, defaultTo }: Props) {
  const t = useTranslations('reports');
  const locale = useLocale();
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const fromDateTime = `${defaultFrom}T00:00:00`;
    const toDateTime = `${defaultTo}T23:59:59`;
    const fromDate = new Date(fromDateTime);
    const toDate = new Date(toDateTime);
    return initialInvoices.filter((inv) => {
      const d = new Date(inv.created_at);
      return d >= fromDate && d <= toDate;
    });
  });
  const [fromDate, setFromDate] = useState<Date>(() => new Date(defaultFrom));
  const [toDate, setToDate] = useState<Date>(() => new Date(defaultTo));
  const [fromInput, setFromInput] = useState(() => format(new Date(defaultFrom), 'dd/MM/yyyy'));
  const [toInput, setToInput] = useState(() => format(new Date(defaultTo), 'dd/MM/yyyy'));
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [fromTime, setFromTime] = useState('00:00');
  const [toTime, setToTime] = useState('23:59');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'charts' | 'list'>('charts');
  const [searchTerm, setSearchTerm] = useState('');

  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const fromPickerRef = useRef<HTMLDivElement>(null);
  const toPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (fromPickerRef.current && !fromPickerRef.current.contains(e.target as Node)) {
        setShowFromPicker(false);
      }
      if (toPickerRef.current && !toPickerRef.current.contains(e.target as Node)) {
        setShowToPicker(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function buildExportRows(displayedInvoices: typeof invoices) {
    return displayedInvoices.map((inv, i) => {
      const dateObj = new Date(inv.created_at);
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      return {
        [locale === 'ar' ? 'رقم الفاتورة' : 'Invoice No.']: generateInvoiceNumber(inv.id),
        [locale === 'ar' ? 'كود العميل' : 'Client Code']: inv.client?.code != null ? `#${inv.client.code}` : '—',
        [locale === 'ar' ? 'العميل' : 'Client Name']: inv.client?.name ?? (locale === 'ar' ? 'زبون عابر' : 'Walk-in'),
        [locale === 'ar' ? 'الهاتف' : 'Phone']: inv.client?.phone ?? '—',
        [locale === 'ar' ? 'التاريخ' : 'Date']: format(dateObj, 'dd/MM/yyyy'),
        [locale === 'ar' ? 'الوقت' : 'Time']: `${hours}:${minutes}`,
        [locale === 'ar' ? 'البريد الإلكتروني' : 'Email']: inv.client?.email ?? '—',
        [locale === 'ar' ? 'المبلغ' : 'Amount']: inv.total,
        [locale === 'ar' ? 'الخصم' : 'Discount']: inv.discount,
        [locale === 'ar' ? 'الصافي' : 'Net Total']: inv.net_total,
        [locale === 'ar' ? 'طريقة الدفع' : 'Payment Method']: getPaymentMethodLabel(inv.payment_method, locale),
      };
    });
  }

  async function exportExcel() {
    setShowExportMenu(false);
    const { utils, writeFile } = await import('xlsx');
    const rows = buildExportRows(invoices);
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, locale === 'ar' ? 'التقارير' : 'Reports');
    writeFile(wb, `reports-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }

  async function exportPDF() {
    setShowExportMenu(false);
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const rows = buildExportRows(invoices);
    const headers = Object.keys(rows[0] ?? {});
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(locale === 'ar' ? 'تقرير المبيعات' : 'Sales Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`${fromInput} → ${toInput}`, 14, 22);
    autoTable(doc, {
      head: [headers],
      body: rows.map(r => Object.values(r).map(String)),
      startY: 27,
      styles: { fontSize: 8 },
    });
    doc.save(`reports-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }

  const handleFromSelect = (date: Date | undefined) => {
    if (date) {
      setFromDate(date);
      setFromInput(format(date, 'dd/MM/yyyy'));
      setShowFromPicker(false);
    }
  };

  const handleToSelect = (date: Date | undefined) => {
    if (date) {
      setToDate(date);
      setToInput(format(date, 'dd/MM/yyyy'));
      setShowToPicker(false);
    }
  };

  async function applyFilter() {
    setLoading(true);

    const fromDateStr = format(fromDate, 'yyyy-MM-dd');
    const toDateStr = format(toDate, 'yyyy-MM-dd');
    const fromDateTime = `${fromDateStr}T${fromTime}:00`;
    const toDateTime = `${toDateStr}T${toTime}:59`;

    // Demo mode: filter in-memory
    if (DEMO_MODE) {
      const fromDate = new Date(fromDateTime);
      const toDate = new Date(toDateTime);
      setInvoices(DEMO_INVOICES.filter((inv) => {
        const d = new Date(inv.created_at);
        return d >= fromDate && d <= toDate;
      }));
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data } = await supabase
      .from('invoices')
      .select('*, invoice_items(*), employee:employees(id,name)')
      .gte('created_at', fromDateTime)
      .lte('created_at', toDateTime)
      .eq('status', 'paid')
      .order('created_at');

    setInvoices((data ?? []) as Invoice[]);
    setLoading(false);
  }

  // Derived stats
  const totalRevenue = invoices.reduce((s, i) => s + i.net_total, 0);
  const totalInvoicesCount = invoices.length;
  const avgInvoice = totalInvoicesCount > 0 ? totalRevenue / totalInvoicesCount : 0;

  // Daily sales
  const dailyMap: Record<string, number> = {};
  invoices.forEach((inv) => {
    const day = inv.created_at.split('T')[0];
    dailyMap[day] = (dailyMap[day] ?? 0) + inv.net_total;
  });
  const dailyData = Object.entries(dailyMap)
    .map(([date, total]) => ({ date: date.slice(5), total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Payment method breakdown
  const paymentMap: Record<string, number> = {};
  invoices.forEach((inv) => {
    paymentMap[inv.payment_method] = (paymentMap[inv.payment_method] ?? 0) + inv.net_total;
  });
  const paymentData = Object.entries(paymentMap).map(([method, total]) => ({
    name: getPaymentMethodLabel(method, locale),
    value: total,
  }));

  // Revenue by employee
  const empMap: Record<string, { name: string; total: number }> = {};
  invoices.forEach((inv) => {
    if (inv.employee) {
      const key = inv.employee.id;
      if (!empMap[key]) empMap[key] = { name: inv.employee.name, total: 0 };
      empMap[key].total += inv.net_total;
    }
  });
  const empData = Object.values(empMap).sort((a, b) => b.total - a.total);

  // Popular services
  const serviceMap: Record<string, { name: string; count: number }> = {};
  invoices.forEach((inv) => {
    inv.invoice_items?.forEach((item) => {
      if (!serviceMap[item.name_snapshot]) {
        serviceMap[item.name_snapshot] = { name: item.name_snapshot, count: 0 };
      }
      serviceMap[item.name_snapshot].count += item.quantity;
    });
  });
  const serviceData = Object.values(serviceMap).sort((a, b) => b.count - a.count).slice(0, 10);

  // compute Y-axis width based on longest service name (Arabic chars need more space)
  const maxNameLen = serviceData.reduce((max, s) => Math.max(max, s.name.length), 0);
  const yAxisWidth = Math.min(250, Math.max(150, maxNameLen * 10));

  return (
    <>
      <PageHeader title={t('title')} />

      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">

          {/* From date */}
          <div className="relative" ref={fromPickerRef}>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {locale === 'ar' ? 'من' : 'From'}
            </label>
            <input
              type="text"
              value={fromInput}
              onChange={(e) => {
                const val = e.target.value;
                setFromInput(val);
                const parsed = parse(val, 'dd/MM/yyyy', new Date());
                if (isValid(parsed)) {
                  setFromDate(parsed);
                }
              }}
              onFocus={() => setShowFromPicker(true)}
              className="w-36 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <p className="text-xs text-gray-400 mt-1">DD/MM/YYYY</p>
            {showFromPicker && (
              <div className="absolute start-0 mt-2 p-3 bg-white border border-gray-200 rounded-2xl shadow-xl z-[200]" dir="ltr">
                <DayPicker
                  mode="single"
                  selected={fromDate}
                  onSelect={handleFromSelect}
                />
              </div>
            )}
          </div>

          {/* From time */}
          <div className="shrink-0">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {locale === 'ar' ? 'الوقت' : 'Time'}
            </label>
            <input
              type="time"
              value={fromTime}
              onChange={(e) => setFromTime(e.target.value)}
              className="w-[130px] shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1 invisible">–</p>
          </div>


          {/* To date */}
          <div className="relative" ref={toPickerRef}>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {locale === 'ar' ? 'إلى' : 'To'}
            </label>
            <input
              type="text"
              value={toInput}
              onChange={(e) => {
                const val = e.target.value;
                setToInput(val);
                const parsed = parse(val, 'dd/MM/yyyy', new Date());
                if (isValid(parsed)) {
                  setToDate(parsed);
                }
              }}
              onFocus={() => setShowToPicker(true)}
              className="w-36 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <p className="text-xs text-gray-400 mt-1">DD/MM/YYYY</p>
            {showToPicker && (
              <div className="absolute start-0 mt-2 p-3 bg-white border border-gray-200 rounded-2xl shadow-xl z-[200]" dir="ltr">
                <DayPicker
                  mode="single"
                  selected={toDate}
                  onSelect={handleToSelect}
                />
              </div>
            )}
          </div>

          {/* To time */}
          <div className="shrink-0">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {locale === 'ar' ? 'الوقت' : 'Time'}
            </label>
            <input
              type="time"
              value={toTime}
              onChange={(e) => setToTime(e.target.value)}
              className="w-[130px] shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1 invisible">–</p>
          </div>

          {/* Apply button — pushed to right on wider screens */}
          <div className="flex-1 flex justify-end pb-5">
            <Button onClick={applyFilter} disabled={loading}>
              {loading ? '...' : t('applyFilter')}
            </Button>
          </div>

        </div>
      </div>

      {/* View Toggle + Export */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white p-1 shadow-sm">
          <button
            onClick={() => setViewMode('charts')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'charts' ? 'text-white' : 'text-gray-400 hover:text-gray-600 bg-white'
              }`}
            style={viewMode === 'charts' ? { backgroundColor: 'var(--brand-color)' } : {}}
          >
            <TrendingUp className="w-4 h-4" />
            {locale === 'ar' ? 'الرسوم البيانية' : 'Charts'}
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'list' ? 'text-white' : 'text-gray-400 hover:text-gray-600 bg-white'
              }`}
            style={viewMode === 'list' ? { backgroundColor: 'var(--brand-color)' } : {}}
          >
            <LayoutList className="w-4 h-4" />
            {locale === 'ar' ? 'قائمة الفواتير' : 'List'}
          </button>
        </div>

        {/* Export dropdown */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            {locale === 'ar' ? 'تصدير' : 'Export'}
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {showExportMenu && (
            <div className="absolute end-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-[200] overflow-hidden">
              <button onClick={exportExcel} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                <span className="text-green-600 font-bold text-xs">XLS</span>
                {locale === 'ar' ? 'تصدير كـ Excel' : 'Export as Excel'}
              </button>
              <button onClick={exportPDF} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition border-t border-gray-100">
                <span className="text-red-600 font-bold text-xs">PDF</span>
                {locale === 'ar' ? 'تصدير كـ PDF' : 'Export as PDF'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      {viewMode === 'charts' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: t('totalRevenue'), value: formatCurrency(totalRevenue) },
            { label: t('totalInvoices'), value: totalInvoicesCount.toLocaleString('en-US') },
            { label: t('avgInvoice'), value: formatCurrency(avgInvoice) },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">{kpi.label}</p>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="text-center py-16 text-gray-400">{t('noData')}</div>
      ) : viewMode === 'charts' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily sales */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 lg:col-span-2">
            <h3 className="font-semibold text-gray-800 mb-4">{t('dailySales')}</h3>
            <div dir="ltr">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v: string) => {
                    const parts = v.split('-');
                    return parts.length === 2 ? `${parts[1]}/${parts[0]}` : v;
                  }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v: number) => `${v.toLocaleString('en-US')} EGP`}
                />
                <Tooltip
                  labelFormatter={(label: string) => {
                    const parts = label.split('-');
                    return parts.length === 2 ? `${parts[1]}/${parts[0]}` : label;
                  }}
                  formatter={(v: number) => `${v.toLocaleString('en-US')} EGP`}
                />
                <Bar dataKey="total" fill="var(--brand-color)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>

          {/* Payment method pie */}
          <div className="bg-white rounded-2xl border border-gray-200 p-10">
            <h3 className="font-semibold text-gray-800 mb-4">{t('revenueByPayment')}</h3>
            {paymentData.length > 0 ? (
              <div style={{ overflow: 'visible' }} dir="ltr">
                <ResponsiveContainer width="100%" height={380}>
                  <PieChart margin={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                    <Pie
                      data={paymentData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%" cy="50%"
                      outerRadius={80}
                      paddingAngle={2}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={true}
                    >
                      {paymentData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Legend wrapperStyle={{ paddingTop: '24px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-gray-400 text-sm">{t('noData')}</p>}
          </div>

          {/* Revenue by employee */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">{t('revenueByEmployee')}</h3>
            {empData.length > 0 ? (
              <div className="space-y-3">
                {empData.map((emp, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    >
                      {emp.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{emp.name}</p>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${(emp.total / (empData[0]?.total || 1)) * 100}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 shrink-0">{formatCurrency(emp.total)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-400 text-sm">{t('noData')}</p>}
          </div>

          {/* Popular services — #8 fixed Y-axis */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 lg:col-span-2">
            <h3 className="font-semibold text-gray-800 mb-4">{t('popularServices')}</h3>
            {serviceData.length > 0 ? (
              <div dir="ltr">
              <ResponsiveContainer width="100%" height={Math.max(220, serviceData.length * 36)}>
                <BarChart
                  data={serviceData}
                  layout="vertical"
                  margin={{ top: 4, right: 24, bottom: 4, left: yAxisWidth }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={yAxisWidth}
                    tick={<ServiceTick />}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--brand-color)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            ) : <p className="text-gray-400 text-sm">{t('noData')}</p>}
          </div>
        </div>
      ) : (
        /* ── List view (Invoices Table) ── */
        (() => {
          const displayedInvoices = invoices.filter((inv) => {
            if (!searchTerm.trim()) return true;
            const q = searchTerm.toLowerCase();
            const clientName = inv.client?.name?.toLowerCase() ?? '';
            const clientPhone = inv.client?.phone ?? '';
            const invoiceNo = generateInvoiceNumber(inv.id).toLowerCase();
            const clientCode = inv.client?.code != null ? String(inv.client.code) : '';
            return clientName.includes(q) || clientPhone.includes(q) || invoiceNo.includes(q) || clientCode.includes(q);
          });

          return (
            <div className="space-y-4">
              {/* Search box */}
              <div className="relative max-w-md">
                <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={locale === 'ar' ? 'البحث باسم العميل أو الهاتف أو رقم الفاتورة...' : 'Search by name, phone or invoice no...'}
                  className="w-full ps-9 pe-8 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute top-1/2 -translate-y-1/2 end-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {displayedInvoices.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    {locale === 'ar' ? 'لا توجد فواتير مطابقة للبحث' : 'No matching invoices found'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-start">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-start px-4 py-3 font-semibold text-gray-600">
                            {locale === 'ar' ? 'رقم الفاتورة' : 'Invoice No.'}
                          </th>
                          <th className="text-start px-4 py-3 font-semibold text-gray-600">
                            {locale === 'ar' ? 'كود العميل' : 'Client Code'}
                          </th>
                          <th className="text-start px-4 py-3 font-semibold text-gray-600">
                            {locale === 'ar' ? 'العميل' : 'Client Name'}
                          </th>
                          <th className="text-start px-4 py-3 font-semibold text-gray-600">
                            {locale === 'ar' ? 'الهاتف' : 'Phone'}
                          </th>
                          <th className="text-start px-4 py-3 font-semibold text-gray-600">
                            {locale === 'ar' ? 'التاريخ' : 'Date'}
                          </th>
                          <th className="text-start px-4 py-3 font-semibold text-gray-600">
                            {locale === 'ar' ? 'الوقت' : 'Time'}
                          </th>
                          <th className="text-start px-4 py-3 font-semibold text-gray-600">
                            {locale === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                          </th>
                          <th className="text-start px-4 py-3 font-semibold text-gray-600">
                            {locale === 'ar' ? 'المبلغ' : 'Amount'}
                          </th>
                          <th className="text-start px-4 py-3 font-semibold text-gray-600">
                            {locale === 'ar' ? 'الخصم' : 'Discount'}
                          </th>
                          <th className="text-start px-4 py-3 font-semibold text-gray-600">
                            {locale === 'ar' ? 'الصافي' : 'Net Total'}
                          </th>
                          <th className="text-start px-4 py-3 font-semibold text-gray-600">
                            {locale === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {displayedInvoices.map((inv) => {
                          const originalIndex = invoices.indexOf(inv);
                          const dateObj = new Date(inv.created_at);

                          // Local time calculation
                          const hours = String(dateObj.getHours()).padStart(2, '0');
                          const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                          const timeStr = `${hours}:${minutes}`;
                          const timeFormatted = formatTime12h(timeStr, locale);

                          // Payment Badge Classes
                          const badgeClasses = {
                            cash: 'bg-green-50 text-green-700 border-green-200',
                            card: 'bg-blue-50 text-blue-700 border-blue-200',
                            instapay: 'bg-purple-50 text-purple-700 border-purple-200',
                            vodafone_cash: 'bg-red-50 text-red-700 border-red-200',
                          }[inv.payment_method] || 'bg-gray-50 text-gray-700 border-gray-200';

                          return (
                            <tr key={inv.id} className="hover:bg-gray-50 transition">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                                  {generateInvoiceNumber(inv.id)}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {inv.client?.code != null
                                  ? <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">#{inv.client.code}</span>
                                  : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                                {inv.client?.name ?? (locale === 'ar' ? 'زبون عابر' : 'Walk-in')}
                              </td>
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                {inv.client?.phone ?? '—'}
                              </td>
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                {format(dateObj, 'dd/MM/yyyy')}
                              </td>
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                {timeFormatted}
                              </td>
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                {inv.client?.email ?? '—'}
                              </td>
                              <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">
                                {formatCurrency(inv.total)}
                              </td>
                              <td className="px-4 py-3 text-red-600 whitespace-nowrap">
                                {inv.discount > 0 ? formatCurrency(inv.discount) : '—'}
                              </td>
                              <td className="px-4 py-3 text-gray-900 font-bold whitespace-nowrap">
                                {formatCurrency(inv.net_total)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClasses}`}>
                                  {getPaymentMethodLabel(inv.payment_method, locale)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })()
      )}
    </>
  );
}

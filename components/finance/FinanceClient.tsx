'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { TrendingUp, TrendingDown, Wallet, Plus, Trash2, AlertCircle, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, parse, isValid } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useShop } from '@/lib/hooks/useShop';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import type { Invoice, Expense, ExpenseCategory } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// ── Default categories ───────────────────────────────────────────────────────

const DEFAULT_CATEGORIES: { value: string; label_ar: string; label_en: string }[] = [
  { value: 'rent',        label_ar: 'إيجار',  label_en: 'Rent'        },
  { value: 'electricity', label_ar: 'كهرباء', label_en: 'Electricity' },
  { value: 'salaries',    label_ar: 'رواتب',  label_en: 'Salaries'    },
  { value: 'other',       label_ar: 'أخرى',   label_en: 'Other'       },
];

function catLabel(cat: string, locale: string, customCats: string[]): string {
  const found = DEFAULT_CATEGORIES.find((c) => c.value === cat);
  if (found) return locale === 'ar' ? found.label_ar : found.label_en;
  if (customCats.includes(cat)) return cat;
  return cat;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialInvoices: Pick<Invoice, 'id' | 'net_total' | 'total' | 'discount' | 'created_at' | 'payment_method' | 'status'>[];
  initialExpenses: Expense[];
  defaultFrom: string;
  defaultTo: string;
}

const EMPTY_FORM = {
  category: 'rent',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  notes: '',
};

// ── Component ────────────────────────────────────────────────────────────────

export function FinanceClient({ initialInvoices, initialExpenses, defaultFrom, defaultTo }: Props) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const tCommon = useTranslations('common');
  const { shop } = useShop();

  // ── Filter state (mirrors ReportsClient exactly) ─────────────────────────
  const [fromDate, setFromDate] = useState<Date>(() => new Date(defaultFrom));
  const [toDate, setToDate]     = useState<Date>(() => new Date(defaultTo));
  const [fromInput, setFromInput] = useState(() => format(new Date(defaultFrom), 'dd/MM/yyyy'));
  const [toInput, setToInput]     = useState(() => format(new Date(defaultTo),   'dd/MM/yyyy'));
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker,   setShowToPicker]   = useState(false);
  const [fromTime, setFromTime] = useState('00:00');
  const [toTime,   setToTime]   = useState('23:59');
  const [loading, setLoading] = useState(false);

  // ── Data state ───────────────────────────────────────────────────────────
  // Single source of truth for whatever is currently displayed
  const [displayedInvoices, setDisplayedInvoices] = useState(initialInvoices);
  const [displayedExpenses, setDisplayedExpenses] = useState<Expense[]>(initialExpenses);

  // ── Expense form ─────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── Custom categories ────────────────────────────────────────────────────
  const CUSTOM_KEY = `finance-custom-cats-${shop?.id ?? 'default'}`;
  const [customCats, setCustomCats] = useState<string[]>([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCat, setNewCat] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(CUSTOM_KEY);
    if (saved) setCustomCats(JSON.parse(saved) as string[]);
  }, [CUSTOM_KEY]);

  function addCustomCat() {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    if (customCats.includes(trimmed) || DEFAULT_CATEGORIES.some(c => c.value === trimmed)) {
      toast.error(locale === 'ar' ? 'الفئة موجودة بالفعل' : 'Category already exists');
      return;
    }
    const next = [...customCats, trimmed];
    setCustomCats(next);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
    setNewCat('');
    toast.success(locale === 'ar' ? 'تم إضافة الفئة' : 'Category added');
  }

  function deleteCustomCat(cat: string) {
    const next = customCats.filter(c => c !== cat);
    setCustomCats(next);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
    toast.success(locale === 'ar' ? 'تم حذف الفئة' : 'Category removed');
  }

  const allCategories = [
    ...DEFAULT_CATEGORIES,
    ...customCats.map(c => ({ value: c, label_ar: c, label_en: c })),
  ];

  // ── Apply filter (same logic as ReportsClient) ───────────────────────────
  async function applyFilter() {
    setLoading(true);

    const fromDateStr = format(fromDate, 'yyyy-MM-dd');
    const toDateStr   = format(toDate,   'yyyy-MM-dd');
    const fromDateTime = `${fromDateStr}T${fromTime}:00`;
    const toDateTime   = `${toDateStr}T${toTime}:59`;

    if (DEMO_MODE) {
      const fd = new Date(fromDateTime);
      const td = new Date(toDateTime);
      setDisplayedInvoices(initialInvoices.filter(inv => {
        const d = new Date(inv.created_at);
        return d >= fd && d <= td;
      }));
      setDisplayedExpenses(initialExpenses.filter(e => {
        const d = new Date(e.date);
        return d >= fd && d <= td;
      }));
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const [{ data: invData }, { data: expData }] = await Promise.all([
      supabase
        .from('invoices')
        .select('id, net_total, total, discount, created_at, payment_method, status')
        .eq('status', 'paid')
        .gte('created_at', fromDateTime)
        .lte('created_at', toDateTime)
        .order('created_at'),
      supabase
        .from('expenses')
        .select('*')
        .gte('date', fromDateStr)
        .lte('date', toDateStr)
        .order('date', { ascending: false }),
    ]);

    setDisplayedInvoices((invData ?? []) as Props['initialInvoices']);
    setDisplayedExpenses((expData ?? []) as Expense[]);
    setLoading(false);
  }

  // ── Summaries ─────────────────────────────────────────────────────────────
  const totalRevenue  = displayedInvoices.reduce((s, inv) => s + inv.net_total, 0);
  const totalExpenses = displayedExpenses.reduce((s, e)   => s + e.amount, 0);
  const netProfit     = totalRevenue - totalExpenses;
  const isProfitable  = netProfit >= 0;

  // ── Add expense ──────────────────────────────────────────────────────────
  async function handleSave() {
    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      toast.error(locale === 'ar' ? 'أدخل مبلغاً صحيحاً' : 'Enter a valid amount');
      return;
    }
    if (!form.date) {
      toast.error(locale === 'ar' ? 'التاريخ مطلوب' : 'Date is required');
      return;
    }
    setSaving(true);

    if (DEMO_MODE) {
      const fake: Expense = {
        id: 'demo-exp-' + Math.random().toString(36).slice(2, 8),
        shop_id: shop?.id ?? 'demo-shop-001',
        amount,
        category: form.category as ExpenseCategory,
        notes: form.notes || null,
        date: form.date,
        created_at: new Date().toISOString(),
      };
      setDisplayedExpenses(prev => [fake, ...prev]);
      toast.success(tCommon('success'));
      setShowForm(false);
      setForm(EMPTY_FORM);
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .insert({ shop_id: shop!.id, amount, category: form.category, notes: form.notes || null, date: form.date })
      .select()
      .single<Expense>();

    if (!error && data) {
      setDisplayedExpenses(prev => [data, ...prev]);
      toast.success(tCommon('success'));
      setShowForm(false);
      setForm(EMPTY_FORM);
    } else {
      toast.error(tCommon('error'));
    }
    setSaving(false);
  }

  // ── Delete expense ───────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteId) return;
    if (DEMO_MODE) {
      setDisplayedExpenses(prev => prev.filter(e => e.id !== deleteId));
      toast.success(tCommon('success'));
      setDeleteId(null);
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from('expenses').delete().eq('id', deleteId);
    if (!error) {
      setDisplayedExpenses(prev => prev.filter(e => e.id !== deleteId));
      toast.success(tCommon('success'));
    } else {
      toast.error(tCommon('error'));
    }
    setDeleteId(null);
  }

  // ── Date picker handlers ─────────────────────────────────────────────────
  const handleFromSelect = (date: Date | undefined) => {
    if (date) { setFromDate(date); setFromInput(format(date, 'dd/MM/yyyy')); setShowFromPicker(false); }
  };
  const handleToSelect = (date: Date | undefined) => {
    if (date) { setToDate(date); setToInput(format(date, 'dd/MM/yyyy')); setShowToPicker(false); }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader
        title={locale === 'ar' ? 'المالية' : 'Finance'}
        subtitle={locale === 'ar' ? 'ملخص الأرباح وتتبع المصروفات' : 'Profit summary & expense tracking'}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCatModal(true)}>
              <Tag className="w-4 h-4" />
              {locale === 'ar' ? 'الفئات' : 'Categories'}
            </Button>
            <Button onClick={() => { setForm(EMPTY_FORM); setShowForm(true); }}>
              <Plus className="w-4 h-4" />
              {locale === 'ar' ? 'إضافة مصروف' : 'Add Expense'}
            </Button>
          </div>
        }
      />

      {/* ── Filter bar — same look as Reports page ────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">

          {/* From date */}
          <div className="relative">
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
                if (isValid(parsed)) setFromDate(parsed);
              }}
              onFocus={() => setShowFromPicker(true)}
              className="w-36 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <p className="text-xs text-gray-400 mt-1">DD/MM/YYYY</p>
            {showFromPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowFromPicker(false)} />
                <div className="absolute left-0 mt-2 p-3 bg-white border border-gray-200 rounded-2xl shadow-xl z-20">
                  <DayPicker mode="single" selected={fromDate} onSelect={handleFromSelect} />
                </div>
              </>
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
              className="w-[130px] rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1 invisible">–</p>
          </div>

          {/* To date */}
          <div className="relative">
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
                if (isValid(parsed)) setToDate(parsed);
              }}
              onFocus={() => setShowToPicker(true)}
              className="w-36 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <p className="text-xs text-gray-400 mt-1">DD/MM/YYYY</p>
            {showToPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowToPicker(false)} />
                <div className="absolute left-0 mt-2 p-3 bg-white border border-gray-200 rounded-2xl shadow-xl z-20">
                  <DayPicker mode="single" selected={toDate} onSelect={handleToSelect} />
                </div>
              </>
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
              className="w-[130px] rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1 invisible">–</p>
          </div>

          {/* Apply */}
          <div className="flex-1 flex justify-end pb-5">
            <Button onClick={applyFilter} disabled={loading}>
              {loading ? '...' : (locale === 'ar' ? 'تطبيق' : 'Apply')}
            </Button>
          </div>

        </div>
      </div>

      {/* ── KPI cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-gray-500">{locale === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {totalRevenue.toLocaleString()}
            <span className="text-sm font-normal text-gray-400 ms-1">{locale === 'ar' ? 'ج' : 'EGP'}</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-sm font-medium text-gray-500">{locale === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses'}</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {totalExpenses.toLocaleString()}
            <span className="text-sm font-normal text-gray-400 ms-1">{locale === 'ar' ? 'ج' : 'EGP'}</span>
          </p>
        </div>

        <div className={`rounded-2xl border p-5 ${isProfitable ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isProfitable ? 'bg-emerald-100' : 'bg-red-100'}`}>
              <Wallet className={`w-5 h-5 ${isProfitable ? 'text-emerald-700' : 'text-red-600'}`} />
            </div>
            <p className={`text-sm font-medium ${isProfitable ? 'text-emerald-700' : 'text-red-600'}`}>
              {locale === 'ar' ? 'صافي الربح' : 'Net Profit'}
            </p>
          </div>
          <p className={`text-2xl font-bold ${isProfitable ? 'text-emerald-800' : 'text-red-700'}`}>
            {isProfitable ? '' : '−'}{Math.abs(netProfit).toLocaleString()}
            <span className="text-sm font-normal ms-1 opacity-70">{locale === 'ar' ? 'ج' : 'EGP'}</span>
          </p>
        </div>
      </div>

      {/* ── Expenses log ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{locale === 'ar' ? 'سجل المصروفات' : 'Expenses Log'}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {displayedExpenses.length} {locale === 'ar' ? 'مصروف في الفترة المختارة' : 'expenses in selected period'}
          </p>
        </div>

        {displayedExpenses.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <TrendingDown className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">{locale === 'ar' ? 'لا توجد مصروفات في هذه الفترة' : 'No expenses in this period'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-start px-5 py-3 font-semibold text-gray-600">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="text-start px-5 py-3 font-semibold text-gray-600">{locale === 'ar' ? 'الفئة' : 'Category'}</th>
                  <th className="text-start px-5 py-3 font-semibold text-gray-600">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th className="text-start px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">{locale === 'ar' ? 'ملاحظات' : 'Notes'}</th>
                  <th className="px-5 py-3 w-14" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(exp.date).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {catLabel(exp.category, locale, customCats)}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-900">
                      {exp.amount.toLocaleString()}
                      <span className="text-xs font-normal text-gray-400 ms-1">{locale === 'ar' ? 'ج' : 'EGP'}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 hidden md:table-cell">{exp.notes ?? '—'}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setDeleteId(exp.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Expense Modal ─────────────────────────────────────────────── */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={locale === 'ar' ? 'إضافة مصروف' : 'Add Expense'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label={locale === 'ar' ? 'الفئة' : 'Category'}
              value={form.category}
              onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
            >
              {allCategories.map((c) => (
                <option key={c.value} value={c.value}>
                  {locale === 'ar' ? c.label_ar : c.label_en}
                </option>
              ))}
            </Select>
            <Input
              label={locale === 'ar' ? 'المبلغ (ج)' : 'Amount (EGP)'}
              type="number" min={0} step={0.01}
              value={form.amount}
              onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0"
            />
          </div>
          <Input
            label={locale === 'ar' ? 'التاريخ' : 'Date'}
            type="date" value={form.date}
            onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {locale === 'ar' ? 'ملاحظات (اختياري)' : 'Notes (optional)'}
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">{tCommon('cancel')}</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? tCommon('loading') : tCommon('save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Manage Categories Modal ───────────────────────────────────────── */}
      <Modal open={showCatModal} onClose={() => setShowCatModal(false)} title={locale === 'ar' ? 'إدارة الفئات' : 'Manage Categories'} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {locale === 'ar' ? 'أضف فئات مصروفات خاصة بمحلك' : 'Add custom expense categories for your shop'}
          </p>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {locale === 'ar' ? 'الفئات الافتراضية' : 'Default Categories'}
            </p>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_CATEGORIES.map((c) => (
                <span key={c.value} className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                  {locale === 'ar' ? c.label_ar : c.label_en}
                </span>
              ))}
            </div>
          </div>

          {customCats.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {locale === 'ar' ? 'فئاتك المخصصة' : 'Your Custom Categories'}
              </p>
              <div className="space-y-2">
                {customCats.map((cat) => (
                  <div key={cat} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                    <span className="text-sm font-medium text-gray-800">{cat}</span>
                    <button onClick={() => deleteCustomCat(cat)} className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomCat(); } }}
              placeholder={locale === 'ar' ? 'مثال: فاتورة المياه' : 'e.g. Water Bill'}
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <Button variant="outline" onClick={addCustomCat}>
              <Plus className="w-4 h-4" />
              {locale === 'ar' ? 'إضافة' : 'Add'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete confirm ────────────────────────────────────────────────── */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title={locale === 'ar' ? 'حذف المصروف' : 'Delete Expense'} size="sm">
        <div className="flex items-center gap-3 mb-5 text-amber-600">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm text-gray-600">
            {locale === 'ar' ? 'هل أنت متأكد من حذف هذا المصروف؟' : 'Are you sure you want to delete this expense?'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">{tCommon('cancel')}</Button>
          <Button variant="danger" onClick={handleDelete} className="flex-1">{tCommon('delete')}</Button>
        </div>
      </Modal>
    </>
  );
}

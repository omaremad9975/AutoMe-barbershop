'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { TrendingUp, TrendingDown, Wallet, Plus, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useShop } from '@/lib/hooks/useShop';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import type { Invoice, Expense, ExpenseCategory } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// ── Category definitions ────────────────────────────────────────────────────

const CATEGORIES: { value: ExpenseCategory; label_ar: string; label_en: string }[] = [
  { value: 'rent',        label_ar: 'إيجار',     label_en: 'Rent'        },
  { value: 'supplies',    label_ar: 'مستلزمات',  label_en: 'Supplies'    },
  { value: 'electricity', label_ar: 'كهرباء',    label_en: 'Electricity' },
  { value: 'salaries',    label_ar: 'رواتب',     label_en: 'Salaries'    },
  { value: 'maintenance', label_ar: 'صيانة',     label_en: 'Maintenance' },
  { value: 'other',       label_ar: 'أخرى',      label_en: 'Other'       },
];

function catLabel(cat: ExpenseCategory, locale: string): string {
  const found = CATEGORIES.find((c) => c.value === cat);
  return found ? (locale === 'ar' ? found.label_ar : found.label_en) : cat;
}

// ── Date range helpers ──────────────────────────────────────────────────────

type RangeKey = 'today' | 'week' | 'month';

function getRangeDates(key: RangeKey): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  if (key === 'today') return { from: to, to };
  if (key === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { from: d.toISOString().split('T')[0], to };
  }
  // month
  const d = new Date(now);
  d.setDate(d.getDate() - 29);
  return { from: d.toISOString().split('T')[0], to };
}

function inRange(dateStr: string, from: string, to: string): boolean {
  const d = dateStr.split('T')[0]; // works for both ISO datetime and DATE strings
  return d >= from && d <= to;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialInvoices: Pick<Invoice, 'id' | 'net_total' | 'total' | 'discount' | 'created_at' | 'payment_method' | 'status'>[];
  initialExpenses: Expense[];
  defaultFrom: string;
  defaultTo: string;
}

const EMPTY_FORM = {
  category: 'rent' as ExpenseCategory,
  amount: '',
  date: new Date().toISOString().split('T')[0],
  notes: '',
};

// ── Component ────────────────────────────────────────────────────────────────

export function FinanceClient({ initialInvoices, initialExpenses }: Props) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const tCommon = useTranslations('common');
  const { shop } = useShop();

  const [rangeKey, setRangeKey] = useState<RangeKey>('month');
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { from, to } = useMemo(() => getRangeDates(rangeKey), [rangeKey]);

  // ── Filtered summaries ────────────────────────────────────────────────────

  const totalRevenue = useMemo(
    () => initialInvoices
      .filter((inv) => inRange(inv.created_at, from, to))
      .reduce((sum, inv) => sum + inv.net_total, 0),
    [initialInvoices, from, to]
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((e) => inRange(e.date, from, to)),
    [expenses, from, to]
  );

  const totalExpenses = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  const netProfit = totalRevenue - totalExpenses;
  const isProfitable = netProfit >= 0;

  // ── Add expense ───────────────────────────────────────────────────────────

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
        category: form.category,
        notes: form.notes || null,
        date: form.date,
        created_at: new Date().toISOString(),
      };
      setExpenses((prev) => [fake, ...prev]);
      toast.success(tCommon('success'));
      setShowForm(false);
      setForm(EMPTY_FORM);
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        shop_id: shop!.id,
        amount,
        category: form.category,
        notes: form.notes || null,
        date: form.date,
      })
      .select()
      .single<Expense>();

    if (!error && data) {
      setExpenses((prev) => [data, ...prev]);
      toast.success(tCommon('success'));
      setShowForm(false);
      setForm(EMPTY_FORM);
    } else {
      toast.error(tCommon('error'));
    }
    setSaving(false);
  }

  // ── Delete expense ────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteId) return;

    if (DEMO_MODE) {
      setExpenses((prev) => prev.filter((e) => e.id !== deleteId));
      toast.success(tCommon('success'));
      setDeleteId(null);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from('expenses').delete().eq('id', deleteId);
    if (!error) {
      setExpenses((prev) => prev.filter((e) => e.id !== deleteId));
      toast.success(tCommon('success'));
    } else {
      toast.error(tCommon('error'));
    }
    setDeleteId(null);
  }

  // ── Range label helpers ───────────────────────────────────────────────────

  const rangeLabels: Record<RangeKey, { ar: string; en: string }> = {
    today: { ar: 'اليوم', en: 'Today' },
    week:  { ar: 'هذا الأسبوع', en: 'This Week' },
    month: { ar: 'هذا الشهر', en: 'This Month' },
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title={locale === 'ar' ? 'المالية' : 'Finance'}
        subtitle={locale === 'ar' ? 'ملخص الأرباح وتتبع المصروفات' : 'Profit summary & expense tracking'}
        actions={
          <Button onClick={() => { setForm(EMPTY_FORM); setShowForm(true); }}>
            <Plus className="w-4 h-4" />
            {locale === 'ar' ? 'إضافة مصروف' : 'Add Expense'}
          </Button>
        }
      />

      {/* ── Date range filter ───────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {(['today', 'week', 'month'] as RangeKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setRangeKey(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              rangeKey === key
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {locale === 'ar' ? rangeLabels[key].ar : rangeLabels[key].en}
          </button>
        ))}
      </div>

      {/* ── Section A — Profit Summary ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Revenue card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-gray-500">
              {locale === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}
            </p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {totalRevenue.toLocaleString()}
            <span className="text-sm font-normal text-gray-400 ms-1">
              {locale === 'ar' ? 'ج' : 'EGP'}
            </span>
          </p>
        </div>

        {/* Expenses card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-sm font-medium text-gray-500">
              {locale === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses'}
            </p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {totalExpenses.toLocaleString()}
            <span className="text-sm font-normal text-gray-400 ms-1">
              {locale === 'ar' ? 'ج' : 'EGP'}
            </span>
          </p>
        </div>

        {/* Net profit card */}
        <div
          className={`rounded-2xl border p-5 ${
            isProfitable
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isProfitable ? 'bg-emerald-100' : 'bg-red-100'
              }`}
            >
              <Wallet
                className={`w-5 h-5 ${isProfitable ? 'text-emerald-700' : 'text-red-600'}`}
              />
            </div>
            <p
              className={`text-sm font-medium ${
                isProfitable ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              {locale === 'ar' ? 'صافي الربح' : 'Net Profit'}
            </p>
          </div>
          <p
            className={`text-2xl font-bold ${
              isProfitable ? 'text-emerald-800' : 'text-red-700'
            }`}
          >
            {isProfitable ? '' : '−'}
            {Math.abs(netProfit).toLocaleString()}
            <span className="text-sm font-normal ms-1 opacity-70">
              {locale === 'ar' ? 'ج' : 'EGP'}
            </span>
          </p>
        </div>
      </div>

      {/* ── Section B — Expenses Log ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">
            {locale === 'ar' ? 'سجل المصروفات' : 'Expenses Log'}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {filteredExpenses.length}{' '}
            {locale === 'ar' ? 'مصروف في الفترة المختارة' : 'expenses in selected period'}
          </p>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <TrendingDown className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">
              {locale === 'ar' ? 'لا توجد مصروفات في هذه الفترة' : 'No expenses in this period'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-start px-5 py-3 font-semibold text-gray-600">
                    {locale === 'ar' ? 'التاريخ' : 'Date'}
                  </th>
                  <th className="text-start px-5 py-3 font-semibold text-gray-600">
                    {locale === 'ar' ? 'الفئة' : 'Category'}
                  </th>
                  <th className="text-start px-5 py-3 font-semibold text-gray-600">
                    {locale === 'ar' ? 'المبلغ' : 'Amount'}
                  </th>
                  <th className="text-start px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">
                    {locale === 'ar' ? 'ملاحظات' : 'Notes'}
                  </th>
                  <th className="px-5 py-3 w-14" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(exp.date).toLocaleDateString(
                        locale === 'ar' ? 'ar-EG' : 'en-GB',
                        { day: 'numeric', month: 'short', year: 'numeric' }
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {catLabel(exp.category, locale)}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-900">
                      {exp.amount.toLocaleString()}
                      <span className="text-xs font-normal text-gray-400 ms-1">
                        {locale === 'ar' ? 'ج' : 'EGP'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 hidden md:table-cell">
                      {exp.notes ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setDeleteId(exp.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                        title={locale === 'ar' ? 'حذف' : 'Delete'}
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

      {/* ── Add Expense Modal ───────────────────────────────────────────── */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={locale === 'ar' ? 'إضافة مصروف' : 'Add Expense'}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label={locale === 'ar' ? 'الفئة' : 'Category'}
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {locale === 'ar' ? c.label_ar : c.label_en}
                </option>
              ))}
            </Select>
            <Input
              label={locale === 'ar' ? 'المبلغ (ج)' : 'Amount (EGP)'}
              type="number"
              min={0}
              step={0.01}
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0"
            />
          </div>
          <Input
            label={locale === 'ar' ? 'التاريخ' : 'Date'}
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {locale === 'ar' ? 'ملاحظات (اختياري)' : 'Notes (optional)'}
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? tCommon('loading') : tCommon('save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete confirm ──────────────────────────────────────────────── */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title={locale === 'ar' ? 'حذف المصروف' : 'Delete Expense'}
        size="sm"
      >
        <div className="flex items-center gap-3 mb-5 text-amber-600">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm text-gray-600">
            {locale === 'ar'
              ? 'هل أنت متأكد من حذف هذا المصروف؟'
              : 'Are you sure you want to delete this expense?'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">
            {tCommon('cancel')}
          </Button>
          <Button variant="danger" onClick={handleDelete} className="flex-1">
            {tCommon('delete')}
          </Button>
        </div>
      </Modal>
    </>
  );
}

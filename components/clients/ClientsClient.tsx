'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, Search, Trash2, Edit2, Phone, Eye, Hash, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useShop } from '@/lib/hooks/useShop';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { ClientHistory } from './ClientHistory';
import { formatClientCode } from '@/lib/utils';
import type { Client } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

interface Props {
  initialClients: Client[];
}

const EMPTY_FORM = { name: '', phone: '', email: '', notes: '', code: '', sendDigitalInvoice: false };

export function ClientsClient({ initialClients }: Props) {
  const t = useTranslations('clients');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { shop } = useShop();

  const [clients, setClients] = useState<Client[]>(initialClients);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ── Sorting state ──────────────────────────────────────────────────────────
  type SortCol = 'code' | 'name' | 'phone' | 'email';
  const [sortCol, setSortCol] = useState<SortCol | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);

  function handleSort(col: SortCol) {
    if (sortCol !== col) {
      setSortCol(col);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else if (sortDir === 'desc') {
      setSortCol(null);
      setSortDir(null);
    } else {
      setSortDir('asc');
    }
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition" />;
    if (sortDir === 'asc') return <ChevronUp className="w-3.5 h-3.5 text-blue-500" />;
    return <ChevronDown className="w-3.5 h-3.5 text-blue-500" />;
  }

  const filtered = useMemo(() => {
    const base = clients.filter((c) => {
      const s = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(s) ||
        (c.phone ?? '').toLowerCase().includes(s) ||
        (c.email ?? '').toLowerCase().includes(s) ||
        (c.code != null && String(c.code).includes(s)) ||
        (c.code != null && formatClientCode(c.code).includes(s))
      );
    });

    if (!sortCol || !sortDir) return base;

    return [...base].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      if (sortCol === 'code') { aVal = a.code ?? 0; bVal = b.code ?? 0; }
      else if (sortCol === 'name') { aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); }
      else if (sortCol === 'phone') { aVal = (a.phone ?? '').toLowerCase(); bVal = (b.phone ?? '').toLowerCase(); }
      else if (sortCol === 'email') { aVal = (a.email ?? '').toLowerCase(); bVal = (b.email ?? '').toLowerCase(); }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [clients, search, sortCol, sortDir]);

  function openNew() {
    const maxCode = clients.reduce((max, c) => (c.code != null && c.code > max ? c.code : max), 0);
    setForm({ name: '', phone: '', email: '', notes: '', code: String(maxCode + 1), sendDigitalInvoice: false });
    setEditingId(null);
    setFieldErrors({});
    setShowForm(true);
  }

  function openEdit(c: Client) {
    setForm({ name: c.name, phone: c.phone ?? c.whatsapp ?? '', email: c.email ?? '', notes: c.notes ?? '', code: String(c.code ?? ''), sendDigitalInvoice: c.send_digital_invoice ?? false });
    setEditingId(c.id);
    setFieldErrors({});
    setShowForm(true);
  }

  async function handleSave() {
    const errs: Record<string, string> = {};

    // Name validation
    if (!form.name.trim()) {
      errs.name = locale === 'ar' ? 'الاسم مطلوب' : 'Name is required';
    }

    // Phone validation
    if (!form.phone.trim()) {
      errs.phone = locale === 'ar' ? 'الهاتف مطلوب' : 'Phone is required';
    } else {
      const egPhoneRegex = /^01[0125]\d{8}$/;
      if (!egPhoneRegex.test(form.phone.trim())) {
        errs.phone = locale === 'ar'
          ? 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678)'
          : 'Please enter a valid Egyptian phone number (e.g. 01012345678)';
      }
    }

    // Email validation — optional, only validate format if provided
    if (form.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        errs.email = locale === 'ar'
          ? 'يرجى إدخال بريد إلكتروني صحيح'
          : 'Please enter a valid email address';
      }
    }

    // Code validation
    if (!form.code.trim()) {
      errs.code = locale === 'ar' ? 'الكود مطلوب' : 'Code is required';
    } else {
      const parsedCode = parseInt(form.code, 10);
      if (isNaN(parsedCode) || parsedCode < 1) {
        errs.code = locale === 'ar' ? 'الكود يجب أن يكون رقماً أكبر من 0' : 'Code must be a number greater than 0';
      } else {
        const duplicate = clients.find((c) => c.code === parsedCode && c.id !== editingId);
        if (duplicate) {
          errs.code = locale === 'ar'
            ? 'هذا الكود مستخدم بالفعل. يرجى اختيار كود آخر.'
            : 'This code is already taken. Please choose a different one.';
        }
      }
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    const clientCode = form.code ? parseInt(form.code, 10) : null;

    if (DEMO_MODE) {
      if (editingId) {
        setClients((prev) => prev.map((c) => c.id === editingId ? {
          ...c,
          name: form.name.trim(),
          phone: form.phone || null,
          whatsapp: form.phone || null,
          email: form.email || null,
          notes: form.notes || null,
          code: clientCode || undefined
        } : c));
      } else {
        const fakeClient: Client = {
          id: 'demo-client-' + Math.random().toString(36).slice(2, 8),
          shop_id: shop?.id ?? 'demo-shop-001',
          name: form.name.trim(),
          phone: form.phone || null,
          whatsapp: form.phone || null,
          email: form.email || null,
          notes: form.notes || null,
          code: clientCode || undefined,
          created_at: new Date().toISOString(),
        };
        setClients((prev) => [fakeClient, ...prev]);
      }
      toast.success(tCommon('success'));
      setShowForm(false);
      setSaving(false);
      return;
    }

    const supabase = createClient();

    if (editingId) {
      const { error } = await supabase
        .from('clients')
        .update({ name: form.name.trim(), phone: form.phone || null, whatsapp: form.phone || null, email: form.email || null, notes: form.notes || null, send_digital_invoice: form.email ? form.sendDigitalInvoice : false })
        .eq('id', editingId);

      if (!error) {
        setClients((prev) => prev.map((c) => c.id === editingId ? {
          ...c,
          name: form.name.trim(),
          phone: form.phone || null,
          whatsapp: form.phone || null,
          email: form.email || null,
          notes: form.notes || null,
          send_digital_invoice: form.email ? form.sendDigitalInvoice : false
        } : c));
        toast.success(tCommon('success'));
        setShowForm(false);
      } else {
        toast.error(tCommon('error'));
      }
    } else {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          shop_id: shop!.id,
          name: form.name.trim(),
          phone: form.phone || null,
          whatsapp: form.phone || null,
          email: form.email || null,
          notes: form.notes || null,
          code: clientCode,
          send_digital_invoice: form.email ? form.sendDigitalInvoice : false
        })
        .select()
        .single<Client>();

      if (!error && data) {
        setClients((prev) => [data, ...prev]);
        toast.success(tCommon('success'));
        setShowForm(false);
      } else {
        toast.error(tCommon('error'));
      }
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    if (DEMO_MODE) {
      setClients((prev) => prev.filter((c) => c.id !== deleteId));
      toast.success(tCommon('success'));
      setDeleteId(null);
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from('clients').delete().eq('id', deleteId);
    if (!error) {
      setClients((prev) => prev.filter((c) => c.id !== deleteId));
      toast.success(tCommon('success'));
    }
    setDeleteId(null);
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={`${clients.length} ${locale === 'ar' ? 'عميل' : 'clients'}`}
        actions={
          <Button onClick={openNew}>
            <Plus className="w-4 h-4" />
            {t('newClient')}
          </Button>
        }
      />

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={locale === 'ar' ? 'البحث بالاسم، الهاتف، البريد الإلكتروني أو كود العميل' : 'Search by name, phone, email or code'}
          className="w-full ps-9 pe-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">{t('noClients')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-start px-4 py-3 font-semibold text-gray-600 w-24">
                    <button onClick={() => handleSort('code')} className="group flex items-center gap-1 hover:text-blue-600 transition">
                      <Hash className="w-3.5 h-3.5" />
                      {locale === 'ar' ? 'الكود' : 'Code'}
                      <SortIcon col="code" />
                    </button>
                  </th>
                  <th className="text-start px-4 py-3 font-semibold text-gray-600">
                    <button onClick={() => handleSort('name')} className="group flex items-center gap-1 hover:text-blue-600 transition">
                      {t('name')}
                      <SortIcon col="name" />
                    </button>
                  </th>
                  <th className="text-start px-4 py-3 font-semibold text-gray-600">
                    <button onClick={() => handleSort('phone')} className="group flex items-center gap-1 hover:text-blue-600 transition">
                      {t('phone')}
                      <SortIcon col="phone" />
                    </button>
                  </th>
                  <th className="text-start px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">
                    <button onClick={() => handleSort('email')} className="group flex items-center gap-1 hover:text-blue-600 transition">
                      {t('email')}
                      <SortIcon col="email" />
                    </button>
                  </th>
                  <th className="px-4 py-3 w-36">{tCommon('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      {c.code != null
                        ? <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{formatClientCode(c.code)}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:text-blue-600">
                          <Phone className="w-3.5 h-3.5" />
                          {c.phone}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{c.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewingClient(c)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                          title={tCommon('view')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 transition"
                          title={tCommon('edit')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(c.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                          title={tCommon('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? t('editClient') : t('newClient')}
        size="md"
      >
        <div className="space-y-4">
          <Input label={t('name')} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required error={fieldErrors.name} />
          <Input
            label={locale === 'ar' ? 'الهاتف (واتساب)' : 'Phone (WhatsApp)'}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            type="tel"
            error={fieldErrors.phone}
          />
          <Input label={`${t('email')} (${locale === 'ar' ? 'اختياري' : 'optional'})`} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} type="email" error={fieldErrors.email} />

          {/* Send Digital Invoice toggle */}
          <div className={`flex items-center justify-between px-4 py-3 rounded-xl border transition ${form.email ? 'border-gray-200 bg-gray-50' : 'border-gray-100 bg-gray-50 opacity-50'}`}>
            <div>
              <p className="text-sm font-medium text-gray-700">
                {locale === 'ar' ? 'إرسال فاتورة رقمية' : 'Send Digital Invoice'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {locale === 'ar'
                  ? (form.email ? 'سيتم إرسال الفاتورة على البريد الإلكتروني' : 'أدخل البريد الإلكتروني أولاً')
                  : (form.email ? 'Invoice will be sent to their email' : 'Enter email first to enable')}
              </p>
            </div>
            <button
              type="button"
              disabled={!form.email}
              onClick={() => form.email && setForm((f) => ({ ...f, sendDigitalInvoice: !f.sendDigitalInvoice }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${form.sendDigitalInvoice && form.email ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.sendDigitalInvoice && form.email ? (locale === 'ar' ? '-translate-x-6' : 'translate-x-6') : 'translate-x-1'}`}
              />
            </button>
          </div>

          {editingId ? (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                {locale === 'ar' ? 'الكود' : 'Code'}
              </label>
              <div className="font-semibold text-gray-900 bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-xl text-sm select-none">
                #{form.code}
              </div>
            </div>
          ) : (
            <Input
              label={locale === 'ar' ? 'الكود' : 'Code'}
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              type="number"
              min={1}
              error={fieldErrors.code}
            />
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('notes')}</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">{tCommon('cancel')}</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? tCommon('loading') : tCommon('save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title={t('deleteClient')} size="sm">
        <p className="text-gray-600 mb-5">{t('deleteConfirm')}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">{tCommon('cancel')}</Button>
          <Button variant="danger" onClick={handleDelete} className="flex-1">{tCommon('delete')}</Button>
        </div>
      </Modal>

      {/* Client history drawer */}
      {viewingClient && (
        <ClientHistory client={viewingClient} onClose={() => setViewingClient(null)} />
      )}
    </>
  );
}

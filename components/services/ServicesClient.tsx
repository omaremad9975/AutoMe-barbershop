'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, Edit2, Trash2, Package, Scissors } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useShop } from '@/lib/hooks/useShop';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency } from '@/lib/utils';
import type { Service } from '@/lib/types';

interface Props {
  initialServices: Service[];
}

const EMPTY_FORM = {
  name_ar: '', name_en: '', price: '', duration_minutes: '30',
  is_package: false, active: true, selected_service_ids: [] as string[],
};

export function ServicesClient({ initialServices }: Props) {
  const t = useTranslations('services');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { shop } = useShop();

  const [services, setServices] = useState<Service[]>(initialServices);
  const [tab, setTab] = useState<'services' | 'packages'>('services');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const baseServices = services.filter((s) => !s.is_package);
  const packages = services.filter((s) => s.is_package);
  const displayList = tab === 'services' ? baseServices : packages;

  const serviceName = (s: Service) => locale === 'ar' ? s.name_ar : s.name_en;

  function openNew(isPackage: boolean) {
    setForm({ ...EMPTY_FORM, is_package: isPackage });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(s: Service) {
    const selectedIds = s.package_items?.map((pi) => pi.service_id) ?? [];
    setForm({
      name_ar: s.name_ar,
      name_en: s.name_en,
      price: String(s.price),
      duration_minutes: String(s.duration_minutes),
      is_package: s.is_package,
      active: s.active,
      selected_service_ids: selectedIds,
    });
    setEditingId(s.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name_ar.trim() || !form.name_en.trim()) return;
    setSaving(true);
    const supabase = createClient();

    const payload = {
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim(),
      price: parseFloat(form.price) || 0,
      duration_minutes: parseInt(form.duration_minutes) || 30,
      is_package: form.is_package,
      active: form.active,
      shop_id: shop!.id,
    };

    if (editingId) {
      const { error } = await supabase.from('services').update(payload).eq('id', editingId);
      if (error) { toast.error(tCommon('error')); setSaving(false); return; }

      if (form.is_package) {
        await supabase.from('package_items').delete().eq('package_id', editingId);
        if (form.selected_service_ids.length > 0) {
          await supabase.from('package_items').insert(
            form.selected_service_ids.map((sid) => ({ package_id: editingId, service_id: sid }))
          );
        }
      }

      // Reload to get fresh data with package_items
      const { data: fresh } = await supabase
        .from('services')
        .select('*, package_items!package_id(id, service_id, service:services!service_id(id, name_ar, name_en, price))')
        .order('name_ar');
      setServices((fresh ?? []) as Service[]);
    } else {
      const { data: created, error } = await supabase
        .from('services').insert(payload).select().single<Service>();

      if (error || !created) { toast.error(tCommon('error')); setSaving(false); return; }

      if (form.is_package && form.selected_service_ids.length > 0) {
        await supabase.from('package_items').insert(
          form.selected_service_ids.map((sid) => ({ package_id: created.id, service_id: sid }))
        );
      }

      const { data: fresh } = await supabase
        .from('services')
        .select('*, package_items!package_id(id, service_id, service:services!service_id(id, name_ar, name_en, price))')
        .order('name_ar');
      setServices((fresh ?? []) as Service[]);
    }

    toast.success(tCommon('success'));
    setShowForm(false);
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    const supabase = createClient();
    const { error } = await supabase.from('services').delete().eq('id', deleteId);
    if (error) {
      if (error.code === '23503') {
        // Foreign key — service is used in invoices, deactivate instead
        await supabase.from('services').update({ is_active: false }).eq('id', deleteId);
        setServices((prev) => prev.map((s) => s.id === deleteId ? { ...s, is_active: false } : s));
        toast.info(locale === 'ar'
          ? 'الخدمة مستخدمة في فواتير سابقة — تم إيقافها بدلاً من حذفها'
          : 'Service is used in past invoices — deactivated instead of deleted');
      } else {
        toast.error(locale === 'ar' ? `فشل الحذف: ${error.message}` : `Delete failed: ${error.message}`);
      }
    } else {
      setServices((prev) => prev.filter((s) => s.id !== deleteId));
      toast.success(tCommon('success'));
    }
    setDeleteId(null);
  }

  async function toggleActive(s: Service) {
    const supabase = createClient();
    const { error } = await supabase
      .from('services').update({ active: !s.active }).eq('id', s.id);
    if (!error) {
      setServices((prev) => prev.map((item) => item.id === s.id ? { ...item, active: !s.active } : item));
    }
  }

  function toggleServiceInPackage(serviceId: string) {
    setForm((f) => ({
      ...f,
      selected_service_ids: f.selected_service_ids.includes(serviceId)
        ? f.selected_service_ids.filter((id) => id !== serviceId)
        : [...f.selected_service_ids, serviceId],
    }));
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openNew(false)}>
              <Scissors className="w-4 h-4" />
              {t('newService')}
            </Button>
            <Button onClick={() => openNew(true)}>
              <Package className="w-4 h-4" />
              {t('newPackage')}
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-5">
        {(['services', 'packages'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t(key)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayList.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">
            {tab === 'services' ? t('noServices') : t('noPackages')}
          </div>
        ) : (
          displayList.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{serviceName(s)}</p>
                  <p className="text-xs text-gray-400">{locale === 'ar' ? s.name_en : s.name_ar}</p>
                </div>
                <Badge variant={s.active ? 'green' : 'gray'}>
                  {s.active ? tCommon('active') : tCommon('inactive')}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-gray-900">{formatCurrency(s.price)}</span>
                <span className="text-gray-400">{s.duration_minutes} {t('minutes')}</span>
              </div>

              {s.is_package && s.package_items && s.package_items.length > 0 && (
                <div className="text-xs text-gray-500 border-t border-gray-100 pt-2">
                  {s.package_items.map((pi) => (
                    <span key={pi.id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full me-1 mb-1">
                      {pi.service ? (locale === 'ar' ? pi.service.name_ar : pi.service.name_en) : '—'}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                <button onClick={() => toggleActive(s)} className="text-xs text-gray-400 hover:text-gray-600 flex-1">
                  {s.active
                    ? (locale === 'ar' ? 'إيقاف' : 'Deactivate')
                    : (locale === 'ar' ? 'تفعيل' : 'Activate')}
                </button>
                <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-600 hover:bg-yellow-50">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? t('editService') : form.is_package ? t('newPackage') : t('newService')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('nameAr')} value={form.name_ar} onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))} placeholder="قص الشعر" />
            <Input label={t('nameEn')} value={form.name_en} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} placeholder="Haircut" />
            <Input label={t('price')} type="number" min={0} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0" />
            <Input label={t('duration')} type="number" min={1} value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))} placeholder="30" />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="active" className="text-sm text-gray-700">{t('active')}</label>
          </div>

          {form.is_package && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{t('includedServices')}</p>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {baseServices.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 p-2 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={form.selected_service_ids.includes(s.id)}
                      onChange={() => toggleServiceInPackage(s.id)}
                      className="w-4 h-4 rounded"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{serviceName(s)}</p>
                      <p className="text-xs text-gray-400">{formatCurrency(s.price)}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">{tCommon('cancel')}</Button>
            <Button onClick={handleSave} disabled={saving || !form.name_ar.trim()} className="flex-1">
              {saving ? tCommon('loading') : tCommon('save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title={locale === 'ar' ? 'حذف الخدمة' : 'Delete Service'} size="sm">
        <p className="text-gray-600 mb-5">{t('deleteConfirm')}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">{tCommon('cancel')}</Button>
          <Button variant="danger" onClick={handleDelete} className="flex-1">{tCommon('delete')}</Button>
        </div>
      </Modal>
    </>
  );
}

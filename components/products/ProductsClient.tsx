'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useShop } from '@/lib/hooks/useShop';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

interface Props { initialProducts: Product[]; }

const EMPTY_FORM = { name_ar: '', name_en: '', price: '', description: '', stock_qty: '0', active: true };

export function ProductsClient({ initialProducts }: Props) {
  const t = useTranslations('products');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { shop } = useShop();

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const productName = (p: Product) => locale === 'ar' ? p.name_ar : p.name_en;

  function openNew() { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); }

  function openEdit(p: Product) {
    setForm({
      name_ar: p.name_ar, name_en: p.name_en,
      price: String(p.price), description: p.description ?? '',
      stock_qty: String(p.stock_qty), active: p.active,
    });
    setEditingId(p.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name_ar.trim() || !form.name_en.trim()) return;
    setSaving(true);

    const payload = {
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim(),
      price: parseFloat(form.price) || 0,
      description: form.description.trim() || null,
      stock_qty: parseInt(form.stock_qty) || 0,
      active: form.active,
      shop_id: shop!.id,
    };

    if (DEMO_MODE) {
      if (editingId) {
        setProducts((prev) => prev.map((p) => p.id === editingId ? { ...p, ...payload } : p));
      } else {
        const fake: Product = { id: 'demo-pr-' + Math.random().toString(36).slice(2, 8), created_at: new Date().toISOString(), ...payload };
        setProducts((prev) => [...prev, fake]);
      }
      toast.success(tCommon('success'));
      setShowForm(false);
      setSaving(false);
      return;
    }

    const supabase = createClient();
    if (editingId) {
      const { error } = await supabase.from('products').update(payload).eq('id', editingId);
      if (!error) { setProducts((prev) => prev.map((p) => p.id === editingId ? { ...p, ...payload } : p)); toast.success(tCommon('success')); setShowForm(false); }
      else toast.error(tCommon('error'));
    } else {
      const { data, error } = await supabase.from('products').insert(payload).select().single<Product>();
      if (!error && data) { setProducts((prev) => [...prev, data]); toast.success(tCommon('success')); setShowForm(false); }
      else toast.error(tCommon('error'));
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    if (DEMO_MODE) { setProducts((prev) => prev.filter((p) => p.id !== deleteId)); toast.success(tCommon('success')); setDeleteId(null); return; }
    const supabase = createClient();
    const { error } = await supabase.from('products').delete().eq('id', deleteId);
    if (!error) { setProducts((prev) => prev.filter((p) => p.id !== deleteId)); toast.success(tCommon('success')); }
    setDeleteId(null);
  }

  async function toggleActive(p: Product) {
    const newActive = !p.active;
    setProducts((prev) => prev.map((item) => item.id === p.id ? { ...item, active: newActive } : item));
    if (DEMO_MODE) return;
    const supabase = createClient();
    await supabase.from('products').update({ active: newActive }).eq('id', p.id);
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={`${products.length} ${locale === 'ar' ? 'منتج' : 'products'}`}
        actions={
          <Button onClick={openNew}>
            <Plus className="w-4 h-4" />
            {t('newProduct')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">{t('noProducts')}</div>
        ) : (
          products.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 shrink-0">
                    <Package className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{productName(p)}</p>
                    <p className="text-xs text-gray-400 truncate">{locale === 'ar' ? p.name_en : p.name_ar}</p>
                  </div>
                </div>
                <Badge variant={p.active ? 'green' : 'gray'}>
                  {p.active ? tCommon('active') : tCommon('inactive')}
                </Badge>
              </div>

              {p.description && (
                <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-gray-900">{formatCurrency(p.price)}</span>
                <Badge variant={p.stock_qty > 0 ? 'blue' : 'red'}>
                  {p.stock_qty > 0
                    ? `${p.stock_qty} ${locale === 'ar' ? 'قطعة' : 'pcs'}`
                    : t('outOfStock')}
                </Badge>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => toggleActive(p)}
                  className="text-xs text-gray-400 hover:text-gray-600 flex-1"
                >
                  {p.active ? (locale === 'ar' ? 'إيقاف' : 'Deactivate') : (locale === 'ar' ? 'تفعيل' : 'Activate')}
                </button>
                <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 transition">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? t('editProduct') : t('newProduct')} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('nameAr')} value={form.name_ar} onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))} placeholder="شامبو رجالي" />
            <Input label={t('nameEn')} value={form.name_en} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} placeholder="Men Shampoo" />
            <Input label={t('price')} type="number" min={0} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0" />
            <Input label={t('stockQty')} type="number" min={0} value={form.stock_qty} onChange={(e) => setForm((f) => ({ ...f, stock_qty: e.target.value }))} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('description')}</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
              placeholder={locale === 'ar' ? 'وصف اختياري...' : 'Optional description...'}
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="prod-active" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="w-4 h-4 rounded" />
            <label htmlFor="prod-active" className="text-sm text-gray-700">{t('active')}</label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">{tCommon('cancel')}</Button>
            <Button onClick={handleSave} disabled={saving || !form.name_ar.trim()} className="flex-1">
              {saving ? tCommon('loading') : tCommon('save')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title={t('editProduct')} size="sm">
        <p className="text-gray-600 mb-5">{t('deleteConfirm')}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">{tCommon('cancel')}</Button>
          <Button variant="danger" onClick={handleDelete} className="flex-1">{tCommon('delete')}</Button>
        </div>
      </Modal>
    </>
  );
}

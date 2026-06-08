'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, Minus, Trash2, Printer, Search, X, Percent, DollarSign, Package } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useShop } from '@/lib/hooks/useShop';
import { DEMO_SHOP, DEMO_USER } from '@/lib/demo/data';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Receipt } from './Receipt';
import { QuickAddClient } from './QuickAddClient';
import { formatCurrency, formatClientCode } from '@/lib/utils';
import type { Client, Service, Employee, Product, CartItem, Invoice, InvoiceItem, PaymentMethod } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

interface Props {
  initialClients: Client[];
  initialServices: Service[];
  initialEmployees: Employee[];
  initialProducts: Product[];
}

const PAYMENT_METHODS: { value: PaymentMethod; labelKey: string }[] = [
  { value: 'cash', labelKey: 'cash' },
  { value: 'card', labelKey: 'card' },
  { value: 'instapay', labelKey: 'instapay' },
  { value: 'vodafone_cash', labelKey: 'vodafoneCash' },
];

function serviceToCartItem(s: Service): CartItem {
  return { id: s.id, type: 'service', name_ar: s.name_ar, name_en: s.name_en, price: s.price, quantity: 1, is_package: s.is_package };
}
function productToCartItem(p: Product): CartItem {
  return { id: p.id, type: 'product', name_ar: p.name_ar, name_en: p.name_en, price: p.price, quantity: 1 };
}

export function POSClient({ initialClients, initialServices, initialEmployees, initialProducts }: Props) {
  const t = useTranslations('pos');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { shop, currentUser } = useShop();

  const [clients, setClients] = useState<Client[]>(initialClients);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountValue, setDiscountValue] = useState<number>(0);

  const [pickerTab, setPickerTab] = useState<'services' | 'products'>('services');

  const [saving, setSaving] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState<Invoice | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = discountType === 'percent'
    ? Math.min(subtotal, (subtotal * discountValue) / 100)
    : Math.min(subtotal, discountValue);
  const netTotal = Math.max(0, subtotal - discountAmount);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const clientResults = clientSearch.trim().length >= 1
    ? clients.filter((c) => {
      const q = clientSearch.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.code != null && String(c.code).includes(q)) ||
        (c.code != null && formatClientCode(c.code).toLowerCase().includes(q))
      );
    }).slice(0, 8)
    : [];

  function selectClient(c: Client) {
    setSelectedClient(c);
    setClientSearch(c.name);
    setShowClientDropdown(false);
  }
  function clearClient() {
    setSelectedClient(null);
    setClientSearch('');
  }

  function addToCart(item: CartItem) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id && i.type === item.type);
      if (existing) return prev.map((i) => i.id === item.id && i.type === item.type ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, item];
    });
  }

  function updateQuantity(id: string, type: CartItem['type'], delta: number) {
    setCart((prev) =>
      prev
        .map((i) => i.id === id && i.type === type ? { ...i, quantity: i.quantity + delta } : i)
        .filter((i) => i.quantity > 0)
    );
  }

  function removeFromCart(id: string, type: CartItem['type']) {
    setCart((prev) => prev.filter((i) => !(i.id === id && i.type === type)));
  }

  const itemName = (item: CartItem) => locale === 'ar' ? item.name_ar : item.name_en;

  async function handleSave() {
    if (cart.length === 0) {
      toast.error(locale === 'ar' ? 'أضف خدمة أو منتجاً واحداً على الأقل' : 'Add at least one item');
      return;
    }
    setSaving(true);

    if (DEMO_MODE) {
      const fakeId = 'demo-' + Math.random().toString(36).slice(2, 10);
      const employee = initialEmployees.find((e) => e.id === selectedEmployeeId) ?? null;
      setSavedInvoice({
        id: fakeId, shop_id: DEMO_SHOP.id,
        client_id: selectedClient?.id ?? null, employee_id: selectedEmployeeId || null,
        payment_method: paymentMethod, total: subtotal, discount: discountAmount,
        net_total: netTotal, status: 'paid', created_by: DEMO_USER.id,
        created_at: new Date().toISOString(),
        client: selectedClient ?? undefined, employee: employee ?? undefined,
        invoice_items: cart.map((item, idx) => ({
          id: `demo-item-${idx}`, invoice_id: fakeId,
          service_id: item.type === 'service' ? item.id : null,
          name_snapshot: itemName(item), price_snapshot: item.price, quantity: item.quantity,
        })),
      });
      setShowReceipt(true);
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        shop_id: shop!.id, client_id: selectedClient?.id ?? null,
        employee_id: selectedEmployeeId || null, payment_method: paymentMethod,
        total: subtotal, discount: discountAmount, net_total: netTotal,
        status: 'paid', created_by: currentUser!.id,
      })
      .select().single();

    if (error || !invoice) { toast.error(tCommon('error')); setSaving(false); return; }

    const items = cart.map((item) => ({
      invoice_id: invoice.id,
      service_id: item.type === 'service' ? item.id : null,
      name_snapshot: itemName(item),
      price_snapshot: item.price,
      quantity: item.quantity,
    }));
    await supabase.from('invoice_items').insert(items);

    const employee = initialEmployees.find((e) => e.id === selectedEmployeeId) ?? null;
    setSavedInvoice({ ...invoice, client: selectedClient ?? undefined, employee: employee ?? undefined, invoice_items: items as InvoiceItem[] });
    setShowReceipt(true);
    setSaving(false);
  }

  function resetPOS() {
    setCart([]); clearClient(); setSelectedEmployeeId('');
    setDiscountValue(0); setDiscountType('amount'); setPaymentMethod('cash');
    setShowReceipt(false); setSavedInvoice(null);
  }

  const activeServices = initialServices.filter((s) => s.active);
  const activeProducts = initialProducts.filter((p) => p.active);

  return (
    <>
      <PageHeader title={t('title')} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: item picker */}
        <div className="lg:col-span-3 space-y-4">
          {/* Client + Employee */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div ref={searchRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('selectClient')}</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text" value={clientSearch}
                    onChange={(e) => { setClientSearch(e.target.value); setSelectedClient(null); setShowClientDropdown(true); }}
                    onFocus={() => clientSearch.length >= 1 && setShowClientDropdown(true)}
                    placeholder={locale === 'ar' ? 'البحث بالاسم، الهاتف، البريد الإلكتروني أو كود العميل' : 'Search by name, phone, email or code'}
                    className="w-full ps-9 pe-8 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  {clientSearch && (
                    <button onClick={clearClient} className="absolute top-1/2 -translate-y-1/2 end-2 text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowQuickAdd(true)} title={t('newClient')}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {showClientDropdown && clientResults.length > 0 && (
                <div className="absolute z-30 top-full mt-1 start-0 end-0 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                  {clientResults.map((c) => (
                    <button key={c.id} onMouseDown={() => selectClient(c)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-start transition">
                      {c.code != null && <span className="font-mono text-xs text-gray-400 shrink-0">{formatClientCode(c.code)}</span>}
                      <span className="font-medium text-sm text-gray-800">{c.name}</span>
                      {c.phone && <span className="text-xs text-gray-400 ms-auto">{c.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
              {!selectedClient && <p className="text-xs text-gray-400 mt-1">{t('walkIn')}</p>}
              {selectedClient && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  ✓ {selectedClient.name}
                  {selectedClient.code != null && <span className="font-mono text-gray-400">{formatClientCode(selectedClient.code)}</span>}
                </p>
              )}
            </div>

            <Select label={t('selectEmployee')} value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}>
              <option value="">—</option>
              {initialEmployees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </Select>
          </div>

          {/* Services / Products tab picker */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-3">
              <button
                onClick={() => setPickerTab('services')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${pickerTab === 'services' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t('selectService')}
              </button>
              <button
                onClick={() => setPickerTab('products')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${pickerTab === 'products' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Package className="w-3.5 h-3.5" />
                {locale === 'ar' ? 'المنتجات' : 'Products'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[380px] overflow-y-auto">
              {pickerTab === 'services' ? (
                activeServices.map((s) => (
                  <button key={s.id} onClick={() => addToCart(serviceToCartItem(s))}
                    className="p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-start transition text-sm">
                    <p className="font-medium text-gray-800 truncate">{locale === 'ar' ? s.name_ar : s.name_en}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{formatCurrency(s.price)}</p>
                    {s.is_package && <span className="text-xs text-blue-600">{locale === 'ar' ? 'باقة' : 'Package'}</span>}
                  </button>
                ))
              ) : (
                activeProducts.map((p) => (
                  <button key={p.id} onClick={() => addToCart(productToCartItem(p))}
                    className="p-3 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-start transition text-sm">
                    <p className="font-medium text-gray-800 truncate">{locale === 'ar' ? p.name_ar : p.name_en}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{formatCurrency(p.price)}</p>
                    <p className="text-xs text-gray-400">{p.stock_qty} {locale === 'ar' ? 'قطعة' : 'pcs'}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Cart & checkout */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-gray-700">{locale === 'ar' ? 'الفاتورة' : 'Invoice'}</h3>

            <div className="space-y-2 min-h-[150px]">
              {cart.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">{t('noServicesAdded')}</p>
              ) : (
                cart.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {item.type === 'product' && <Package className="w-3 h-3 text-purple-400 shrink-0" />}
                        <p className="text-sm font-medium text-gray-800 truncate">{itemName(item)}</p>
                      </div>
                      <p className="text-xs text-gray-500">{formatCurrency(item.price)} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQuantity(item.id, item.type, -1)} className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-sm">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.type, 1)} className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm font-semibold w-20 text-end">{formatCurrency(item.price * item.quantity)}</p>
                    <button onClick={() => removeFromCart(item.id, item.type)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Discount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('discount')}</label>
              <div className="flex gap-2">
                <div className="flex rounded-xl border border-gray-200 overflow-hidden shrink-0">
                  <button
                    onClick={() => { setDiscountType('amount'); setDiscountValue(0); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition"
                    style={discountType === 'amount' ? { backgroundColor: 'var(--brand-color)', color: 'white' } : { backgroundColor: 'white', color: '#6b7280' }}
                  >
                    <DollarSign className="w-3 h-3" />{locale === 'ar' ? 'قيمة' : 'EGP'}
                  </button>
                  <button
                    onClick={() => { setDiscountType('percent'); setDiscountValue(0); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition"
                    style={discountType === 'percent' ? { backgroundColor: 'var(--brand-color)', color: 'white' } : { backgroundColor: 'white', color: '#6b7280' }}
                  >
                    <Percent className="w-3 h-3" />{locale === 'ar' ? 'نسبة' : '%'}
                  </button>
                </div>
                <input
                  type="number" min={0} max={discountType === 'percent' ? 100 : subtotal}
                  value={discountValue === 0 ? '' : discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                  placeholder={discountType === 'percent' ? '0%' : '0'}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none"
                />
              </div>
              {discountType === 'percent' && discountValue > 0 && (
                <p className="text-xs text-gray-400 mt-1">= {formatCurrency(discountAmount)}</p>
              )}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-100 pt-3 space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('subtotal')}</span><span>{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>{t('discountAmount')}{discountType === 'percent' && ` (${discountValue}%)`}</span>
                  <span>- {formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 pt-1">
                <span>{t('netTotal')}</span><span>{formatCurrency(netTotal)}</span>
              </div>
            </div>

            <Select label={t('paymentMethod')} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map((pm) => <option key={pm.value} value={pm.value}>{t(pm.labelKey as any)}</option>)}
            </Select>

            <Button disabled={saving || cart.length === 0} onClick={handleSave} size="lg" className="w-full">
              {saving ? tCommon('loading') : t('saveInvoice')}
            </Button>
          </div>
        </div>
      </div>

      <Modal open={showReceipt} onClose={resetPOS} title={t('receipt')} size="md">
        {savedInvoice && shop && (
          <div>
            <Receipt invoice={savedInvoice} shop={shop} locale={locale} />
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => window.print()} className="flex-1">
                <Printer className="w-4 h-4" />{tCommon('print')}
              </Button>
              <Button onClick={resetPOS} className="flex-1">
                {locale === 'ar' ? 'فاتورة جديدة' : 'New Invoice'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <QuickAddClient
        open={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onCreated={(client) => { setClients((prev) => [client, ...prev]); selectClient(client); setShowQuickAdd(false); }}
        shopId={shop?.id ?? ''}
        clients={clients}
      />
    </>
  );
}

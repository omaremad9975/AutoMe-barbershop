'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { Upload, Scissors, Check, Clock, Briefcase, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import type { Shop, ShiftConfig, ShiftSettings } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

interface Props {
  shop: Shop;
}

// #10 — 3 preset themes
const THEMES = [
  {
    id: 'default',
    label_ar: 'افتراضي',
    label_en: 'Default',
    preview: '#1a1a2e',
    sidebarClass: 'bg-[#1a1a2e]',
  },
  {
    id: 'light',
    label_ar: 'فاتح',
    label_en: 'Light',
    preview: '#f8fafc',
    sidebarClass: 'bg-[#f8fafc] border border-gray-200',
  },
  {
    id: 'dark',
    label_ar: 'داكن',
    label_en: 'Dark',
    preview: '#09090b',
    sidebarClass: 'bg-[#09090b]',
  },
] as const;

type ThemeId = 'default' | 'light' | 'dark';

const DEFAULT_SHIFTS_AR: ShiftConfig[] = [
  { id: 1, name: 'صباحي', start_time: '08:00', end_time: '14:00' },
  { id: 2, name: 'مسائي', start_time: '14:00', end_time: '22:00' },
  { id: 3, name: 'ليلي', start_time: '22:00', end_time: '08:00' },
];

const DEFAULT_SHIFTS_EN: ShiftConfig[] = [
  { id: 1, name: 'Morning', start_time: '08:00', end_time: '14:00' },
  { id: 2, name: 'Evening', start_time: '14:00', end_time: '22:00' },
  { id: 3, name: 'Night', start_time: '22:00', end_time: '08:00' },
];

const DEFAULT_POSITIONS = ['حلاق أول', 'حلاق', 'كاشير'];

export function SettingsClient({ shop }: Props) {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const DEFAULT_SHIFTS = locale === 'ar' ? DEFAULT_SHIFTS_AR : DEFAULT_SHIFTS_EN;

  const [name, setName] = useState(shop.name);
  const [logoUrl, setLogoUrl] = useState(shop.logo_url ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Shift settings — loaded client-side only to avoid hydration mismatch ──
  const [shiftCount, setShiftCount] = useState<1 | 2 | 3>(1);
  const [shifts, setShifts] = useState<ShiftConfig[]>(DEFAULT_SHIFTS.slice(0, 1));

  // ── Position settings ───────────────────────────────────────────────────
  const [positions, setPositions] = useState<string[]>(DEFAULT_POSITIONS);

  useEffect(() => {
    try {
      const savedShifts = localStorage.getItem('barber-shift-settings');
      if (savedShifts) {
        const parsed = JSON.parse(savedShifts) as ShiftSettings;
        setShiftCount(parsed.count);
        setShifts(parsed.shifts);
      }
      const savedPositions = localStorage.getItem('barber-position-settings');
      if (savedPositions) {
        setPositions(JSON.parse(savedPositions) as string[]);
      }
    } catch { }
  }, []);
  const [newPosition, setNewPosition] = useState('');

  function addPosition() {
    const trimmed = newPosition.trim();
    if (!trimmed || positions.includes(trimmed)) return;
    const next = [...positions, trimmed];
    setPositions(next);
    localStorage.setItem('barber-position-settings', JSON.stringify(next));
    setNewPosition('');
    toast.success(locale === 'ar' ? 'تم إضافة المنصب' : 'Position added');
  }

  function deletePosition(pos: string) {
    const next = positions.filter((p) => p !== pos);
    setPositions(next);
    localStorage.setItem('barber-position-settings', JSON.stringify(next));
    toast.success(locale === 'ar' ? 'تم حذف المنصب' : 'Position removed');
  }

  function handleShiftCountChange(val: 1 | 2 | 3) {
    setShiftCount(val);
    // Expand / shrink the shifts array while preserving existing edits
    setShifts((prev) => {
      const next: ShiftConfig[] = [];
      for (let i = 0; i < val; i++) {
        next.push(prev[i] ?? { ...DEFAULT_SHIFTS[i], id: i + 1 });
      }
      return next;
    });
  }

  function updateShift(index: number, field: keyof ShiftConfig, value: string) {
    setShifts((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  function saveShifts() {
    const settings: ShiftSettings = { count: shiftCount, shifts };
    localStorage.setItem('barber-shift-settings', JSON.stringify(settings));
    // TODO (Supabase): await supabase.from('shift_settings').upsert({ shop_id: shop.id, ...settings })
    toast.success(t('shiftsSaved'));
  }

  // #10 — active theme (client-side only)
  const [activeTheme, setActiveTheme] = useState<ThemeId>('default');

  useEffect(() => {
    const saved = localStorage.getItem('barber-theme') as ThemeId | null;
    if (saved) setActiveTheme(saved);
  }, []);

  function applyTheme(themeId: ThemeId) {
    setActiveTheme(themeId);
    localStorage.setItem('barber-theme', themeId);
    document.documentElement.setAttribute('data-theme', themeId);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(locale === 'ar' ? 'الملف كبير جداً (الحد 2MB)' : 'File too large (max 2MB)');
      return;
    }
    if (DEMO_MODE) {
      toast.info(locale === 'ar' ? 'رفع الشعار متاح عند الاتصال بـ Supabase' : 'Logo upload works when Supabase is connected');
      return;
    }
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split('.').pop();
    const path = `logos/${shop.id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('shop-assets')
      .upload(path, file, { upsert: true });
    if (uploadError) { toast.error(tCommon('error')); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('shop-assets').getPublicUrl(path);
    setLogoUrl(publicUrl);
    setUploading(false);
    toast.success(locale === 'ar' ? 'تم رفع الشعار' : 'Logo uploaded');
  }

  async function handleSave() {
    if (!name.trim()) return;
    if (DEMO_MODE) {
      toast.success(t('settingsSaved'));
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('shops')
      .update({ name: name.trim(), logo_url: logoUrl || null })
      .eq('id', shop.id);
    if (error) {
      toast.error(tCommon('error'));
    } else {
      toast.success(t('settingsSaved'));
    }
    setSaving(false);
  }

  return (
    <>
      <PageHeader title={t('title')} />

      <div className="max-w-2xl space-y-6">
        {/* Logo */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">{t('shopLogo')}</h3>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <Image src={logoUrl} alt="Logo" width={80} height={80} className="object-cover w-full h-full" />
              ) : (
                <Scissors className="w-8 h-8 text-gray-300" />
              )}
            </div>
            <div>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className="w-4 h-4" />
                {uploading ? '...' : t('uploadLogo')}
              </Button>
              <p className="text-xs text-gray-400 mt-1.5">{t('logoHint')}</p>
              <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.svg" className="hidden" onChange={handleLogoUpload} />
            </div>
          </div>
        </div>

        {/* Shop name — #9 slug field removed */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">{locale === 'ar' ? 'بيانات المحل' : 'Shop Details'}</h3>
          <Input label={t('shopName')} value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {/* #10 — Theme selector (replaces color picker) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-1">{locale === 'ar' ? 'مظهر النظام' : 'Theme'}</h3>
          <p className="text-sm text-gray-400 mb-4">
            {locale === 'ar' ? 'اختر مظهر الشريط الجانبي' : 'Choose the sidebar appearance'}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((theme) => {
              const isActive = activeTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => applyTheme(theme.id)}
                  className={`relative rounded-2xl border-2 overflow-hidden transition-all ${isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  {/* Mini sidebar preview */}
                  <div className="flex h-20">
                    <div
                      className={`w-10 flex flex-col items-center gap-1.5 pt-2 ${theme.sidebarClass}`}
                    >
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="w-5 h-1.5 rounded-full opacity-50"
                          style={{ backgroundColor: theme.id === 'light' ? '#475569' : 'white' }}
                        />
                      ))}
                    </div>
                    <div className="flex-1 bg-gray-50 flex items-end pb-2 ps-2">
                      <div className="space-y-1">
                        <div className="w-10 h-1.5 bg-gray-200 rounded" />
                        <div className="w-8 h-1.5 bg-gray-200 rounded" />
                      </div>
                    </div>
                  </div>
                  {/* Label */}
                  <div className="py-1.5 text-center text-xs font-medium text-gray-700 border-t border-gray-100">
                    {locale === 'ar' ? theme.label_ar : theme.label_en}
                  </div>
                  {/* Active checkmark */}
                  {isActive && (
                    <div className="absolute top-1.5 end-1.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Shift Configuration (owner-only page) ───────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-800">{t('shifts')}</h3>
          </div>
          <p className="text-sm text-gray-400 mb-5">
            {locale === 'ar'
              ? 'حدد عدد الورديات وأوقاتها لهذا المحل'
              : 'Configure the number of shifts and their times for this shop'}
          </p>

          {/* Shift count selector */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('shiftCount')}</label>
            <div className="flex gap-2">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => handleShiftCountChange(n)}
                  className={`w-12 h-10 rounded-xl border-2 text-sm font-semibold transition-all ${shiftCount === n
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Per-shift config rows */}
          <div className="space-y-4">
            {shifts.map((shift, idx) => (
              <div
                key={shift.id}
                className="rounded-xl border border-gray-100 bg-gray-50 p-4"
              >
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  {locale === 'ar' ? `الوردية ${idx + 1}` : `Shift ${idx + 1}`}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label={t('shiftName')}
                    value={shift.name}
                    onChange={(e) => updateShift(idx, 'name', e.target.value)}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('shiftStart')}</label>
                    <input
                      type="time"
                      value={shift.start_time}
                      onChange={(e) => updateShift(idx, 'start_time', e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('shiftEnd')}</label>
                    <input
                      type="time"
                      value={shift.end_time}
                      onChange={(e) => updateShift(idx, 'end_time', e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" onClick={saveShifts} className="mt-4 w-full">
            <Clock className="w-4 h-4" />
            {t('saveShifts')}
          </Button>
        </div>

        {/* ── Positions Section ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-800">
              {locale === 'ar' ? 'المناصب الوظيفية' : 'Positions'}
            </h3>
          </div>
          <p className="text-sm text-gray-400 mb-5">
            {locale === 'ar'
              ? 'أضف أو احذف المناصب المتاحة عند تسجيل الموظفين'
              : 'Add or remove positions available when registering employees'}
          </p>

          {/* Existing positions */}
          <div className="space-y-2 mb-4">
            {positions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                {locale === 'ar' ? 'لا توجد مناصب' : 'No positions yet'}
              </p>
            ) : (
              positions.map((pos) => (
                <div key={pos} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5">
                  <span className="text-sm font-medium text-gray-800">{pos}</span>
                  <button
                    onClick={() => deletePosition(pos)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                    title={locale === 'ar' ? 'حذف' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add new position */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPosition(); } }}
              placeholder={locale === 'ar' ? 'مثال: حلاق، كاشير، نظافة' : 'e.g. Barber, Cashier, Cleaner'}
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Button variant="outline" onClick={addPosition}>
              <Plus className="w-4 h-4" />
              {locale === 'ar' ? 'إضافة' : 'Add'}
            </Button>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} size="lg" className="w-full">
          {saving ? tCommon('loading') : t('saveSettings')}
        </Button>
      </div>
    </>
  );
}

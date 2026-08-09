'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, Edit2, Trash2, RotateCcw, KeyRound, ShieldCheck, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useShop } from '@/lib/hooks/useShop';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatDate } from '@/lib/utils';
import type { Employee } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

interface Props { initialEmployees: Employee[]; }




// #4 — translate stored Arabic values when locale is 'en'
const SHIFT_EN: Record<string, string> = { 'صباحي': 'Morning', 'مسائي': 'Evening' };
const POSITION_EN: Record<string, string> = {
  'حلاق': 'Barber',
  'حلاق أول': 'Senior Barber',
  'مساعد': 'Assistant',
};

function translateValue(value: string | null, map: Record<string, string>, locale: string): string | null {
  if (!value) return null;
  if (locale === 'en') return map[value] ?? value;
  return value;
}

/** Read positions from localStorage */
function getStoredPositions(): string[] {
  try {
    const raw = localStorage.getItem('barber-position-settings');
    if (raw) return JSON.parse(raw) as string[];
  } catch { }
  return ['حلاق أول', 'حلاق', 'كاشير'];
}

/** Read shifts from localStorage */
function getStoredShiftNames(): string[] {
  try {
    const raw = localStorage.getItem('barber-shift-settings');
    if (raw) {
      const settings = JSON.parse(raw) as { shifts: Array<{ name: string }> };
      return settings.shifts.map((s) => s.name);
    }
  } catch { }
  return ['الوردية الكاملة'];
}

export function EmployeesClient({ initialEmployees }: Props) {
  const t = useTranslations('employees');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { shop } = useShop();

  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);

  // Dynamic options from localStorage — loaded client-side only to avoid hydration mismatch
  const [positionOptions, setPositionOptions] = useState<string[]>(['حلاق أول', 'حلاق', 'كاشير']);
  const [shiftOptions, setShiftOptions] = useState<string[]>(['الوردية الكاملة']);

  useEffect(() => {
    setPositionOptions(getStoredPositions());
    setShiftOptions(getStoredShiftNames());
  }, []);

  // Default shift = first stored option, or fallback
  const defaultShift = shiftOptions[0] ?? 'الوردية الكاملة';
  const EMPTY_FORM = { name: '', phone: '', position: '', shift: defaultShift, hire_date: '', active: true };

  // #3 — active / inactive tab
  const [listMode, setListMode] = useState<'active' | 'inactive'>('active');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  // ── PIN management (attendance kiosk login) ──────────────────────────────
  const [pinModalEmp, setPinModalEmp] = useState<Employee | null>(null);
  const [pinValue, setPinValue] = useState('');
  const [pinSaving, setPinSaving] = useState(false);

  const PIN_ERROR_MESSAGES: Record<string, string> = {
    PIN_IN_USE: locale === 'ar' ? 'هذا الرمز مستخدم بالفعل لموظف آخر في هذا المحل' : 'This PIN is already used by another employee here',
    INVALID_PIN_FORMAT: locale === 'ar' ? 'اكتب رمزاً مكوّناً من 4 أرقام' : 'Enter a 4-digit code',
    NOT_OWNER: locale === 'ar' ? 'المالك فقط يمكنه تعديل الرموز' : 'Only the owner can manage PINs',
    EMPLOYEE_NOT_FOUND: locale === 'ar' ? 'الموظف غير موجود' : 'Employee not found',
  };

  function openPinModal(emp: Employee) {
    setPinModalEmp(emp);
    setPinValue('');
  }

  async function handleSavePin() {
    if (!pinModalEmp) return;
    if (!/^[0-9]{4}$/.test(pinValue)) {
      toast.error(PIN_ERROR_MESSAGES.INVALID_PIN_FORMAT);
      return;
    }
    setPinSaving(true);

    if (DEMO_MODE) {
      setEmployees((prev) => prev.map((e) => e.id === pinModalEmp.id ? { ...e, has_pin: true } : e));
      toast.success(tCommon('success'));
      setPinModalEmp(null);
      setPinValue('');
      setPinSaving(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.rpc('set_employee_pin', {
      p_employee_id: pinModalEmp.id, p_pin: pinValue,
    });

    if (error || !data?.success) {
      toast.error(PIN_ERROR_MESSAGES[data?.error] ?? tCommon('error'));
    } else {
      setEmployees((prev) => prev.map((e) => e.id === pinModalEmp.id ? { ...e, has_pin: true } : e));
      toast.success(tCommon('success'));
      setPinModalEmp(null);
      setPinValue('');
    }
    setPinSaving(false);
  }

  async function handleClearPin(emp: Employee) {
    if (DEMO_MODE) {
      setEmployees((prev) => prev.map((e) => e.id === emp.id ? { ...e, has_pin: false } : e));
      toast.success(tCommon('success'));
      return;
    }
    const supabase = createClient();
    const { data, error } = await supabase.rpc('clear_employee_pin', { p_employee_id: emp.id });
    if (!error && data?.success) {
      setEmployees((prev) => prev.map((e) => e.id === emp.id ? { ...e, has_pin: false } : e));
      toast.success(tCommon('success'));
    } else {
      toast.error(PIN_ERROR_MESSAGES[data?.error] ?? tCommon('error'));
    }
  }

  const displayed = employees.filter((e) => listMode === 'active' ? e.active : !e.active);

  function openNew() { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); }

  function openEdit(emp: Employee) {
    setForm({
      name: emp.name, phone: emp.phone ?? '',
      position: emp.position ?? '',
      shift: emp.shift ?? defaultShift,
      hire_date: emp.hire_date ?? '',
      active: emp.active,
    });
    setEditingId(emp.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      phone: form.phone || null,
      position: form.position || null,
      shift: form.shift || null,
      hire_date: form.hire_date || null,
      active: form.active,
      shop_id: shop!.id,
    };

    if (DEMO_MODE) {
      if (editingId) {
        setEmployees((prev) => prev.map((e) => e.id === editingId ? { ...e, ...payload } : e));
      } else {
        const fake: Employee = { id: 'demo-emp-' + Math.random().toString(36).slice(2, 8), created_at: new Date().toISOString(), ...payload };
        setEmployees((prev) => [...prev, fake]);
      }
      toast.success(tCommon('success'));
      setShowForm(false);
      setSaving(false);
      return;
    }

    const supabase = createClient();
    if (editingId) {
      const { error } = await supabase.from('employees').update(payload).eq('id', editingId);
      if (!error) { setEmployees((prev) => prev.map((e) => e.id === editingId ? { ...e, ...payload } : e)); toast.success(tCommon('success')); setShowForm(false); }
      else toast.error(tCommon('error'));
    } else {
      const { data, error } = await supabase.from('employees').insert(payload).select().single<Employee>();
      if (!error && data) { setEmployees((prev) => [...prev, data]); toast.success(tCommon('success')); setShowForm(false); }
      else toast.error(tCommon('error'));
    }
    setSaving(false);
  }

  // #3 — soft deactivate (set active: false instead of delete)
  async function handleDeactivate() {
    if (!deactivateId) return;
    const update = { active: false };
    setEmployees((prev) => prev.map((e) => e.id === deactivateId ? { ...e, ...update } : e));
    toast.success(tCommon('success'));
    setDeactivateId(null);
    if (DEMO_MODE) return;
    const supabase = createClient();
    await supabase.from('employees').update(update).eq('id', deactivateId);
  }

  // #3 — reactivate
  async function handleReactivate(id: string) {
    setEmployees((prev) => prev.map((e) => e.id === id ? { ...e, active: true } : e));
    toast.success(tCommon('success'));
    if (DEMO_MODE) return;
    const supabase = createClient();
    await supabase.from('employees').update({ active: true }).eq('id', id);
  }

  // #4 — formatted hire date with correct locale
  function fmtHireDate(date: string | null) {
    if (!date) return null;
    return formatDate(date, locale === 'ar' ? 'ar-EG' : 'en-US');
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={`${displayed.length} ${locale === 'ar' ? (listMode === 'active' ? 'موظف نشط' : 'موظف محذوف') : (listMode === 'active' ? 'active' : 'removed')}`}
        actions={
          listMode === 'active' ? (
            <Button onClick={openNew}>
              <Plus className="w-4 h-4" />
              {t('newEmployee')}
            </Button>
          ) : undefined
        }
      />

      {/* #3 — Active / Inactive toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-5">
        {(['active', 'inactive'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setListMode(mode)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              listMode === mode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {mode === 'active' ? t('activeEmployees') : t('inactiveEmployees')}
          </button>
        ))}
      </div>

      {/* Employee cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayed.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">
            {listMode === 'active' ? t('noEmployees') : t('noInactiveEmployees')}
          </div>
        ) : (
          displayed.map((emp) => {
            // #4 — translate display values in EN
            const displayShift = translateValue(emp.shift, SHIFT_EN, locale);
            const displayPosition = translateValue(emp.position, POSITION_EN, locale);

            return (
              <div key={emp.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: 'var(--brand-color)' }}
                  >
                    {emp.name[0]}
                  </div>
                  <Badge variant={emp.active ? 'green' : 'gray'}>
                    {emp.active ? tCommon('active') : tCommon('inactive')}
                  </Badge>
                </div>

                <p className="font-semibold text-gray-900">{emp.name}</p>
                {displayPosition && <p className="text-sm text-gray-500 mt-0.5">{displayPosition}</p>}

                <div className="mt-3 space-y-1 text-sm text-gray-500">
                  {emp.phone && <p>{emp.phone}</p>}
                  {displayShift && (
                    <p>{locale === 'ar' ? 'الوردية: ' : 'Shift: '}{displayShift}</p>
                  )}
                  {emp.hire_date && (
                    <p>{locale === 'ar' ? 'التعيين: ' : 'Hired: '}{fmtHireDate(emp.hire_date)}</p>
                  )}
                </div>

                {/* PIN status — used for attendance kiosk punch-in */}
                {listMode === 'active' && (
                  <div className="mt-3">
                    {emp.has_pin ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {locale === 'ar' ? 'الرمز مُفعّل' : 'PIN set'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                        <ShieldOff className="w-3.5 h-3.5" />
                        {locale === 'ar' ? 'لا يوجد رمز' : 'No PIN'}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                  {listMode === 'active' ? (
                    <>
                      <button
                        onClick={() => openEdit(emp)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-yellow-50 hover:text-yellow-700 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                        {tCommon('edit')}
                      </button>
                      <button
                        onClick={() => openPinModal(emp)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                      >
                        <KeyRound className="w-4 h-4" />
                        {emp.has_pin ? (locale === 'ar' ? 'تغيير الرمز' : 'Reset PIN') : (locale === 'ar' ? 'تعيين رمز' : 'Set PIN')}
                      </button>
                      <button
                        onClick={() => setDeactivateId(emp.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                        {tCommon('delete')}
                      </button>
                    </>
                  ) : (
                    /* #3 — reactivate button for inactive list */
                    <button
                      onClick={() => handleReactivate(emp.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm text-green-600 hover:bg-green-50 transition font-medium"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {t('reactivate')}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? t('editEmployee') : t('newEmployee')} size="md">
        <div className="space-y-4">
          <Input label={t('name')} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('phone')} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} type="tel" />
            {/* Position — dynamic dropdown from localStorage */}
            <Select
              label={t('position')}
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
            >
              <option value="">{locale === 'ar' ? '-- اختر المنصب --' : '-- Select position --'}</option>
              {positionOptions.map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Shift — dynamic dropdown from localStorage */}
            <Select
              label={t('shift')}
              value={form.shift}
              onChange={(e) => setForm((f) => ({ ...f, shift: e.target.value }))}
            >
              {shiftOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
            <Input label={t('hireDate')} value={form.hire_date} onChange={(e) => setForm((f) => ({ ...f, hire_date: e.target.value }))} type="date" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="emp-active" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="w-4 h-4 rounded" />
            <label htmlFor="emp-active" className="text-sm text-gray-700">{t('active')}</label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">{tCommon('cancel')}</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="flex-1">
              {saving ? tCommon('loading') : tCommon('save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deactivate confirm modal */}
      <Modal open={!!deactivateId} onClose={() => setDeactivateId(null)} title={locale === 'ar' ? 'إيقاف الموظف' : 'Remove Employee'} size="sm">
        <p className="text-gray-600 mb-5">{t('deactivateConfirm')}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setDeactivateId(null)} className="flex-1">{tCommon('cancel')}</Button>
          <Button variant="danger" onClick={handleDeactivate} className="flex-1">{tCommon('confirm')}</Button>
        </div>
      </Modal>

      {/* Set / Reset PIN modal — used for the attendance self-punch page */}
      <Modal
        open={!!pinModalEmp}
        onClose={() => { setPinModalEmp(null); setPinValue(''); }}
        title={pinModalEmp?.has_pin ? (locale === 'ar' ? 'تغيير الرمز السري' : 'Reset PIN') : (locale === 'ar' ? 'تعيين رمز سري' : 'Set PIN')}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {locale === 'ar'
              ? `رمز مكوّن من 4 أرقام يستخدمه ${pinModalEmp?.name ?? ''} لتسجيل الحضور والانصراف. المالك فقط لا يحتاج رمزاً.`
              : `A 4-digit code ${pinModalEmp?.name ?? ''} uses to punch in/out on the attendance page. Only the owner doesn't need one.`}
          </p>
          <Input
            label={locale === 'ar' ? 'الرمز (4 أرقام)' : 'PIN (4 digits)'}
            value={pinValue}
            onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
          />
          <div className="flex gap-3">
            {pinModalEmp?.has_pin && (
              <Button
                variant="outline"
                onClick={() => pinModalEmp && handleClearPin(pinModalEmp)}
                className="flex-1"
              >
                {locale === 'ar' ? 'إزالة الرمز' : 'Remove PIN'}
              </Button>
            )}
            <Button onClick={handleSavePin} disabled={pinSaving || pinValue.length !== 4} className="flex-1">
              {pinSaving ? tCommon('loading') : tCommon('save')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

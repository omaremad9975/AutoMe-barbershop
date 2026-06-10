'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronLeft, ChevronRight, Plus, Clock, User, Scissors, LayoutList, Calendar } from 'lucide-react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useShop } from '@/lib/hooks/useShop';
import { DEMO_APPOINTMENTS } from '@/lib/demo/data';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatTime12h } from '@/lib/utils';
import type { Appointment, Client, Employee, Service, AppointmentStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

interface Props {
  initialAppointments: Appointment[];
  initialClients: Client[];
  initialEmployees: Employee[];
  initialServices: Service[];
  initialDate: string;
}

const STATUS_BADGE: Record<AppointmentStatus, { variant: 'yellow' | 'blue' | 'green' | 'red'; label: { ar: string; en: string } }> = {
  pending: { variant: 'yellow', label: { ar: 'في الانتظار', en: 'Pending' } },
  confirmed: { variant: 'blue', label: { ar: 'مؤكد', en: 'Confirmed' } },
  done: { variant: 'green', label: { ar: 'منتهي', en: 'Done' } },
  cancelled: { variant: 'red', label: { ar: 'ملغي', en: 'Cancelled' } },
};

const STATUSES: AppointmentStatus[] = ['confirmed', 'done', 'cancelled'];

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00'
];

function getApptPosition(timeStr: string, durationMin: number = 30) {
  const [h, m] = timeStr.split(':').map(Number);
  const apptMin = h * 60 + m;
  const startMin = 8 * 60; // 8:00 AM
  const endMin = 22.5 * 60; // 10:30 PM

  const clampedApptMin = Math.max(startMin, Math.min(endMin, apptMin));
  const diffMin = clampedApptMin - startMin;

  const slotHeight = 48; // 48px per 30 minutes
  const top = (diffMin / 30) * slotHeight;
  const height = (durationMin / 30) * slotHeight;

  return { top, height };
}

const getSunday = (d: Date) => {
  const day = d.getDay();
  return subDays(d, day);
};

export function AppointmentsClient({
  initialAppointments, initialClients, initialEmployees, initialServices, initialDate,
}: Props) {
  const t = useTranslations('appointments');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { shop } = useShop();

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // #11 — view mode persisted in localStorage
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  useEffect(() => {
    const saved = localStorage.getItem('appointments-view') as 'list' | 'calendar' | null;
    if (saved) {
      setViewMode(saved);
      if (saved === 'calendar') {
        loadAppointments(initialDate, 'calendar');
      }
    }
  }, []);

  function setView(v: 'list' | 'calendar') {
    setViewMode(v);
    localStorage.setItem('appointments-view', v);
    loadAppointments(selectedDate, v);
  }

  const [form, setForm] = useState({
    client_id: '', employee_id: '', service_id: '',
    time: '10:00', notes: '', status: 'confirmed' as AppointmentStatus,
  });
  const [formDate, setFormDate] = useState(initialDate);
  const [clientSearch, setClientSearch] = useState('');
  const [clientDropdown, setClientDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const filteredClients = clientSearch.trim().length === 0
    ? initialClients.slice(0, 8)
    : initialClients.filter((c) =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        (c.phone ?? '').includes(clientSearch)
      ).slice(0, 8);

  async function loadAppointments(date: string, mode: 'list' | 'calendar') {
    setLoading(true);

    if (mode === 'calendar') {
      const d = parseISO(date);
      const start = format(getSunday(d), 'yyyy-MM-dd');
      const end = format(addDays(getSunday(d), 6), 'yyyy-MM-dd');

      if (DEMO_MODE) {
        setAppointments(DEMO_APPOINTMENTS.filter((a) => a.date >= start && a.date <= end));
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data } = await supabase
        .from('appointments')
        .select('*, client:clients(id,name,phone), employee:employees(id,name), service:services(id,name_ar,name_en,price,duration_minutes)')
        .gte('date', start)
        .lte('date', end)
        .order('time');
      setAppointments((data ?? []) as Appointment[]);
      setLoading(false);
      return;
    }

    if (DEMO_MODE) {
      setAppointments(DEMO_APPOINTMENTS.filter((a) => a.date === date));
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from('appointments')
      .select('*, client:clients(id,name,phone), employee:employees(id,name), service:services(id,name_ar,name_en,price,duration_minutes)')
      .eq('date', date).order('time');
    setAppointments((data ?? []) as Appointment[]);
    setLoading(false);
  }

  function handlePrev() {
    if (viewMode === 'calendar') {
      const newDate = format(subDays(parseISO(selectedDate), 7), 'yyyy-MM-dd');
      setSelectedDate(newDate);
      loadAppointments(newDate, 'calendar');
    } else {
      const newDate = format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd');
      setSelectedDate(newDate);
      loadAppointments(newDate, viewMode);
    }
  }

  function handleNext() {
    if (viewMode === 'calendar') {
      const newDate = format(addDays(parseISO(selectedDate), 7), 'yyyy-MM-dd');
      setSelectedDate(newDate);
      loadAppointments(newDate, 'calendar');
    } else {
      const newDate = format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd');
      setSelectedDate(newDate);
      loadAppointments(newDate, viewMode);
    }
  }

  async function handleCreate() {
    if (!form.time) return;
    setFormError('');

    // #6 — past date/time validation
    const appointmentDateTime = new Date(`${formDate}T${form.time}`);
    if (appointmentDateTime < new Date()) {
      setFormError('لا يمكن إنشاء موعد في تاريخ أو وقت سابق. يرجى اختيار تاريخ من اليوم أو في المستقبل.');
      return;
    }

    setSaving(true);

    if (DEMO_MODE) {
      const client = initialClients.find((c) => c.id === form.client_id) ?? undefined;
      const employee = initialEmployees.find((e) => e.id === form.employee_id) ?? undefined;
      const service = initialServices.find((s) => s.id === form.service_id) ?? undefined;
      const newAppt: Appointment = {
        id: 'demo-appt-' + Math.random().toString(36).slice(2, 8),
        shop_id: shop?.id ?? 'demo-shop-001',
        client_id: form.client_id || null,
        employee_id: form.employee_id || null,
        service_id: form.service_id || null,
        date: formDate,
        time: form.time + ':00',
        status: form.status,
        notes: form.notes || null,
        created_at: new Date().toISOString(),
        client, employee, service,
      };
      setAppointments((prev) => [...prev, newAppt].sort((a, b) => a.time.localeCompare(b.time)));
      setShowNew(false);
      setForm({ client_id: '', employee_id: '', service_id: '', time: '10:00', notes: '', status: 'confirmed' });
      setClientSearch('');
      toast.success(tCommon('success'));
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        shop_id: shop!.id,
        client_id: form.client_id || null,
        employee_id: form.employee_id || null,
        service_id: form.service_id || null,
        date: formDate,
        time: form.time,
        notes: form.notes || null,
        status: form.status,
      })
      .select('*, client:clients(id,name,phone), employee:employees(id,name), service:services(id,name_ar,name_en,price,duration_minutes)')
      .single();

    if (error) {
      toast.error(tCommon('error'));
    } else {
      setAppointments((prev) => [...prev, data as Appointment].sort((a, b) => a.time.localeCompare(b.time)));
      setShowNew(false);
      setForm({ client_id: '', employee_id: '', service_id: '', time: '10:00', notes: '', status: 'confirmed' });
      setClientSearch('');
      toast.success(tCommon('success'));
    }
    setSaving(false);
  }

  async function updateStatus(id: string, status: AppointmentStatus) {
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    if (DEMO_MODE) return;
    const supabase = createClient();
    await supabase.from('appointments').update({ status }).eq('id', id);
  }

  const serviceName = (s?: Service | null) => s ? (locale === 'ar' ? s.name_ar : s.name_en) : '—';
  const displayDate = format(parseISO(selectedDate), 'EEEE, d MMMM yyyy');
  const displayWeekRange = () => {
    const d = parseISO(selectedDate);
    const start = getSunday(d);
    const end = addDays(start, 6);
    return `${format(start, 'd MMMM')} – ${format(end, 'd MMMM yyyy')}`;
  };

  const StatusSelect = ({ appt }: { appt: Appointment }) => (
    <select
      value={appt.status}
      onChange={(e) => updateStatus(appt.id, e.target.value as AppointmentStatus)}
      className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{STATUS_BADGE[s].label[locale as 'ar' | 'en']}</option>
      ))}
    </select>
  );

  return (
    <>
      <PageHeader
        title={t('title')}
        actions={
          <div className="flex items-center gap-2">
            {/* #11 — View toggle */}
            <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
              <button
                onClick={() => setView('list')}
                className={cn('px-2.5 py-1.5 transition', viewMode === 'list' ? 'text-white' : 'text-gray-400 hover:text-gray-600 bg-white')}
                style={viewMode === 'list' ? { backgroundColor: 'var(--brand-color)' } : {}}
                title={locale === 'ar' ? 'عرض قائمة' : 'List view'}
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('calendar')}
                className={cn('px-2.5 py-1.5 transition', viewMode === 'calendar' ? 'text-white' : 'text-gray-400 hover:text-gray-600 bg-white')}
                style={viewMode === 'calendar' ? { backgroundColor: 'var(--brand-color)' } : {}}
                title={locale === 'ar' ? 'عرض تقويم' : 'Calendar view'}
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>

            <Button onClick={() => { setShowNew(true); setFormDate(selectedDate); setClientSearch(''); }}>
              <Plus className="w-4 h-4" />
              {t('newAppointment')}
            </Button>
          </div>
        }
      />

      {/* Date navigation */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-4 mb-5">
        <button onClick={handlePrev} className="p-2 rounded-xl hover:bg-gray-100 transition">
          {locale === 'ar' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
        <div className="text-center">
          <p className="font-semibold text-gray-900">
            {viewMode === 'calendar' ? displayWeekRange() : displayDate}
          </p>
          <p className="text-xs text-gray-400">
            {appointments.length} {locale === 'ar' ? 'موعد' : 'appointments'}
          </p>
        </div>
        <button onClick={handleNext} className="p-2 rounded-xl hover:bg-gray-100 transition">
          {locale === 'ar' ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-center text-gray-400 py-12">{tCommon('loading')}</p>
      ) : (viewMode !== 'calendar' && appointments.length === 0) ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">{t('noAppointments')}</p>
        </div>
      ) : viewMode === 'calendar' ? (
        (() => {
          const d = parseISO(selectedDate);
          const start = getSunday(d);
          const weekDays = Array.from({ length: 7 }, (_, i) => addDays(start, i));

          return (
            <>
              {/* Calendar view for Desktop */}
              <div className="hidden lg:block bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {/* Header row */}
                <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50 text-center text-xs font-semibold text-gray-500 py-3">
                  <div className="col-span-1"></div>
                  {weekDays.map((day, idx) => (
                    <div key={idx} className="col-span-1 border-s border-gray-200">
                      <p className="text-gray-900">{format(day, 'EEE')}</p>
                      <p className="text-gray-400 mt-0.5">{format(day, 'd')}</p>
                    </div>
                  ))}
                </div>

                {/* Grid body */}
                <div className="relative grid grid-cols-8 overflow-y-auto" style={{ height: 600 }}>
                  {/* Leftmost time labels */}
                  <div className="col-span-1 relative border-r border-gray-200 bg-gray-50" style={{ height: TIME_SLOTS.length * 48 }}>
                    {TIME_SLOTS.map((time, idx) => (
                      <div
                        key={idx}
                        className="absolute w-full border-b border-gray-100 flex items-center justify-center text-[10px] text-gray-400 font-medium"
                        style={{ top: idx * 48, height: 48 }}
                      >
                        {formatTime12h(time + ':00', locale)}
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {weekDays.map((day, dayIdx) => {
                    const dayDateStr = format(day, 'yyyy-MM-dd');
                    const dayAppts = appointments.filter((a) => a.date === dayDateStr);

                    return (
                      <div key={dayIdx} className="col-span-1 relative border-r border-gray-100 last:border-r-0" style={{ height: TIME_SLOTS.length * 48 }}>
                        {TIME_SLOTS.map((_, idx) => (
                          <div
                            key={idx}
                            className="absolute w-full border-b border-gray-100 last:border-b-0"
                            style={{ top: idx * 48, height: 48 }}
                          />
                        ))}

                        {dayAppts.map((appt) => {
                          const duration = appt.service?.duration_minutes ?? 30;
                          const { top, height } = getApptPosition(appt.time, duration);
                          const colorClasses = {
                            pending: 'bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100',
                            confirmed: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100',
                            done: 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100',
                            cancelled: 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100',
                          }[appt.status];

                          return (
                            <div
                              key={appt.id}
                              className={cn(
                                "absolute left-1 right-1 p-1.5 rounded-lg border text-[10px] font-medium leading-tight shadow-sm transition overflow-hidden z-10 select-none",
                                colorClasses
                              )}
                              style={{ top: top + 2, height: height - 4 }}
                              title={`${appt.client?.name ?? t('walkIn')} - ${serviceName(appt.service)} (${appt.time.slice(0, 5)})`}
                            >
                              <div className="font-semibold truncate">{appt.client?.name ?? t('walkIn')}</div>
                              <div className="opacity-75 truncate">{serviceName(appt.service)}</div>
                              <div className="opacity-60 text-[9px] mt-0.5">{formatTime12h(appt.time, locale)}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fallback to List view on Mobile */}
              <div className="lg:hidden space-y-3">
                {appointments.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <p className="text-lg">{t('noAppointments')}</p>
                  </div>
                ) : (
                  appointments.map((appt) => {
                    const info = STATUS_BADGE[appt.status];
                    return (
                      <div key={appt.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-4">
                        <div
                          className="sm:w-20 shrink-0 flex sm:flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl text-white text-center"
                          style={{ backgroundColor: 'var(--brand-color)' }}
                        >
                          <Clock className="w-4 h-4 opacity-70" />
                          <span className="font-bold text-sm">{formatTime12h(appt.time, locale)}</span>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-semibold text-gray-800">{appt.client?.name ?? t('walkIn')}</span>
                            {appt.client?.phone && <span className="text-sm text-gray-500">{appt.client.phone}</span>}
                            <Badge variant={info.variant}>{info.label[locale as 'ar' | 'en']}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Scissors className="w-3.5 h-3.5" />{serviceName(appt.service)}
                            </span>
                            {appt.employee && (
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5" />{appt.employee.name}
                              </span>
                            )}
                          </div>
                          {appt.notes && <p className="text-xs text-gray-400">{appt.notes}</p>}
                        </div>
                        <div className="shrink-0"><StatusSelect appt={appt} /></div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          );
        })()
      ) : (
        /* ── List view (Table) ── */
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {appointments.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg">{t('noAppointments')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-start px-4 py-3 font-semibold text-gray-600">
                      {tCommon('time')}
                    </th>
                    <th className="text-start px-4 py-3 font-semibold text-gray-600">
                      {t('client')}
                    </th>
                    <th className="text-start px-4 py-3 font-semibold text-gray-600">
                      {t('service')}
                    </th>
                    <th className="text-start px-4 py-3 font-semibold text-gray-600">
                      {t('employee')}
                    </th>
                    <th className="text-start px-4 py-3 font-semibold text-gray-600">
                      {locale === 'ar' ? 'الحالة' : 'Status'}
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600 w-36">
                      {tCommon('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {appointments.map((appt) => {
                    const info = STATUS_BADGE[appt.status];
                    return (
                      <tr key={appt.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {formatTime12h(appt.time, locale)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{appt.client?.name ?? t('walkIn')}</div>
                          {appt.client?.phone && <div className="text-xs text-gray-500">{appt.client.phone}</div>}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{serviceName(appt.service)}</td>
                        <td className="px-4 py-3 text-gray-700">{appt.employee?.name ?? '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant={info.variant}>{info.label[locale as 'ar' | 'en']}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <StatusSelect appt={appt} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* New appointment modal */}
      <Modal open={showNew} onClose={() => { setShowNew(false); setFormError(''); setClientSearch(''); }} title={t('newAppointment')} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">

            {/* Client search */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('client')}</label>
              <div className="relative">
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setClientDropdown(true);
                    if (!e.target.value) setForm((f) => ({ ...f, client_id: '' }));
                  }}
                  onFocus={() => setClientDropdown(true)}
                  placeholder={locale === 'ar' ? 'بحث بالاسم أو الهاتف...' : 'Search by name or phone...'}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {clientDropdown && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {/* Walk-in option */}
                    <button
                      type="button"
                      onMouseDown={() => {
                        setForm((f) => ({ ...f, client_id: '' }));
                        setClientSearch('');
                        setClientDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-start text-sm text-gray-500 hover:bg-gray-50 border-b border-gray-100"
                    >
                      {t('walkIn')}
                    </button>
                    {filteredClients.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-400">{tCommon('noData')}</p>
                    ) : (
                      filteredClients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={() => {
                            setForm((f) => ({ ...f, client_id: c.id }));
                            setClientSearch(c.name + (c.phone ? ` · ${c.phone}` : ''));
                            setClientDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-start text-sm hover:bg-gray-50 flex flex-col"
                        >
                          <span className="font-medium text-gray-900">{c.name}</span>
                          {c.phone && <span className="text-xs text-gray-400">{c.phone}</span>}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <Select label={t('employee')} value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}>
                <option value="">—</option>
                {initialEmployees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Select label={t('service')} value={form.service_id} onChange={(e) => setForm((f) => ({ ...f, service_id: e.target.value }))}>
                <option value="">—</option>
                {initialServices.map((s) => <option key={s.id} value={s.id}>{locale === 'ar' ? s.name_ar : s.name_en}</option>)}
              </Select>
            </div>

            {/* Date picker */}
            <div className="col-span-2 sm:col-span-1">
              <Input
                label={tCommon('date')}
                type="date"
                value={formDate}
                onChange={(e) => { setFormDate(e.target.value); setFormError(''); }}
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <Input label={tCommon('time')} type="time" value={form.time} onChange={(e) => { setForm((f) => ({ ...f, time: e.target.value })); setFormError(''); }} />
            </div>
          </div>
          <Input
            label={tCommon('notes')}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder={locale === 'ar' ? 'ملاحظات اختيارية...' : 'Optional notes...'}
          />

          {/* #6 — past date error */}
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 leading-relaxed">
              {formError}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setShowNew(false); setFormError(''); }} className="flex-1">{tCommon('cancel')}</Button>
            <Button onClick={handleCreate} disabled={saving} className="flex-1">{saving ? tCommon('loading') : tCommon('save')}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

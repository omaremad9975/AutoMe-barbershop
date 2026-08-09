'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Copy, Check, Clock, Users, LogIn, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import type { Attendance, Employee, Shop } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

interface Props {
  shop: Shop;
  initialEmployees: Pick<Employee, 'id' | 'name'>[];
  initialAttendance: Attendance[];
  defaultFrom: string;
  defaultTo: string;
}

function formatMinutes(mins: number, locale: string): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return locale === 'ar' ? `${h}س ${m}د` : `${h}h ${m}m`;
}

function formatDuration(startIso: string | null, endIso: string | null, locale: string): string {
  if (!startIso) return '—';
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const mins = Math.max(0, Math.round((end - start) / 60000));
  return formatMinutes(mins, locale);
}

export function AttendanceClient({ shop, initialEmployees, initialAttendance, defaultFrom, defaultTo }: Props) {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [records, setRecords] = useState<Attendance[]>(initialAttendance);
  const [employees, setEmployees] = useState(initialEmployees);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const employeeName = (id: string) => employees.find((e) => e.id === id)?.name ?? '—';

  const punchUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/attendance/${shop.slug}`
    : `/attendance/${shop.slug}`;

  async function applyFilter() {
    setLoading(true);
    if (DEMO_MODE) {
      // Demo mode has no real attendance rows to filter yet.
      setRecords([]);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const [{ data }, { data: empData }] = await Promise.all([
      supabase
        .from('attendance')
        .select('*')
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('check_in', { ascending: false }),
      supabase.from('employees').select('id, name'),
    ]);
    setRecords((data ?? []) as Attendance[]);
    if (empData) setEmployees(empData as Pick<Employee, 'id' | 'name'>[]);
    setLoading(false);
  }

  function copyLink() {
    navigator.clipboard.writeText(punchUrl);
    setCopied(true);
    toast.success(locale === 'ar' ? 'تم نسخ الرابط' : 'Link copied');
    setTimeout(() => setCopied(false), 2000);
  }

  const presentEmployeeIds = new Set(records.map((r) => r.employee_id));
  const openSessions = records.filter((r) => r.check_in && !r.check_out).length;
  const totalMinutes = records.reduce((sum, r) => {
    if (!r.check_in) return sum;
    const end = r.check_out ? new Date(r.check_out).getTime() : Date.now();
    const start = new Date(r.check_in).getTime();
    return sum + Math.max(0, (end - start) / 60000);
  }, 0);
  const totalHoursLabel = formatMinutes(totalMinutes, locale);

  return (
    <>
      <PageHeader
        title={locale === 'ar' ? 'الحضور والانصراف' : 'Attendance'}
        subtitle={locale === 'ar' ? 'سجل حضور الموظفين عبر صفحة البصمة الذاتية (GPS + رمز سري)' : 'Staff attendance via the self-punch page (GPS + PIN)'}
      />

      {/* Punch link card */}
      <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
            <Fingerprint className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-700">
              {locale === 'ar' ? 'رابط صفحة تسجيل الحضور' : 'Self-punch page link'}
            </p>
            <p className="text-xs text-gray-400 truncate" dir="ltr">{punchUrl}</p>
          </div>
        </div>
        <Button variant="outline" onClick={copyLink} className="shrink-0">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {locale === 'ar' ? 'نسخ الرابط' : 'Copy Link'}
        </Button>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{locale === 'ar' ? 'من' : 'From'}</label>
            <input
              type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{locale === 'ar' ? 'إلى' : 'To'}</label>
            <input
              type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 flex justify-end">
            <Button onClick={applyFilter} disabled={loading}>
              {loading ? '...' : (locale === 'ar' ? 'تطبيق' : 'Apply')}
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-gray-500">{locale === 'ar' ? 'موظفون حضروا' : 'Employees present'}</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{presentEmployeeIds.size}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-gray-500">{locale === 'ar' ? 'إجمالي ساعات العمل' : 'Total hours worked'}</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalHoursLabel}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <LogIn className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-sm font-medium text-gray-500">{locale === 'ar' ? 'جلسات مفتوحة الآن' : 'Currently checked in'}</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{openSessions}</p>
        </div>
      </div>

      {/* Log */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{locale === 'ar' ? 'سجل الحضور' : 'Attendance Log'}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {records.length} {locale === 'ar' ? 'جلسة في الفترة المختارة' : 'sessions in selected period'}
          </p>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <Fingerprint className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">{locale === 'ar' ? 'لا توجد بيانات حضور في هذه الفترة' : 'No attendance data in this period'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-start px-5 py-3 font-semibold text-gray-600">{locale === 'ar' ? 'الموظف' : 'Employee'}</th>
                  <th className="text-start px-5 py-3 font-semibold text-gray-600">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="text-start px-5 py-3 font-semibold text-gray-600">{locale === 'ar' ? 'حضور' : 'Check-in'}</th>
                  <th className="text-start px-5 py-3 font-semibold text-gray-600">{locale === 'ar' ? 'انصراف' : 'Check-out'}</th>
                  <th className="text-start px-5 py-3 font-semibold text-gray-600">{locale === 'ar' ? 'المدة' : 'Duration'}</th>
                  <th className="text-start px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">{locale === 'ar' ? 'المسافة' : 'Distance'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 font-medium text-gray-800">{employeeName(r.employee_id)}</td>
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(r.date).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-gray-600" dir="ltr">
                      {r.check_in
                        ? new Date(r.check_in).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                        : '—'}
                    </td>
                    <td className="px-5 py-3" dir="ltr">
                      {r.check_out ? (
                        <span className="text-gray-600">
                          {new Date(r.check_out).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                          {locale === 'ar' ? 'لم ينصرف بعد' : 'Still in'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-900">{formatDuration(r.check_in, r.check_out, locale)}</td>
                    <td className="px-5 py-3 text-gray-500 hidden md:table-cell">
                      {r.check_in_distance_m != null ? `${r.check_in_distance_m}م` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

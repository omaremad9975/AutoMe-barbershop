import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AttendanceClient } from '@/components/attendance/AttendanceClient';
import { DEMO_SHOP, DEMO_EMPLOYEES } from '@/lib/demo/data';
import type { Attendance, Employee, Shop, User } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default async function AttendancePage() {
  const today = new Date().toISOString().split('T')[0];

  if (DEMO_MODE) {
    return (
      <AttendanceClient
        shop={DEMO_SHOP}
        initialAttendance={[]}
        defaultFrom={today}
        defaultTo={today}
      />
    );
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userRow } = await supabase
    .from('users').select('role, shop_id').eq('id', user.id).single<Pick<User, 'role' | 'shop_id'>>();
  if (userRow?.role !== 'owner') redirect('/dashboard/pos');

  const [{ data: shop }, { data: attendance }] = await Promise.all([
    supabase.from('shops').select('*').eq('id', userRow.shop_id).single<Shop>(),
    supabase
      .from('attendance')
      .select('*, employee:employees(id, name)')
      .gte('date', today)
      .lte('date', today)
      .order('check_in', { ascending: false }),
  ]);

  return (
    <AttendanceClient
      shop={shop!}
      initialAttendance={(attendance ?? []) as Attendance[]}
      defaultFrom={today}
      defaultTo={today}
    />
  );
}

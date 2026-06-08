import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { EmployeesClient } from '@/components/employees/EmployeesClient';
import { DEMO_EMPLOYEES } from '@/lib/demo/data';
import type { Employee, User } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default async function EmployeesPage() {
  if (DEMO_MODE) {
    return <EmployeesClient initialEmployees={DEMO_EMPLOYEES} />;
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: userRow } = await supabase
    .from('users').select('role').eq('id', user!.id).single<Pick<User, 'role'>>();
  if (userRow?.role !== 'owner') redirect('/dashboard/pos');

  const { data: employees } = await supabase.from('employees').select('*').order('name');
  return <EmployeesClient initialEmployees={(employees ?? []) as Employee[]} />;
}

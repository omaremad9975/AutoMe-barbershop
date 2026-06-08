import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ReportsClient } from '@/components/reports/ReportsClient';
import { DEMO_INVOICES } from '@/lib/demo/data';
import type { User } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default async function ReportsPage() {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (DEMO_MODE) {
    return (
      <ReportsClient
        initialInvoices={DEMO_INVOICES}
        defaultFrom={thirtyDaysAgo}
        defaultTo={today}
      />
    );
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: userRow } = await supabase
    .from('users').select('role').eq('id', user!.id).single<Pick<User, 'role'>>();
  if (userRow?.role !== 'owner') redirect('/dashboard/pos');

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, invoice_items(*), employee:employees(id,name)')
    .gte('created_at', thirtyDaysAgo)
    .lte('created_at', today + 'T23:59:59')
    .eq('status', 'paid')
    .order('created_at');

  return (
    <ReportsClient
      initialInvoices={invoices ?? []}
      defaultFrom={thirtyDaysAgo}
      defaultTo={today}
    />
  );
}

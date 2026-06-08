/*
  ── Supabase Setup (run once in the SQL Editor) ──────────────────────────────
  
  CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    notes TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "shop_expenses" ON expenses USING (shop_id = get_my_shop_id());
  GRANT ALL ON expenses TO authenticated;
  
  ─────────────────────────────────────────────────────────────────────────────
*/

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FinanceClient } from '@/components/finance/FinanceClient';
import { DEMO_INVOICES, DEMO_EXPENSES } from '@/lib/demo/data';
import type { User } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default async function FinancePage() {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (DEMO_MODE) {
    return (
      <FinanceClient
        initialInvoices={DEMO_INVOICES}
        initialExpenses={DEMO_EXPENSES}
        defaultFrom={thirtyDaysAgo}
        defaultTo={today}
      />
    );
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: userRow } = await supabase
    .from('users').select('role').eq('id', user.id).single<Pick<User, 'role'>>();
  if (userRow?.role !== 'owner') redirect('/dashboard/pos');

  const [{ data: invoices }, { data: expenses }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, net_total, total, discount, created_at, payment_method, status')
      .eq('status', 'paid')
      .gte('created_at', thirtyDaysAgo)
      .lte('created_at', today + 'T23:59:59')
      .order('created_at'),
    supabase
      .from('expenses')
      .select('*')
      .gte('date', thirtyDaysAgo)
      .lte('date', today)
      .order('date', { ascending: false }),
  ]);

  return (
    <FinanceClient
      initialInvoices={invoices ?? []}
      initialExpenses={expenses ?? []}
      defaultFrom={thirtyDaysAgo}
      defaultTo={today}
    />
  );
}

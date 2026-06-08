import { createClient } from '@/lib/supabase/server';
import { POSClient } from '@/components/pos/POSClient';
import { DEMO_CLIENTS, DEMO_SERVICES, DEMO_EMPLOYEES, DEMO_PRODUCTS } from '@/lib/demo/data';
import type { Client, Service, Employee, Product } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default async function POSPage() {
  if (DEMO_MODE) {
    return (
      <POSClient
        initialClients={DEMO_CLIENTS}
        initialServices={DEMO_SERVICES}
        initialEmployees={DEMO_EMPLOYEES}
        initialProducts={DEMO_PRODUCTS}
      />
    );
  }

  const supabase = createClient();
  const [{ data: clients }, { data: services }, { data: employees }, { data: products }] =
    await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('services').select('*').eq('active', true).order('name_ar'),
      supabase.from('employees').select('*').eq('active', true).order('name'),
      supabase.from('products').select('*').eq('active', true).order('name_ar'),
    ]);

  return (
    <POSClient
      initialClients={(clients ?? []) as Client[]}
      initialServices={(services ?? []) as Service[]}
      initialEmployees={(employees ?? []) as Employee[]}
      initialProducts={(products ?? []) as Product[]}
    />
  );
}

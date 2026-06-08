import { createClient } from '@/lib/supabase/server';
import { ClientsClient } from '@/components/clients/ClientsClient';
import { DEMO_CLIENTS } from '@/lib/demo/data';
import type { Client } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default async function ClientsPage() {
  if (DEMO_MODE) {
    return <ClientsClient initialClients={DEMO_CLIENTS} />;
  }

  const supabase = createClient();
  const { data: clients } = await supabase.from('clients').select('*').order('name');
  return <ClientsClient initialClients={(clients ?? []) as Client[]} />;
}

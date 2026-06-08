import { createClient } from '@/lib/supabase/server';
import { ServicesClient } from '@/components/services/ServicesClient';
import { DEMO_SERVICES } from '@/lib/demo/data';
import type { Service } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default async function ServicesPage() {
  if (DEMO_MODE) {
    return <ServicesClient initialServices={DEMO_SERVICES} />;
  }

  const supabase = createClient();
  const { data: services } = await supabase
    .from('services')
    .select('*, package_items!package_id(id, service_id, service:services!service_id(id, name_ar, name_en, price))')
    .order('name_ar');

  return <ServicesClient initialServices={(services ?? []) as Service[]} />;
}

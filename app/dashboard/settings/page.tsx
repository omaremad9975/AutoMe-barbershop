import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsClient } from '@/components/settings/SettingsClient';
import { DEMO_SHOP } from '@/lib/demo/data';
import type { Shop, User } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default async function SettingsPage() {
  if (DEMO_MODE) {
    return <SettingsClient shop={DEMO_SHOP} />;
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: userRow } = await supabase
    .from('users').select('role, shop_id').eq('id', user!.id).single<Pick<User, 'role' | 'shop_id'>>();
  if (userRow?.role !== 'owner') redirect('/dashboard/pos');

  const { data: shop } = await supabase
    .from('shops').select('*').eq('id', userRow.shop_id).single<Shop>();
  return <SettingsClient shop={shop!} />;
}

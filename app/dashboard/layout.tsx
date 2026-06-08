import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { DEMO_SHOP, DEMO_USER } from '@/lib/demo/data';
import type { Metadata } from 'next';
import type { Shop, User } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export async function generateMetadata(): Promise<Metadata> {
  if (DEMO_MODE) {
    return { title: 'Barber King' };
  }
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};
    const { data: userRow } = await supabase.from('users').select('shop_id').eq('id', user.id).single();
    if (!userRow) return {};
    const { data: shop } = await supabase.from('shops').select('name, logo_url').eq('id', userRow.shop_id).single();
    if (!shop) return {};
    return {
      title: shop.name,
      icons: shop.logo_url ? { icon: '/api/shop-icon', apple: '/api/shop-icon' } : undefined,
    };
  } catch {
    return {};
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let shop: Shop;
  let currentUser: User;

  if (DEMO_MODE) {
    const cookieStore = cookies();
    const demoSession = cookieStore.get('demo_session')?.value;
    if (demoSession !== 'active') redirect('/login');
    shop = DEMO_SHOP;
    currentUser = DEMO_USER;
  } else {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: userRow } = await supabase
      .from('users').select('*').eq('id', user.id).single<User>();
    if (!userRow) redirect('/login');

    const { data: shopRow } = await supabase
      .from('shops').select('*').eq('id', userRow.shop_id).single<Shop>();
    if (!shopRow) redirect('/login');

    shop = shopRow;
    currentUser = userRow;
  }

  return (
    <DashboardShell shop={shop} currentUser={currentUser}>
      {children}
    </DashboardShell>
  );
}

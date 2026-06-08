'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DEMO_SHOP, DEMO_USER } from '@/lib/demo/data';
import type { Shop, User } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

interface ShopContext {
  shop: Shop | null;
  currentUser: User | null;
  loading: boolean;
}

export function useShop(): ShopContext {
  const [shop, setShop] = useState<Shop | null>(DEMO_MODE ? DEMO_SHOP : null);
  const [currentUser, setCurrentUser] = useState<User | null>(DEMO_MODE ? DEMO_USER : null);
  const [loading, setLoading] = useState(!DEMO_MODE);

  useEffect(() => {
    if (DEMO_MODE) return;

    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: userRow } = await supabase
        .from('users').select('*').eq('id', user.id).single();

      if (!userRow) { setLoading(false); return; }
      setCurrentUser(userRow);

      const { data: shopRow } = await supabase
        .from('shops').select('*').eq('id', userRow.shop_id).single();

      setShop(shopRow);
      setLoading(false);
    }

    load();
  }, []);

  return { shop, currentUser, loading };
}

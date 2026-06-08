import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { DEMO_SHOP } from '@/lib/demo/data';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

const DEFAULT_ICONS: MetadataRoute.Manifest['icons'] = [
  { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
  { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
];

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  // Demo mode — use static demo shop name
  if (DEMO_MODE) {
    return {
      name: DEMO_SHOP.name,
      short_name: DEMO_SHOP.name,
      description: 'Barber Shop Management System',
      start_url: '/dashboard/pos',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#1a1a2e',
      icons: DEFAULT_ICONS,
    };
  }

  // Supabase mode — fetch real shop name + logo
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: userRow } = await supabase
        .from('users').select('shop_id').eq('id', user.id).single();

      if (userRow) {
        const { data: shop } = await supabase
          .from('shops').select('name, logo_url').eq('id', userRow.shop_id).single();

        if (shop) {
          // Use our own API route to proxy the logo — Chrome requires same-origin icons for PWA
          const icons: MetadataRoute.Manifest['icons'] = shop.logo_url
            ? [
                { src: '/api/shop-icon', sizes: 'any', type: 'image/png' },
                ...DEFAULT_ICONS,
              ]
            : DEFAULT_ICONS;

          return {
            name: shop.name,
            short_name: shop.name.split(' ')[0],
            description: 'Barber Shop Management System',
            start_url: '/dashboard/pos',
            display: 'standalone',
            background_color: '#ffffff',
            theme_color: '#1a1a2e',
            icons,
          };
        }
      }
    }
  } catch { /* fall through to default */ }

  // Fallback
  return {
    name: 'Barber Shop System',
    short_name: 'BarberShop',
    description: 'Barber Shop Management System',
    start_url: '/dashboard/pos',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1a1a2e',
    icons: DEFAULT_ICONS,
  };
}

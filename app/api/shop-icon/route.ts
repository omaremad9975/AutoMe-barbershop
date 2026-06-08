import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse(null, { status: 404 });

    const { data: userRow } = await supabase
      .from('users').select('shop_id').eq('id', user.id).single();
    if (!userRow) return new NextResponse(null, { status: 404 });

    const { data: shop } = await supabase
      .from('shops').select('logo_url').eq('id', userRow.shop_id).single();
    if (!shop?.logo_url) return new NextResponse(null, { status: 404 });

    // Fetch the image from Supabase Storage and re-serve it from our domain
    const imageRes = await fetch(shop.logo_url);
    if (!imageRes.ok) return new NextResponse(null, { status: 404 });

    const contentType = imageRes.headers.get('content-type') ?? 'image/png';
    const buffer = await imageRes.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}

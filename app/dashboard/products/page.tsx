import { createClient } from '@/lib/supabase/server';
import { ProductsClient } from '@/components/products/ProductsClient';
import { DEMO_PRODUCTS } from '@/lib/demo/data';
import type { Product } from '@/lib/types';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default async function ProductsPage() {
  if (DEMO_MODE) {
    return <ProductsClient initialProducts={DEMO_PRODUCTS} />;
  }

  const supabase = createClient();
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('name_ar');

  return <ProductsClient initialProducts={(products ?? []) as Product[]} />;
}

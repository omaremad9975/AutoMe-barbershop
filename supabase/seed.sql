-- ============================================================
-- Seed: Default owner account
-- Run this AFTER creating the auth user in Supabase dashboard
-- Email: omaremad9975@gmail.com
-- ============================================================

-- Step 1: Create the shop
INSERT INTO public.shops (id, name, brand_color, slug)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Barber King',
  '#1a1a2e',
  'barber-king'
);

-- Step 2: Link your auth user to the shop
-- REPLACE the id below with your actual UID from Supabase Auth → Users
INSERT INTO public.users (id, shop_id, email, name, role)
VALUES (
  'PASTE-YOUR-AUTH-UID-HERE',
  '00000000-0000-0000-0000-000000000001',
  'omaremad9975@gmail.com',
  'Omar Emad',
  'owner'
);

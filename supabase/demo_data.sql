-- ============================================================
-- Demo Data Seed — Barber King
-- Run this in Supabase SQL Editor
-- Shop ID: 00000000-0000-0000-0000-000000000001
-- ============================================================

-- Clear existing demo data (safe to re-run)
DELETE FROM public.invoice_items;
DELETE FROM public.invoices;
DELETE FROM public.appointments;
DELETE FROM public.package_items;
DELETE FROM public.clients;
DELETE FROM public.employees;
DELETE FROM public.products WHERE shop_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.services WHERE shop_id = '00000000-0000-0000-0000-000000000001';

-- ============================================================
-- SERVICES (base services first)
-- ============================================================
INSERT INTO public.services (id, shop_id, name_ar, name_en, price, duration_minutes, is_package, active) VALUES
  ('aaaaaaaa-0001-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'قص شعر',          'Haircut',           150, 30, false, true),
  ('aaaaaaaa-0001-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'تشكيل لحية',       'Beard Trim',        100, 20, false, true),
  ('aaaaaaaa-0001-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'حلاقة كاملة',      'Full Shave',         80, 15, false, true),
  ('aaaaaaaa-0001-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'غسيل وتجفيف',      'Wash & Dry',         60, 20, false, true),
  ('aaaaaaaa-0001-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'صبغة شعر',         'Hair Color',        300, 60, false, true),
  ('aaaaaaaa-0001-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'علاج بالكيراتين',  'Keratin Treatment', 500, 90, false, true),
  ('aaaaaaaa-0001-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'تشكيل حواجب',      'Eyebrow Trim',       50, 10, false, true),
  ('aaaaaaaa-0001-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'مساج رأس',         'Head Massage',       80, 20, false, true),
  ('aaaaaaaa-0001-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'قص أطفال',         'Kids Haircut',      100, 20, false, true);

-- PACKAGES
INSERT INTO public.services (id, shop_id, name_ar, name_en, price, duration_minutes, is_package, active) VALUES
  ('aaaaaaaa-0002-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'باقة VIP',    'VIP Package',   250, 70,  true, true),
  ('aaaaaaaa-0002-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'باقة العريس', 'Groom Package', 270, 60,  true, true),
  ('aaaaaaaa-0002-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'باقة العناية','Care Package',  750, 150, true, true);

-- PACKAGE ITEMS (what's included in each package)
-- VIP: Haircut + Beard Trim + Wash & Dry
INSERT INTO public.package_items (package_id, service_id) VALUES
  ('aaaaaaaa-0002-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000001'),
  ('aaaaaaaa-0002-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000002'),
  ('aaaaaaaa-0002-0000-0000-000000000001', 'aaaaaaaa-0001-0000-0000-000000000004');

-- Groom: Haircut + Beard Trim + Eyebrow Trim
INSERT INTO public.package_items (package_id, service_id) VALUES
  ('aaaaaaaa-0002-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000001'),
  ('aaaaaaaa-0002-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000002'),
  ('aaaaaaaa-0002-0000-0000-000000000002', 'aaaaaaaa-0001-0000-0000-000000000007');

-- Care: Hair Color + Keratin Treatment
INSERT INTO public.package_items (package_id, service_id) VALUES
  ('aaaaaaaa-0002-0000-0000-000000000003', 'aaaaaaaa-0001-0000-0000-000000000005'),
  ('aaaaaaaa-0002-0000-0000-000000000003', 'aaaaaaaa-0001-0000-0000-000000000006');

-- ============================================================
-- EMPLOYEES
-- ============================================================
INSERT INTO public.employees (id, shop_id, name, phone, position, shift, active) VALUES
  ('bbbbbbbb-0001-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'محمد سمير',  '01012345601', 'حلاق أول',    'morning', true),
  ('bbbbbbbb-0001-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'خالد حسن',   '01012345602', 'حلاق',        'morning', true),
  ('bbbbbbbb-0001-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'عمرو إبراهيم','01012345603', 'حلاق',        'evening', true);

-- ============================================================
-- CLIENTS
-- ============================================================
INSERT INTO public.clients (shop_id, name, phone, email) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Ahmed Mohamed',       '01012345678', 'ahmed.m@gmail.com'),
  ('00000000-0000-0000-0000-000000000001', 'Mohamed Ali Hassan',  '01123456789', 'malihassan@gmail.com'),
  ('00000000-0000-0000-0000-000000000001', 'Khaled Ibrahim',      '01512345678', 'khaled.ibrahim@gmail.com'),
  ('00000000-0000-0000-0000-000000000001', 'Omar Samir',          '01212345678', 'omar.samir@gmail.com'),
  ('00000000-0000-0000-0000-000000000001', 'Youssef Nasser',      '01098765432', 'youssef.n@gmail.com'),
  ('00000000-0000-0000-0000-000000000001', 'Mahmoud Adel',        '01187654321', 'mahmoud.adel@gmail.com'),
  ('00000000-0000-0000-0000-000000000001', 'Karim Mostafa',       '01556789012', 'karim.m@gmail.com'),
  ('00000000-0000-0000-0000-000000000001', 'Tarek Sayed',         '01234567890', 'tarek.s@gmail.com'),
  ('00000000-0000-0000-0000-000000000001', 'Amr Hassan',          '01065432109', 'amr.hassan@gmail.com'),
  ('00000000-0000-0000-0000-000000000001', 'Hassan Emad',         '01176543210', 'hassan.emad@gmail.com');

-- ============================================================
-- PRODUCTS
-- ============================================================
INSERT INTO public.products (shop_id, name_ar, name_en, price, description, stock_qty, active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'جل الشعر', 'Hair Gel',        80,  'جل تثبيت قوي للشعر',      25, true),
  ('00000000-0000-0000-0000-000000000001', 'شامبو للرجال', 'Men Shampoo',  120, 'شامبو مرطب للشعر والفروة', 20, true),
  ('00000000-0000-0000-0000-000000000001', 'واكس الشعر', 'Hair Wax',      100, 'واكس لتشكيل الشعر',        15, true),
  ('00000000-0000-0000-0000-000000000001', 'زيت اللحية', 'Beard Oil',      90, 'زيت ترطيب وتلميع اللحية',  30, true),
  ('00000000-0000-0000-0000-000000000001', 'كريم الحلاقة', 'Shaving Cream', 60, 'كريم حلاقة للبشرة الحساسة', 18, true);

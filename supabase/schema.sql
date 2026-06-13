-- ============================================================
-- Barber Shop SaaS - Supabase Schema + RLS Policies
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- SHOPS
-- ============================================================
create table public.shops (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  logo_url    text,
  brand_color text not null default '#1a1a2e',
  slug        text not null unique,
  created_at  timestamptz not null default now()
);

alter table public.shops enable row level security;

-- ============================================================
-- USERS (extends auth.users)
-- ============================================================
create table public.users (
  id       uuid primary key references auth.users(id) on delete cascade,
  shop_id  uuid not null references public.shops(id) on delete cascade,
  email    text not null,
  name     text not null,
  role     text not null check (role in ('owner', 'cashier')),
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- ============================================================
-- CLIENTS
-- ============================================================
create sequence if not exists public.client_code_seq start 1;

create table public.clients (
  id         uuid primary key default uuid_generate_v4(),
  shop_id    uuid not null references public.shops(id) on delete cascade,
  code       int unique default nextval('public.client_code_seq'),  -- #2 auto numeric code
  name       text not null,
  phone      text,
  whatsapp   text,
  email      text,
  notes      text,
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;

-- ============================================================
-- PRODUCTS (#1 new module)
-- ============================================================
create table public.products (
  id          uuid primary key default uuid_generate_v4(),
  shop_id     uuid not null references public.shops(id) on delete cascade,
  name_ar     text not null,
  name_en     text not null,
  price       numeric(10,2) not null default 0,
  description text,
  stock_qty   int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.products enable row level security;

-- ============================================================
-- SERVICES & PACKAGES
-- ============================================================
create table public.services (
  id                uuid primary key default uuid_generate_v4(),
  shop_id           uuid not null references public.shops(id) on delete cascade,
  name_ar           text not null,
  name_en           text not null,
  price             numeric(10,2) not null default 0,
  duration_minutes  int not null default 30,
  is_package        boolean not null default false,
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);

alter table public.services enable row level security;

-- Package items: which base services are inside a package
create table public.package_items (
  id          uuid primary key default uuid_generate_v4(),
  package_id  uuid not null references public.services(id) on delete cascade,
  service_id  uuid not null references public.services(id) on delete cascade,
  unique(package_id, service_id)
);

alter table public.package_items enable row level security;

-- ============================================================
-- EMPLOYEES
-- ============================================================
create table public.employees (
  id         uuid primary key default uuid_generate_v4(),
  shop_id    uuid not null references public.shops(id) on delete cascade,
  name       text not null,
  phone      text,
  position   text,
  shift      text,
  hire_date  date,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.employees enable row level security;

-- ============================================================
-- APPOINTMENTS
-- ============================================================
create table public.appointments (
  id          uuid primary key default uuid_generate_v4(),
  shop_id     uuid not null references public.shops(id) on delete cascade,
  client_id   uuid references public.clients(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  service_id  uuid references public.services(id) on delete set null,
  date        date not null,
  time        time not null,
  status      text not null default 'pending' check (status in ('pending','confirmed','done','cancelled')),
  notes       text,
  created_at  timestamptz not null default now()
);

alter table public.appointments enable row level security;

-- ============================================================
-- INVOICES
-- ============================================================
create table public.invoices (
  id             uuid primary key default uuid_generate_v4(),
  shop_id        uuid not null references public.shops(id) on delete cascade,
  client_id      uuid references public.clients(id) on delete set null,
  employee_id    uuid references public.employees(id) on delete set null,
  payment_method text not null check (payment_method in ('cash','card','instapay','vodafone_cash')),
  total          numeric(10,2) not null default 0,
  discount       numeric(10,2) not null default 0,
  net_total      numeric(10,2) not null default 0,
  status         text not null default 'paid' check (status in ('paid','void')),
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);

alter table public.invoices enable row level security;

-- ============================================================
-- INVOICE ITEMS
-- ============================================================
create table public.invoice_items (
  id             uuid primary key default uuid_generate_v4(),
  invoice_id     uuid not null references public.invoices(id) on delete cascade,
  service_id     uuid references public.services(id) on delete set null,
  name_snapshot  text not null,
  price_snapshot numeric(10,2) not null,
  quantity       int not null default 1
);

alter table public.invoice_items enable row level security;

-- ============================================================
-- EXPENSES
-- ============================================================
create table public.expenses (
  id               uuid primary key default uuid_generate_v4(),
  shop_id          uuid not null references public.shops(id) on delete cascade,
  amount           numeric(10,2) not null,
  category         text not null,
  notes            text,
  date             date not null default current_date,
  created_at       timestamptz not null default now(),
  created_by_name  text
);

alter table public.expenses enable row level security;

-- ============================================================
-- HELPER FUNCTION: get_my_shop_id()
-- Returns the shop_id for the currently authenticated user
-- ============================================================
create or replace function public.get_my_shop_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select shop_id from public.users where id = auth.uid();
$$;

-- ============================================================
-- HELPER FUNCTION: get_my_role()
-- Returns the role for the currently authenticated user
-- ============================================================
create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- EXPENSES
create policy "expenses: read own shop"   on public.expenses for select using (shop_id = public.get_my_shop_id());
create policy "expenses: insert own shop" on public.expenses for insert with check (shop_id = public.get_my_shop_id());
create policy "expenses: update own shop" on public.expenses for update using (shop_id = public.get_my_shop_id());
create policy "expenses: delete own shop" on public.expenses for delete using (shop_id = public.get_my_shop_id());

-- PRODUCTS
create policy "products: read own shop"    on public.products for select using (shop_id = public.get_my_shop_id());
create policy "products: insert own shop"  on public.products for insert with check (shop_id = public.get_my_shop_id());
create policy "products: update own shop"  on public.products for update using (shop_id = public.get_my_shop_id());
create policy "products: delete own shop"  on public.products for delete using (shop_id = public.get_my_shop_id());

-- SHOPS: users can only see their own shop
create policy "shops: owner can read own shop"
  on public.shops for select
  using (id = public.get_my_shop_id());

create policy "shops: owner can update own shop"
  on public.shops for update
  using (id = public.get_my_shop_id() and public.get_my_role() = 'owner');

-- USERS: can read users in same shop
create policy "users: read same shop"
  on public.users for select
  using (shop_id = public.get_my_shop_id());

create policy "users: owner can insert users"
  on public.users for insert
  with check (shop_id = public.get_my_shop_id() and public.get_my_role() = 'owner');

create policy "users: owner can update users"
  on public.users for update
  using (shop_id = public.get_my_shop_id() and public.get_my_role() = 'owner');

create policy "users: owner can delete users"
  on public.users for delete
  using (shop_id = public.get_my_shop_id() and public.get_my_role() = 'owner');

-- CLIENTS
create policy "clients: read own shop"
  on public.clients for select
  using (shop_id = public.get_my_shop_id());

create policy "clients: insert own shop"
  on public.clients for insert
  with check (shop_id = public.get_my_shop_id());

create policy "clients: update own shop"
  on public.clients for update
  using (shop_id = public.get_my_shop_id());

create policy "clients: delete own shop"
  on public.clients for delete
  using (shop_id = public.get_my_shop_id());

-- SERVICES
create policy "services: read own shop"
  on public.services for select
  using (shop_id = public.get_my_shop_id());

create policy "services: insert owner only"
  on public.services for insert
  with check (shop_id = public.get_my_shop_id() and public.get_my_role() = 'owner');

create policy "services: update owner only"
  on public.services for update
  using (shop_id = public.get_my_shop_id() and public.get_my_role() = 'owner');

create policy "services: delete owner only"
  on public.services for delete
  using (shop_id = public.get_my_shop_id() and public.get_my_role() = 'owner');

-- PACKAGE ITEMS: derive access from parent service
create policy "package_items: read"
  on public.package_items for select
  using (
    exists (
      select 1 from public.services s
      where s.id = package_id and s.shop_id = public.get_my_shop_id()
    )
  );

create policy "package_items: insert owner only"
  on public.package_items for insert
  with check (
    exists (
      select 1 from public.services s
      where s.id = package_id and s.shop_id = public.get_my_shop_id()
        and public.get_my_role() = 'owner'
    )
  );

create policy "package_items: delete owner only"
  on public.package_items for delete
  using (
    exists (
      select 1 from public.services s
      where s.id = package_id and s.shop_id = public.get_my_shop_id()
        and public.get_my_role() = 'owner'
    )
  );

-- EMPLOYEES
create policy "employees: read own shop"
  on public.employees for select
  using (shop_id = public.get_my_shop_id());

create policy "employees: insert owner only"
  on public.employees for insert
  with check (shop_id = public.get_my_shop_id() and public.get_my_role() = 'owner');

create policy "employees: update owner only"
  on public.employees for update
  using (shop_id = public.get_my_shop_id() and public.get_my_role() = 'owner');

create policy "employees: delete owner only"
  on public.employees for delete
  using (shop_id = public.get_my_shop_id() and public.get_my_role() = 'owner');

-- APPOINTMENTS
create policy "appointments: read own shop"
  on public.appointments for select
  using (shop_id = public.get_my_shop_id());

create policy "appointments: insert own shop"
  on public.appointments for insert
  with check (shop_id = public.get_my_shop_id());

create policy "appointments: update own shop"
  on public.appointments for update
  using (shop_id = public.get_my_shop_id());

create policy "appointments: delete own shop"
  on public.appointments for delete
  using (shop_id = public.get_my_shop_id());

-- INVOICES
create policy "invoices: read own shop"
  on public.invoices for select
  using (shop_id = public.get_my_shop_id());

create policy "invoices: insert own shop"
  on public.invoices for insert
  with check (shop_id = public.get_my_shop_id());

create policy "invoices: update own shop"
  on public.invoices for update
  using (shop_id = public.get_my_shop_id() and public.get_my_role() = 'owner');

-- INVOICE ITEMS: access derived from parent invoice
create policy "invoice_items: read"
  on public.invoice_items for select
  using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id and i.shop_id = public.get_my_shop_id()
    )
  );

create policy "invoice_items: insert"
  on public.invoice_items for insert
  with check (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id and i.shop_id = public.get_my_shop_id()
    )
  );

-- ============================================================
-- SEED: create demo shop + owner (run AFTER creating the user in Auth)
-- Replace the UUID with your actual auth.users id
-- ============================================================

-- insert into public.shops (id, name, brand_color, slug)
-- values ('00000000-0000-0000-0000-000000000001', 'Barber King', '#1a1a2e', 'barber-king');

-- insert into public.users (id, shop_id, email, name, role)
-- values ('<your-auth-uid>', '00000000-0000-0000-0000-000000000001', 'omaremad9975@gmail.com', 'Omar Emad', 'owner');

-- ============================================================
-- CLEANUP: Delete removed services (تدليك الرأس, العناية بالحواجب)
-- Run this if you already inserted seed data with those services
-- ============================================================
-- delete from public.package_items where service_id in (
--   select id from public.services where name_ar in ('تدليك الرأس', 'العناية بالحواجب')
-- );
-- delete from public.services where name_ar in ('تدليك الرأس', 'العناية بالحواجب');

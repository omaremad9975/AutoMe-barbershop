-- ============================================================
-- Barber Shop SaaS — Attendance (GPS + PIN) migration
-- Run this ONCE in the Supabase SQL Editor, on the BARBER SHOP
-- project only ("AutoMe Clients" / dqixzqehjbrcjfyhfgtg).
--
-- This is 100% additive: new columns (with safe defaults), two
-- new tables, and new functions. It does not touch, rename, or
-- drop anything that exists today, and every object is scoped
-- to this project's own tables (shops/employees), so it cannot
-- reach or affect any other Supabase project (pharmacy, nursery,
-- cafe, etc. all live in physically separate projects).
-- ============================================================

-- pgcrypto gives us crypt()/gen_salt() for bcrypt-hashing PINs.
-- Supabase ships this extension; this just turns it on if it
-- isn't already (no-op if it is).
create extension if not exists pgcrypto;

-- ============================================================
-- SHOPS — geofence settings (owner-editable from Settings page)
-- ============================================================
alter table public.shops
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists attendance_radius_m int not null default 150;

-- Existing policy "shops: owner can update own shop" already
-- restricts writes to the owner of that shop — no new RLS needed.

-- ============================================================
-- EMPLOYEES — punch-clock code + PIN
-- ============================================================
create sequence if not exists public.employee_code_seq start 1;

alter table public.employees
  add column if not exists code int unique default nextval('public.employee_code_seq'),
  add column if not exists pin_hash text;

-- has_pin is a generated column so the dashboard can show
-- "PIN set / not set" without ever selecting pin_hash itself.
alter table public.employees
  add column if not exists has_pin boolean generated always as (pin_hash is not null) stored;

-- Lock the raw hash column down at the column-privilege level.
-- Row-level "employees: read own shop" / "update owner only"
-- policies still apply on top of this — this just means even the
-- shop owner's own logged-in session can never select or write
-- pin_hash directly from the client. The only way in or out is
-- through the SECURITY DEFINER functions below.
revoke select (pin_hash), update (pin_hash) on public.employees from authenticated, anon;

-- ============================================================
-- ATTENDANCE — one row per check-in/check-out session
-- (unlimited sessions per employee per day, same as the source pattern)
-- ============================================================
create table if not exists public.attendance (
  id                    uuid primary key default uuid_generate_v4(),
  shop_id               uuid not null references public.shops(id) on delete cascade,
  employee_id           uuid not null references public.employees(id) on delete cascade,
  date                  date not null,
  check_in              timestamptz,
  check_in_lat          double precision,
  check_in_lng          double precision,
  check_in_distance_m   numeric(7,1),
  check_out             timestamptz,
  check_out_lat         double precision,
  check_out_lng         double precision,
  check_out_distance_m  numeric(7,1),
  marked_by             text not null default 'self' check (marked_by in ('self', 'owner')),
  created_at            timestamptz not null default now()
);

alter table public.attendance enable row level security;

-- Owner (and cashier, read-only) can view their shop's attendance log.
-- No insert/update/delete policy is created on purpose — all writes
-- happen inside staff_self_punch(), which runs as the table owner
-- and therefore bypasses RLS. The dashboard can only ever read.
create policy "attendance: read own shop"
  on public.attendance for select
  using (shop_id = public.get_my_shop_id());

-- ============================================================
-- PIN rate limiting (5 wrong attempts / 15 min / IP, same as source)
-- ============================================================
create table if not exists public.attendance_pin_attempts (
  id           bigint generated always as identity primary key,
  shop_id      uuid not null references public.shops(id) on delete cascade,
  ip           text not null,
  attempted_at timestamptz not null default now()
);

alter table public.attendance_pin_attempts enable row level security;
revoke all on public.attendance_pin_attempts from anon, authenticated;
-- No policies at all: this table is invisible to every client role.
-- Only staff_self_punch() (SECURITY DEFINER) can touch it.

-- ============================================================
-- staff_self_punch — the public kiosk RPC
-- Looks up the shop by slug, checks the 4-digit PIN against every
-- active employee's hash, verifies GPS distance against the shop's
-- lat/lng + attendance_radius_m, then opens or closes today's
-- attendance session. No login required — called with the anon key.
-- ============================================================
create or replace function public.staff_self_punch(
  p_slug text, p_pin text, p_lat double precision, p_lng double precision
)
returns jsonb
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_shop public.shops;
  v_emp  public.employees;
  v_distance_m numeric;
  v_now timestamptz := now();
  v_today date := (now() at time zone 'Africa/Cairo')::date;
  v_rec public.attendance;
  v_action text;
  v_ip text;
  v_fails int;
  v_earth_radius_m constant double precision := 6371000;
  v_dlat double precision;
  v_dlng double precision;
  v_a double precision;
begin
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    return jsonb_build_object('success', false, 'error', 'INVALID_PIN_FORMAT');
  end if;

  if p_lat is null or p_lng is null
     or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    return jsonb_build_object('success', false, 'error', 'INVALID_LOCATION');
  end if;

  select * into v_shop from public.shops where slug = p_slug;
  if not found then
    return jsonb_build_object('success', false, 'error', 'SHOP_NOT_FOUND');
  end if;

  begin
    v_ip := split_part(coalesce(
      nullif(current_setting('request.headers', true), '')::json->>'x-forwarded-for',
      'unknown'), ',', 1);
  exception when others then
    v_ip := 'unknown';
  end;

  select count(*) into v_fails from public.attendance_pin_attempts
    where shop_id = v_shop.id and ip = v_ip
      and attempted_at > v_now - interval '15 minutes';
  if v_fails >= 5 then
    return jsonb_build_object('success', false, 'error', 'TOO_MANY_ATTEMPTS');
  end if;

  select * into v_emp from public.employees
  where shop_id = v_shop.id and active and pin_hash is not null
    and pin_hash = crypt(p_pin, pin_hash)
  limit 1;

  if not found then
    insert into public.attendance_pin_attempts (shop_id, ip) values (v_shop.id, v_ip);
    delete from public.attendance_pin_attempts
      where shop_id = v_shop.id and attempted_at < v_now - interval '1 day';
    return jsonb_build_object('success', false, 'error', 'WRONG_PIN');
  end if;

  delete from public.attendance_pin_attempts where shop_id = v_shop.id and ip = v_ip;

  if v_shop.lat is null or v_shop.lng is null then
    v_distance_m := null;  -- no geofence configured yet: allow (owner hasn't set it in Settings)
  else
    v_dlat := radians(p_lat - v_shop.lat);
    v_dlng := radians(p_lng - v_shop.lng);
    v_a := sin(v_dlat/2) * sin(v_dlat/2) +
           cos(radians(v_shop.lat)) * cos(radians(p_lat)) * sin(v_dlng/2) * sin(v_dlng/2);
    v_distance_m := v_earth_radius_m * 2 * atan2(sqrt(v_a), sqrt(1 - v_a));

    if v_distance_m > v_shop.attendance_radius_m then
      return jsonb_build_object(
        'success', false, 'error', 'TOO_FAR',
        'distance_m', round(v_distance_m::numeric, 1),
        'allowed_m', v_shop.attendance_radius_m,
        'staff_name', v_emp.name
      );
    end if;
  end if;

  -- Today's most recent session for this employee. None yet, or the
  -- latest one is already closed -> this punch opens a new one.
  -- Latest one still open -> this punch closes it. No daily cap.
  select * into v_rec from public.attendance
    where employee_id = v_emp.id and date = v_today
    order by check_in desc limit 1 for update;

  if not found or v_rec.check_out is not null then
    v_action := 'check_in';
    insert into public.attendance
      (shop_id, employee_id, date, check_in, check_in_lat, check_in_lng, check_in_distance_m, marked_by)
    values (v_shop.id, v_emp.id, v_today, v_now, p_lat, p_lng, round(coalesce(v_distance_m, 0), 1), 'self')
    returning * into v_rec;
  else
    v_action := 'check_out';
    update public.attendance
    set check_out = v_now, check_out_lat = p_lat, check_out_lng = p_lng,
        check_out_distance_m = round(coalesce(v_distance_m, 0), 1), marked_by = 'self'
    where id = v_rec.id
    returning * into v_rec;
  end if;

  return jsonb_build_object(
    'success', true, 'action', v_action, 'staff_name', v_emp.name,
    'time', to_char(v_now at time zone 'Africa/Cairo', 'HH24:MI'),
    'distance_m', round(coalesce(v_distance_m, 0), 1)
  );
end;
$$;

revoke execute on function public.staff_self_punch(text, text, double precision, double precision) from public;
grant execute on function public.staff_self_punch(text, text, double precision, double precision) to anon, authenticated;

-- ============================================================
-- set_employee_pin — owner-only. Only way pin_hash ever gets
-- written. Hashes with bcrypt (gen_salt('bf')) and rejects PINs
-- already in use by another active employee in the same shop
-- (since the punch page looks staff up by PIN alone, PINs must
-- be unique within a shop).
-- ============================================================
create or replace function public.set_employee_pin(p_employee_id uuid, p_pin text)
returns jsonb
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_shop_id uuid;
  v_dupe_count int;
begin
  if public.get_my_role() <> 'owner' then
    return jsonb_build_object('success', false, 'error', 'NOT_OWNER');
  end if;

  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    return jsonb_build_object('success', false, 'error', 'INVALID_PIN_FORMAT');
  end if;

  select shop_id into v_shop_id from public.employees
    where id = p_employee_id and shop_id = public.get_my_shop_id();
  if not found then
    return jsonb_build_object('success', false, 'error', 'EMPLOYEE_NOT_FOUND');
  end if;

  select count(*) into v_dupe_count from public.employees
    where shop_id = v_shop_id and id <> p_employee_id and active
      and pin_hash is not null and pin_hash = crypt(p_pin, pin_hash);
  if v_dupe_count > 0 then
    return jsonb_build_object('success', false, 'error', 'PIN_IN_USE');
  end if;

  update public.employees
    set pin_hash = crypt(p_pin, gen_salt('bf'))
    where id = p_employee_id;

  return jsonb_build_object('success', true);
end;
$$;

revoke execute on function public.set_employee_pin(uuid, text) from public;
grant execute on function public.set_employee_pin(uuid, text) to authenticated;

-- ============================================================
-- clear_employee_pin — owner-only, removes an employee's PIN
-- (e.g. staff left, or PIN needs a full reset before setting a new one)
-- ============================================================
create or replace function public.clear_employee_pin(p_employee_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if public.get_my_role() <> 'owner' then
    return jsonb_build_object('success', false, 'error', 'NOT_OWNER');
  end if;

  update public.employees
    set pin_hash = null
    where id = p_employee_id and shop_id = public.get_my_shop_id();

  if not found then
    return jsonb_build_object('success', false, 'error', 'EMPLOYEE_NOT_FOUND');
  end if;

  return jsonb_build_object('success', true);
end;
$$;

revoke execute on function public.clear_employee_pin(uuid) from public;
grant execute on function public.clear_employee_pin(uuid) to authenticated;

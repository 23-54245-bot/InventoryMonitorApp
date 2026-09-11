create extension if not exists "pgcrypto";

create or replace function public.is_admin(uid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where id = uid and role = 'Admin');
$$;

create or replace function public.is_admin_or_manager(uid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where id = uid and role in ('Admin', 'Manager'));
$$;

create or replace function public.current_user_store_id(uid uuid)
returns uuid language sql security definer set search_path = public stable as $$
  select store_id from public.profiles where id = uid limit 1;
$$;

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  email text,
  business_hours text,
  permit_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null default 'Staff' check (role in ('Admin', 'Manager', 'Staff')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  name text not null,
  username text unique,
  email text,
  role text not null default 'Staff' check (role in ('Admin', 'Manager', 'Staff')),
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  phone text,
  address text,
  avatar_url text,
  language text not null default 'English',
  dark_mode boolean not null default false,
  notifications_enabled boolean not null default true,
  biometric_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  sku text not null,
  name text not null,
  category text not null,
  unit_type text not null,
  current_stock numeric not null default 0 check (current_stock >= 0),
  max_stock numeric not null default 0 check (max_stock >= 0),
  low_stock_threshold numeric not null default 0 check (low_stock_threshold >= 0),
  unit_price numeric not null default 0 check (unit_price >= 0),
  srp_price numeric check (srp_price >= 0),
  expiry_date date,
  manufacturing_date date,
  icon text,
  image_uri text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, sku)
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  type text not null check (type in ('in', 'out')),
  quantity numeric not null check (quantity > 0),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id text references public.products(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.invites enable row level security;
alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "admins can manage invites" on public.invites;
drop policy if exists "store members can read stores" on public.stores;
drop policy if exists "store admins can update stores" on public.stores;
drop policy if exists "users can read own profile" on public.profiles;
drop policy if exists "users can update own profile" on public.profiles;
drop policy if exists "team viewers can read all profiles" on public.profiles;
drop policy if exists "admins can update all profiles" on public.profiles;
drop policy if exists "admins can delete profiles" on public.profiles;
drop policy if exists "store members can read products" on public.products;
drop policy if exists "store members can manage products" on public.products;
drop policy if exists "store members can read movements" on public.stock_movements;
drop policy if exists "store members can create movements" on public.stock_movements;
drop policy if exists "store members can read notifications" on public.notifications;
drop policy if exists "store members can update notifications" on public.notifications;

create policy "admins can manage invites" on public.invites for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'Admin')
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'Admin')
);
create policy "store members can read stores" on public.stores for select using (
  id in (select store_id from public.profiles where id = auth.uid())
);
create policy "store admins can update stores" on public.stores for update using (
  id in (select store_id from public.profiles where id = auth.uid() and role = 'Admin')
);
create policy "users can read own profile" on public.profiles for select using (id = auth.uid());
create policy "users can update own profile" on public.profiles for update using (id = auth.uid());
create policy "team viewers can read all profiles" on public.profiles for select using (
  public.is_admin_or_manager(auth.uid()) and store_id = public.current_user_store_id(auth.uid())
);
create policy "admins can update all profiles" on public.profiles for update using (
  public.is_admin(auth.uid()) and store_id = public.current_user_store_id(auth.uid())
);
create policy "admins can delete profiles" on public.profiles for delete using (
  public.is_admin(auth.uid()) and store_id = public.current_user_store_id(auth.uid())
);
create policy "store members can read products" on public.products for select using (
  store_id in (select store_id from public.profiles where id = auth.uid())
);
create policy "store members can manage products" on public.products for all using (
  store_id in (select store_id from public.profiles where id = auth.uid())
) with check (
  store_id in (select store_id from public.profiles where id = auth.uid())
);
create policy "store members can read movements" on public.stock_movements for select using (
  store_id in (select store_id from public.profiles where id = auth.uid())
);
create policy "store members can create movements" on public.stock_movements for insert with check (
  store_id in (select store_id from public.profiles where id = auth.uid()) and user_id = auth.uid()
);
create policy "store members can read notifications" on public.notifications for select using (
  store_id in (select store_id from public.profiles where id = auth.uid())
);
create policy "store members can update notifications" on public.notifications for update using (
  store_id in (select store_id from public.profiles where id = auth.uid())
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  invited_role text;
  invited_by_user uuid;
  account_store_id uuid;
  base_username text;
  candidate_username text;
  suffix int := 0;
begin
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  select role, invited_by into invited_role, invited_by_user from public.invites where lower(email) = lower(new.email) limit 1;
  base_username := coalesce(nullif(split_part(new.email, '@', 1), ''), 'user');
  candidate_username := base_username;
  while exists (select 1 from public.profiles where username = candidate_username) loop
    suffix := suffix + 1;
    candidate_username := base_username || suffix::text;
  end loop;

  if invited_by_user is not null then
    select store_id into account_store_id from public.profiles where id = invited_by_user;
  end if;

  if account_store_id is null then
    insert into public.stores (name, email)
    values (coalesce(new.raw_user_meta_data->>'name', base_username) || '''s Store', new.email)
    returning id into account_store_id;
  end if;

  insert into public.profiles (id, store_id, name, username, email, role)
  values (
    new.id,
    account_store_id,
    coalesce(new.raw_user_meta_data->>'name', base_username),
    candidate_username,
    new.email,
    coalesce(invited_role, 'Admin')
  )
  on conflict (id) do nothing;

  delete from public.invites where lower(email) = lower(new.email);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

do $$
declare
  profile_row record;
  account_store_id uuid;
begin
  for profile_row in select id, name, email from public.profiles where store_id is null loop
    insert into public.stores (name, email)
    values (coalesce(profile_row.name, 'Store') || '''s Store', profile_row.email)
    returning id into account_store_id;

    update public.profiles
    set store_id = account_store_id
    where id = profile_row.id;
  end loop;
end;
$$;

-- ─────────────────────────────────────────────
-- Migration: add missing columns to stock_movements
-- Run this once in your Supabase SQL editor if upgrading from an older schema.
-- ─────────────────────────────────────────────
alter table public.stock_movements
  add column if not exists reason text check (reason in ('sale', 'damaged', 'expired', 'adjustment')),
  add column if not exists performed_by text;

-- Useful indexes for the queries made by StoreProvider
create index if not exists idx_products_store_id on public.products (store_id);
create index if not exists idx_movements_store_id on public.stock_movements (store_id);
create index if not exists idx_movements_product_id on public.stock_movements (product_id);
create index if not exists idx_notifications_store_id on public.notifications (store_id);

-- ─────────────────────────────────────────────
-- POS / Sales Tables Migration
-- ─────────────────────────────────────────────
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  receipt_number text not null,
  cashier_id uuid references auth.users(id) on delete set null,
  cashier_name text not null default '',
  total_items integer not null default 1,
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  tax numeric not null default 0,
  total_amount numeric not null default 0,
  payment_method text not null default 'cash' check (payment_method in ('cash', 'card', 'e_wallet', 'credit', 'split', 'other')),
  amount_tendered numeric not null default 0,
  change_amount numeric not null default 0,
  note text,
  customer_id uuid,
  reference_number text,
  created_at timestamptz not null default now()
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  product_name text not null,
  sku text,
  quantity numeric not null check (quantity > 0),
  unit_price numeric not null default 0,
  total_price numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

create policy "Users can view sales for their store"
  on public.sales for select
  using (store_id = public.current_user_store_id(auth.uid()));

create policy "Users can insert sales for their store"
  on public.sales for insert
  with check (store_id = public.current_user_store_id(auth.uid()));

create policy "Users can view sale items for their store"
  on public.sale_items for select
  using (
    exists (
      select 1 from public.sales s
      where s.id = sale_items.sale_id
        and s.store_id = public.current_user_store_id(auth.uid())
    )
  );

create policy "Users can insert sale items for their store"
  on public.sale_items for insert
  with check (
    exists (
      select 1 from public.sales s
      where s.id = sale_items.sale_id
        and s.store_id = public.current_user_store_id(auth.uid())
    )
  );

create index if not exists idx_sales_store_id on public.sales (store_id);
create index if not exists idx_sales_created_at on public.sales (created_at desc);
create index if not exists idx_sale_items_sale_id on public.sale_items (sale_id);

-- ─────────────────────────────────────────────
-- Store Payment QR Details Migration
-- ─────────────────────────────────────────────
alter table public.stores
  add column if not exists gcash_name text,
  add column if not exists gcash_number text,
  add column if not exists gcash_qr_url text,
  add column if not exists maya_name text,
  add column if not exists maya_number text,
  add column if not exists maya_qr_url text;

-- ─────────────────────────────────────────────
-- Customers, Debts (Utang) & Audit Logs Tables
-- ─────────────────────────────────────────────
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  phone text not null,
  address text,
  credit_limit numeric not null default 1000,
  total_debt numeric not null default 0,
  loyalty_points numeric not null default 0,
  risk_status text not null default 'good' check (risk_status in ('good', 'warning', 'blacklisted')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers enable row level security;

create policy "Users can view customers for their store"
  on public.customers for select
  using (store_id = public.current_user_store_id(auth.uid()));

create policy "Users can manage customers for their store"
  on public.customers for all
  using (store_id = public.current_user_store_id(auth.uid()))
  with check (store_id = public.current_user_store_id(auth.uid()));

create index if not exists idx_customers_store_id on public.customers (store_id);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  customer_name text not null,
  customer_phone text,
  sale_id uuid references public.sales(id) on delete set null,
  amount numeric not null check (amount > 0),
  amount_paid numeric not null default 0 check (amount_paid >= 0),
  balance numeric not null default 0,
  status text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid')),
  due_date date,
  note text,
  items_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.debts enable row level security;

create policy "Users can view debts for their store"
  on public.debts for select
  using (store_id = public.current_user_store_id(auth.uid()));

create policy "Users can manage debts for their store"
  on public.debts for all
  using (store_id = public.current_user_store_id(auth.uid()))
  with check (store_id = public.current_user_store_id(auth.uid()));

create index if not exists idx_debts_store_id on public.debts (store_id);
create index if not exists idx_debts_customer_id on public.debts (customer_id);
create index if not exists idx_debts_status on public.debts (status);

create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  debt_id uuid not null references public.debts(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  amount numeric not null check (amount > 0),
  payment_method text not null default 'cash' check (payment_method in ('cash', 'gcash', 'maya', 'other')),
  reference_number text,
  recorded_by text not null default '',
  note text,
  created_at timestamptz not null default now()
);

alter table public.debt_payments enable row level security;

create policy "Users can view debt payments for their store"
  on public.debt_payments for select
  using (store_id = public.current_user_store_id(auth.uid()));

create policy "Users can insert debt payments for their store"
  on public.debt_payments for insert
  with check (store_id = public.current_user_store_id(auth.uid()));

create index if not exists idx_debt_payments_debt_id on public.debt_payments (debt_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null default '',
  action text not null,
  entity_type text not null,
  entity_id text,
  details text,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

create policy "Admins and managers can view audit logs"
  on public.audit_logs for select
  using (
    store_id = public.current_user_store_id(auth.uid())
    and public.is_admin_or_manager(auth.uid())
  );

create policy "Users can insert audit logs for their store"
  on public.audit_logs for insert
  with check (store_id = public.current_user_store_id(auth.uid()));

create index if not exists idx_audit_logs_store_id on public.audit_logs (store_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);


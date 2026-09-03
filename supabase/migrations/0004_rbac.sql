-- ============================================================
-- Tijori: RBAC foundation (roles/permissions/profiles/audit_logs)
-- plus accounts + transactions.account_id for the Income module
-- ============================================================

-- ---------- roles ----------
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger roles_set_updated_at
  before update on public.roles
  for each row execute function public.set_updated_at();

alter table public.roles enable row level security;

create policy "roles readable by authenticated"
  on public.roles for select
  to authenticated
  using (true);

create policy "auth admin can read roles for hook"
  on public.roles for select
  to supabase_auth_admin
  using (true);

-- ---------- permissions ----------
create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  action text not null check (action in ('view', 'create', 'edit', 'delete')),
  unique (module, action)
);

alter table public.permissions enable row level security;

create policy "permissions readable by authenticated"
  on public.permissions for select
  to authenticated
  using (true);

-- ---------- role_permissions ----------
create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create index role_permissions_role_idx on public.role_permissions (role_id);

alter table public.role_permissions enable row level security;

create policy "role_permissions readable by authenticated"
  on public.role_permissions for select
  to authenticated
  using (true);

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  role_id uuid references public.roles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "auth admin can read profiles for hook"
  on public.profiles for select
  to supabase_auth_admin
  using (true);

-- ---------- audit_logs ----------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  action text not null,
  target_type text,
  target_id text,
  summary text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

-- ---------- accounts ----------
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('cash', 'bank', 'credit_card', 'debit_card', 'wallet', 'investment', 'other')),
  opening_balance numeric(12, 2) not null default 0,
  currency text not null default 'INR',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index accounts_user_id_idx on public.accounts (user_id);

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

alter table public.accounts enable row level security;

create policy "own accounts"
  on public.accounts for all
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

-- ---------- transactions gains an optional account reference ----------
alter table public.transactions
  add column account_id uuid references public.accounts(id) on delete restrict;

create index transactions_account_idx on public.transactions (account_id);

-- ============================================================
-- authorize(): reads the caller's role off the JWT claim (set by
-- custom_access_token_hook below) and checks role_permissions.
-- security invoker + only touches openly-readable catalog tables,
-- so no RLS-recursion / privilege-escalation risk.
-- ============================================================
create or replace function public.authorize(p_module text, p_action text)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.role_permissions rp
    join public.permissions perm on perm.id = rp.permission_id
    join public.roles r on r.id = rp.role_id
    where r.name = (auth.jwt() ->> 'user_role')
      and perm.module = p_module
      and perm.action = p_action
  );
$$;

grant execute on function public.authorize(text, text) to authenticated;

-- ---------- profiles: own row always; users.view/edit holders get all rows ----------
create policy "own profile or admin read"
  on public.profiles for select
  to authenticated
  using ( (select auth.uid()) = id or (select public.authorize('users', 'view')) );

create policy "own profile or admin update"
  on public.profiles for update
  to authenticated
  using ( (select auth.uid()) = id or (select public.authorize('users', 'edit')) )
  with check ( (select auth.uid()) = id or (select public.authorize('users', 'edit')) );

-- ---------- audit_logs: users.view holders read; any authenticated user can log their own actions ----------
create policy "audit logs readable by users.view holders"
  on public.audit_logs for select
  to authenticated
  using ( (select public.authorize('users', 'view')) );

create policy "authenticated users can write their own audit rows"
  on public.audit_logs for insert
  to authenticated
  with check ( actor_user_id = (select auth.uid()) );

-- ---------- roles / role_permissions: writable only by roles.* holders ----------
create policy "roles insertable by roles.create holders"
  on public.roles for insert
  to authenticated
  with check ( (select public.authorize('roles', 'create')) );

create policy "roles updatable by roles.edit holders"
  on public.roles for update
  to authenticated
  using ( (select public.authorize('roles', 'edit')) )
  with check ( (select public.authorize('roles', 'edit')) );

create policy "roles deletable by roles.delete holders"
  on public.roles for delete
  to authenticated
  using ( (select public.authorize('roles', 'delete')) and is_system = false );

create policy "role_permissions writable by roles.edit holders"
  on public.role_permissions for all
  to authenticated
  using ( (select public.authorize('roles', 'edit')) )
  with check ( (select public.authorize('roles', 'edit')) );

-- ============================================================
-- custom_access_token_hook: embeds the caller's role name into
-- the JWT at token issue/refresh. Explicitly NOT security definer —
-- GoTrue invokes this as supabase_auth_admin, which already has the
-- explicit read policies above; definer-based escalation isn't needed
-- and is what current Supabase guidance says to avoid here.
-- ============================================================
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  role_name text;
begin
  select r.name into role_name
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = (event ->> 'user_id')::uuid;

  claims := coalesce(event -> 'claims', '{}'::jsonb);
  claims := jsonb_set(claims, '{user_role}', to_jsonb(coalesce(role_name, 'none')));
  event := jsonb_set(event, '{claims}', claims);

  return event;
end;
$$;

grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
grant usage on schema public to supabase_auth_admin;

-- ============================================================
-- Seed: system roles, permission catalog, role_permissions
-- ============================================================
insert into public.roles (name, is_system) values
  ('Super Admin', true),
  ('Admin', true),
  ('Manager', true),
  ('Finance User', true),
  ('Viewer', true);

do $$
declare
  m text;
  a text;
  full_modules text[] := array['expenses', 'income', 'budgets', 'categories', 'accounts', 'users', 'roles', 'settings'];
  view_only_modules text[] := array['dashboard', 'reports'];
begin
  foreach m in array full_modules loop
    foreach a in array array['view', 'create', 'edit', 'delete'] loop
      insert into public.permissions (module, action) values (m, a) on conflict do nothing;
    end loop;
  end loop;
  foreach m in array view_only_modules loop
    insert into public.permissions (module, action) values (m, 'view') on conflict do nothing;
  end loop;
end $$;

-- Super Admin + Admin: everything
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name in ('Super Admin', 'Admin');

-- Manager + Finance User: full CRUD on finance modules + settings, view-only dashboard/reports, no users/roles
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name in ('Manager', 'Finance User')
  and (
    p.module in ('expenses', 'income', 'budgets', 'categories', 'accounts', 'settings')
    or (p.module in ('dashboard', 'reports') and p.action = 'view')
  );

-- Viewer: view-only across finance modules + dashboard/reports/settings
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'Viewer'
  and p.action = 'view'
  and p.module in ('dashboard', 'expenses', 'income', 'budgets', 'categories', 'accounts', 'reports', 'settings');

-- ---------- backfill: existing user(s) become Super Admin ----------
insert into public.profiles (id, full_name, status, role_id)
select u.id, u.email, 'active', (select id from public.roles where name = 'Super Admin')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- ---------- new signups default to Viewer + get their profile row ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_role_id uuid;
begin
  select id into default_role_id from public.roles where name = 'Viewer';

  insert into public.profiles (id, full_name, status, role_id)
  values (new.id, new.email, 'active', default_role_id);

  insert into public.categories (user_id, name, type) values
    (new.id, 'Food', 'expense'),
    (new.id, 'Transport', 'expense'),
    (new.id, 'Shopping', 'expense'),
    (new.id, 'Bills', 'expense'),
    (new.id, 'Rent', 'expense'),
    (new.id, 'Entertainment', 'expense'),
    (new.id, 'Health', 'expense'),
    (new.id, 'Education', 'expense'),
    (new.id, 'Travel', 'expense'),
    (new.id, 'Other', 'expense'),
    (new.id, 'Salary', 'income'),
    (new.id, 'Freelance', 'income'),
    (new.id, 'Business', 'income'),
    (new.id, 'Rental Income', 'income'),
    (new.id, 'Interest', 'income'),
    (new.id, 'Other', 'income');

  return new;
end;
$$;

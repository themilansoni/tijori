-- ============================================================
-- Investments module: instruments (investments) + contributions
-- (investment_transactions), plus RBAC catalog entries.
-- ============================================================

create table public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('mutual_fund', 'stocks', 'fixed_deposit', 'ppf', 'epf', 'gold', 'real_estate', 'crypto', 'bonds', 'other')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index investments_user_id_idx on public.investments (user_id);

create trigger investments_set_updated_at
  before update on public.investments
  for each row execute function public.set_updated_at();

alter table public.investments enable row level security;

create policy "own investments"
  on public.investments for all
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

-- ---------- investment_transactions: money moving in/out of an investment ----------
create table public.investment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  investment_id uuid not null references public.investments(id) on delete cascade,
  type text not null check (type in ('invest', 'withdraw')),
  amount numeric(12, 2) not null check (amount > 0),
  transaction_date date not null default current_date,
  account_id uuid references public.accounts(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index investment_transactions_user_id_idx on public.investment_transactions (user_id);
create index investment_transactions_investment_idx on public.investment_transactions (investment_id);

create trigger investment_transactions_set_updated_at
  before update on public.investment_transactions
  for each row execute function public.set_updated_at();

alter table public.investment_transactions enable row level security;

create policy "own investment transactions"
  on public.investment_transactions for all
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

-- ============================================================
-- RBAC catalog: investments module, granted at the same tiers as
-- the other finance modules (expenses/income/budgets/accounts).
-- ============================================================
insert into public.permissions (module, action)
select 'investments', a
from unnest(array['view', 'create', 'edit', 'delete']) as a
on conflict do nothing;

-- Super Admin + Admin: everything
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name in ('Super Admin', 'Admin')
  and p.module = 'investments'
on conflict do nothing;

-- Manager + Finance User: full CRUD
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name in ('Manager', 'Finance User')
  and p.module = 'investments'
on conflict do nothing;

-- Viewer: view-only
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'Viewer'
  and p.module = 'investments'
  and p.action = 'view'
on conflict do nothing;

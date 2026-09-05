-- ============================================================
-- Replace the contribution-ledger investments module with a
-- holdings-based one (quantity + average buy price + current
-- price -> market value / P&L), plus broker connections so a
-- BrokerAdapter (starting with Zerodha) can sync real holdings
-- alongside manually-entered ones. No production data exists yet
-- for the old tables, so this drops and recreates rather than
-- migrating rows.
-- ============================================================

drop table if exists public.investment_transactions cascade;
drop table if exists public.investments cascade;

-- ---------- broker_connections ----------
create table public.broker_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  broker text not null check (broker in ('zerodha', 'upstox')),
  status text not null default 'disconnected' check (status in ('connected', 'disconnected', 'expired', 'error')),
  encrypted_access_token text,
  broker_user_id text,
  connected_at timestamptz,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, broker)
);

create trigger broker_connections_set_updated_at
  before update on public.broker_connections
  for each row execute function public.set_updated_at();

alter table public.broker_connections enable row level security;

create policy "own broker connections"
  on public.broker_connections for all
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

-- ---------- investment_holdings ----------
create table public.investment_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  broker_connection_id uuid references public.broker_connections(id) on delete set null,
  source text not null default 'manual' check (source in ('manual', 'zerodha')),
  instrument_name text not null,
  asset_type text not null check (asset_type in ('stock', 'etf', 'mutual_fund', 'bond', 'gold', 'fixed_deposit', 'other')),
  symbol text,
  isin text,
  exchange text,
  quantity numeric(16, 4) not null default 0,
  average_buy_price numeric(12, 4) not null default 0,
  current_price numeric(12, 4),
  price_source text not null default 'manual' check (price_source in ('manual', 'zerodha')),
  last_price_update timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index investment_holdings_user_id_idx on public.investment_holdings (user_id);

-- Idempotent broker sync: re-syncing the same ISIN under the same
-- connection updates the existing row instead of duplicating it.
create unique index investment_holdings_broker_isin_idx
  on public.investment_holdings (broker_connection_id, isin)
  where source = 'zerodha' and isin is not null;

create trigger investment_holdings_set_updated_at
  before update on public.investment_holdings
  for each row execute function public.set_updated_at();

alter table public.investment_holdings enable row level security;

create policy "own investment holdings"
  on public.investment_holdings for all
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

-- ---------- investment_transactions ----------
create table public.investment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  holding_id uuid not null references public.investment_holdings(id) on delete cascade,
  type text not null check (type in ('buy', 'sell', 'dividend', 'bonus', 'split')),
  quantity numeric(16, 4),
  price numeric(12, 4),
  charges numeric(12, 2) not null default 0,
  total_amount numeric(14, 2) not null,
  transaction_date date not null default current_date,
  account_id uuid references public.accounts(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index investment_transactions_user_id_idx on public.investment_transactions (user_id);
create index investment_transactions_holding_idx on public.investment_transactions (holding_id);

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
-- RBAC: add sync/connect actions for the investments module.
-- ============================================================
alter table public.permissions drop constraint permissions_action_check;
alter table public.permissions add constraint permissions_action_check
  check (action in ('view', 'create', 'edit', 'delete', 'sync', 'connect'));

insert into public.permissions (module, action) values
  ('investments', 'sync'),
  ('investments', 'connect')
on conflict do nothing;

-- Super Admin + Admin: everything, including connect
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name in ('Super Admin', 'Admin')
  and p.module = 'investments'
  and p.action in ('sync', 'connect')
on conflict do nothing;

-- Manager + Finance User: can sync an already-connected broker, not connect a new one
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name in ('Manager', 'Finance User')
  and p.module = 'investments'
  and p.action = 'sync'
on conflict do nothing;

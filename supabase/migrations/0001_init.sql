-- ============================================================
-- Tijori: Expense / Income / Category / Budget schema
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- updated_at helper ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- categories ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('expense', 'income')),
  parent_category_id uuid references public.categories(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index categories_user_id_idx on public.categories (user_id);
create index categories_parent_idx on public.categories (parent_category_id);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

alter table public.categories enable row level security;

create policy "own categories"
  on public.categories for all
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

-- ---------- transactions ----------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('expense', 'income')),
  category_id uuid not null references public.categories(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  transaction_date date not null default current_date,
  description text,
  payment_method text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transactions_user_id_idx on public.transactions (user_id);
create index transactions_user_date_idx on public.transactions (user_id, transaction_date);
create index transactions_category_idx on public.transactions (category_id);

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

alter table public.transactions enable row level security;

create policy "own transactions"
  on public.transactions for all
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

-- ---------- budgets ----------
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  period text not null default 'daily' check (period in ('daily', 'weekly', 'monthly')),
  start_date date not null default current_date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index budgets_user_id_idx on public.budgets (user_id);
create index budgets_category_idx on public.budgets (category_id);

create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

alter table public.budgets enable row level security;

create policy "own budgets"
  on public.budgets for all
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

-- ---------- default category seeding for new users ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

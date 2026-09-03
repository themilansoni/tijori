alter table public.budgets drop constraint budgets_period_check;
alter table public.budgets add constraint budgets_period_check
  check (period in ('daily', 'weekly', 'monthly', 'yearly'));

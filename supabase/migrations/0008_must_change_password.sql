-- ============================================================
-- Forced password change: admin-issued temporary passwords (new
-- user creation, admin password reset) now flag the profile so the
-- app can force a change before letting the user do anything else.
-- ============================================================

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

-- Embed the flag in the JWT claims, same pattern as user_role — the
-- middleware gate reads it straight off the token rather than making
-- an extra DB round trip per request.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  role_name text;
  must_change boolean;
begin
  select r.name, p.must_change_password into role_name, must_change
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = (event ->> 'user_id')::uuid;

  claims := coalesce(event -> 'claims', '{}'::jsonb);
  claims := jsonb_set(claims, '{user_role}', to_jsonb(coalesce(role_name, 'none')));
  claims := jsonb_set(claims, '{must_change_password}', to_jsonb(coalesce(must_change, false)));
  event := jsonb_set(event, '{claims}', claims);

  return event;
end;
$$;

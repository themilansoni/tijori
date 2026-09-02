-- RLS policies alone don't grant table access — Postgres requires the base
-- GRANT first, RLS only filters rows on top of it. The custom_access_token_hook
-- runs as supabase_auth_admin, which had RLS policies but no GRANT, causing
-- every login to fail with "Error running hook URI: ...".
grant select on public.profiles to supabase_auth_admin;
grant select on public.roles to supabase_auth_admin;

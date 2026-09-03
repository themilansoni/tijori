import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Full-privilege admin client (secret key, no cookies/session context).
 * Never import this from a client component. Every caller MUST run an
 * `authorize()` check first — this client bypasses RLS entirely.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

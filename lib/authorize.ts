import { createClient } from "@/lib/supabase/server";
import type { PermAction } from "@/lib/types";

export type { PermAction };

export type Module =
  | "dashboard"
  | "expenses"
  | "income"
  | "budgets"
  | "categories"
  | "accounts"
  | "investments"
  | "reports"
  | "users"
  | "roles"
  | "settings";

/**
 * Server-side permission check. Calls the `authorize()` SQL function, which
 * reads the caller's role off their JWT claim (set by custom_access_token_hook)
 * and checks role_permissions. This is the real authorization boundary — call
 * it at the top of every Server Action / protected page, not just to toggle UI.
 *
 * Pass an existing `client` when the caller already has one (e.g. it's about
 * to run its own queries afterward) rather than letting this create a second
 * one — creating multiple independent server clients within a single request
 * has been observed to leave a later client's session unresolved when an
 * earlier one triggers a token refresh mid-render.
 */
export async function can(
  module: Module,
  action: PermAction,
  client?: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase.rpc("authorize", {
    p_module: module,
    p_action: action,
  });
  if (error) return false;
  return Boolean(data);
}

/** Throws-style guard for Server Actions: returns an error object if not permitted. */
export async function requirePermission(
  module: Module,
  action: PermAction,
  client?: Awaited<ReturnType<typeof createClient>>
): Promise<{ error: string } | null> {
  const allowed = await can(module, action, client);
  if (!allowed) return { error: "You don't have permission to do this." };
  return null;
}

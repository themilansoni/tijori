import { createClient } from "@/lib/supabase/server";

export type Module =
  | "dashboard"
  | "expenses"
  | "income"
  | "budgets"
  | "categories"
  | "accounts"
  | "reports"
  | "users"
  | "roles"
  | "settings";

export type PermAction = "view" | "create" | "edit" | "delete";

/**
 * Server-side permission check. Calls the `authorize()` SQL function, which
 * reads the caller's role off their JWT claim (set by custom_access_token_hook)
 * and checks role_permissions. This is the real authorization boundary — call
 * it at the top of every Server Action / protected page, not just to toggle UI.
 */
export async function can(module: Module, action: PermAction): Promise<boolean> {
  const supabase = await createClient();
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
  action: PermAction
): Promise<{ error: string } | null> {
  const allowed = await can(module, action);
  if (!allowed) return { error: "You don't have permission to do this." };
  return null;
}

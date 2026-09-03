"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/authorize";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "./categories";
import type { Role } from "@/lib/types";

const PERMISSION_ERROR = "You don't have permission to do this.";

export type CreateRoleResult = { error: string } | { ok: true; role: Role };

export async function createRole(formData: FormData): Promise<CreateRoleResult> {
  if (!(await can("roles", "create"))) return { error: PERMISSION_ERROR };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Role name is required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .insert({ name, is_system: false })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { error: "A role with this name already exists." };
    return { error: error.message };
  }

  await logAudit({
    action: "role.created",
    targetType: "role",
    targetId: data.id,
    summary: `Created role "${name}"`,
  });

  revalidatePath("/users");
  return { ok: true, role: data as Role };
}

export async function deleteRole(id: string): Promise<ActionResult> {
  if (!(await can("roles", "delete"))) return { error: PERMISSION_ERROR };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("roles").select("name, is_system").eq("id", id).single();
  if (existing?.is_system) return { error: "System roles can't be deleted." };

  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role_id", id);
  if (count && count > 0) {
    return { error: `${count} user${count === 1 ? "" : "s"} still have this role — reassign them first.` };
  }

  const { error } = await supabase.from("roles").delete().eq("id", id);
  if (error) return { error: error.message };

  await logAudit({
    action: "role.deleted",
    targetType: "role",
    targetId: id,
    summary: `Deleted role "${existing?.name ?? id}"`,
  });

  revalidatePath("/users");
  return { ok: true };
}

export async function setRolePermission(
  roleId: string,
  permissionId: string,
  grant: boolean
): Promise<ActionResult> {
  if (!(await can("roles", "edit"))) return { error: PERMISSION_ERROR };

  const supabase = await createClient();

  if (grant) {
    const { error } = await supabase
      .from("role_permissions")
      .insert({ role_id: roleId, permission_id: permissionId });
    if (error && error.code !== "23505") return { error: error.message };
  } else {
    const { error } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId)
      .eq("permission_id", permissionId);
    if (error) return { error: error.message };
  }

  await logAudit({
    action: grant ? "role.permission_granted" : "role.permission_revoked",
    targetType: "role",
    targetId: roleId,
    summary: `${grant ? "Granted" : "Revoked"} a permission on role`,
  });

  revalidatePath("/users");
  return { ok: true };
}

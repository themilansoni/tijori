"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { can } from "@/lib/authorize";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "./categories";

const PERMISSION_ERROR = "You don't have permission to do this.";

function generateTempPassword() {
  return randomBytes(9).toString("base64url");
}

export type CreateUserResult = { error: string } | { ok: true; email: string; tempPassword: string };

export async function createUser(formData: FormData): Promise<CreateUserResult> {
  if (!(await can("users", "create"))) return { error: PERMISSION_ERROR };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const roleId = String(formData.get("role_id") ?? "");

  if (!email) return { error: "Email is required." };
  if (!roleId) return { error: "Please choose a role." };

  const supabase = await createClient();
  const { data: role } = await supabase.from("roles").select("id").eq("id", roleId).maybeSingle();
  if (!role) return { error: "Invalid role." };

  const tempPassword = generateTempPassword();
  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (createError) return { error: createError.message };

  const userId = created.user.id;

  // handle_new_user() already inserted a default (Viewer) profile row — update it
  // to the chosen role/name rather than inserting a second one.
  const { error: profileError } = await admin
    .from("profiles")
    .update({ role_id: roleId, full_name: fullName || email })
    .eq("id", userId);
  if (profileError) return { error: profileError.message };

  await logAudit({
    action: "user.created",
    targetType: "user",
    targetId: userId,
    summary: `Created user "${email}"`,
  });

  revalidatePath("/users");
  return { ok: true, email, tempPassword };
}

export async function updateUserProfile(formData: FormData): Promise<ActionResult> {
  if (!(await can("users", "edit"))) return { error: PERMISSION_ERROR };

  const id = String(formData.get("id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const roleId = String(formData.get("role_id") ?? "");

  if (!id) return { error: "Missing user id." };
  if (!fullName) return { error: "Name is required." };
  if (!roleId) return { error: "Please choose a role." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ full_name: fullName, role_id: roleId })
    .eq("id", id);
  if (error) return { error: error.message };

  await logAudit({
    action: "user.updated",
    targetType: "user",
    targetId: id,
    summary: `Updated user "${fullName}"`,
  });

  revalidatePath("/users");
  return { ok: true };
}

export async function setUserActive(id: string, isActive: boolean): Promise<ActionResult> {
  if (!(await can("users", "edit"))) return { error: PERMISSION_ERROR };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === id) return { error: "You can't deactivate your own account." };

  const admin = createAdminClient();
  const { error: banError } = await admin.auth.admin.updateUserById(id, {
    ban_duration: isActive ? "none" : "876000h",
  });
  if (banError) return { error: banError.message };

  const { data: existing } = await admin.from("profiles").select("full_name").eq("id", id).single();
  const { error } = await admin.from("profiles").update({ status: isActive ? "active" : "inactive" }).eq("id", id);
  if (error) return { error: error.message };

  await logAudit({
    action: isActive ? "user.reactivated" : "user.deactivated",
    targetType: "user",
    targetId: id,
    summary: `${isActive ? "Reactivated" : "Deactivated"} user "${existing?.full_name ?? id}"`,
  });

  revalidatePath("/users");
  return { ok: true };
}

export type ResetPasswordResult = { error: string } | { ok: true; tempPassword: string };

export async function resetUserPassword(id: string): Promise<ResetPasswordResult> {
  if (!(await can("users", "edit"))) return { error: PERMISSION_ERROR };

  const tempPassword = generateTempPassword();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password: tempPassword });
  if (error) return { error: error.message };

  const { data: existing } = await admin.from("profiles").select("full_name").eq("id", id).single();
  await logAudit({
    action: "user.password_reset",
    targetType: "user",
    targetId: id,
    summary: `Reset password for "${existing?.full_name ?? id}"`,
  });

  revalidatePath("/users");
  return { ok: true, tempPassword };
}

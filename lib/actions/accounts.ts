"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/authorize";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "./categories";
import type { Account } from "@/lib/types";

const PERMISSION_ERROR = "You don't have permission to do this.";

export type CreateAccountResult = { error: string } | { ok: true; account: Account };

export async function createAccount(formData: FormData): Promise<CreateAccountResult> {
  if (!(await can("accounts", "create"))) return { error: PERMISSION_ERROR };

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const opening_balance = Number(formData.get("opening_balance") ?? 0);
  const currency = String(formData.get("currency") ?? "INR").trim() || "INR";

  if (!name) return { error: "Account name is required." };
  if (!["cash", "bank", "credit_card", "debit_card", "wallet", "investment", "other"].includes(type)) {
    return { error: "Invalid account type." };
  }
  if (!Number.isFinite(opening_balance)) return { error: "Opening balance must be a number." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data, error } = await supabase
    .from("accounts")
    .insert({ user_id: user.id, name, type, opening_balance, currency })
    .select()
    .single();

  if (error) return { error: error.message };

  await logAudit({
    action: "account.created",
    targetType: "account",
    targetId: data.id,
    summary: `Created account "${name}" (${type})`,
  });

  revalidatePath("/accounts");
  revalidatePath("/income");
  revalidatePath("/expenses");
  return { ok: true, account: data as Account };
}

export async function updateAccount(formData: FormData): Promise<ActionResult> {
  if (!(await can("accounts", "edit"))) return { error: PERMISSION_ERROR };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const opening_balance = Number(formData.get("opening_balance") ?? 0);
  const currency = String(formData.get("currency") ?? "INR").trim() || "INR";

  if (!id) return { error: "Missing account id." };
  if (!name) return { error: "Account name is required." };
  if (!Number.isFinite(opening_balance)) return { error: "Opening balance must be a number." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .update({ name, type, opening_balance, currency })
    .eq("id", id);

  if (error) return { error: error.message };

  await logAudit({
    action: "account.updated",
    targetType: "account",
    targetId: id,
    summary: `Updated account "${name}"`,
  });

  revalidatePath("/accounts");
  revalidatePath("/income");
  revalidatePath("/expenses");
  return { ok: true };
}

export async function setAccountActive(id: string, isActive: boolean): Promise<ActionResult> {
  if (!(await can("accounts", "edit"))) return { error: PERMISSION_ERROR };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("accounts").select("name").eq("id", id).single();

  const { error } = await supabase.from("accounts").update({ is_active: isActive }).eq("id", id);

  if (error) return { error: error.message };

  await logAudit({
    action: isActive ? "account.reactivated" : "account.deactivated",
    targetType: "account",
    targetId: id,
    summary: `${isActive ? "Reactivated" : "Deactivated"} account "${existing?.name ?? id}"`,
  });

  revalidatePath("/accounts");
  return { ok: true };
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  if (!(await can("accounts", "delete"))) return { error: PERMISSION_ERROR };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("accounts").select("name").eq("id", id).single();

  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("account_id", id);

  if (count && count > 0) {
    const { error } = await supabase.from("accounts").update({ is_active: false }).eq("id", id);
    if (error) return { error: error.message };
    await logAudit({
      action: "account.deactivated",
      targetType: "account",
      targetId: id,
      summary: `Deactivated account "${existing?.name ?? id}" (has transactions, could not delete)`,
    });
    revalidatePath("/accounts");
    return { ok: true };
  }

  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) return { error: error.message };

  await logAudit({
    action: "account.deleted",
    targetType: "account",
    targetId: id,
    summary: `Deleted account "${existing?.name ?? id}"`,
  });

  revalidatePath("/accounts");
  return { ok: true };
}

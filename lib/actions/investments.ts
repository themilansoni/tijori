"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/authorize";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "./categories";
import type { Investment, InvestmentTransaction, InvestmentTxType } from "@/lib/types";

const PERMISSION_ERROR = "You don't have permission to do this.";
const INVESTMENT_TYPES = [
  "mutual_fund",
  "stocks",
  "fixed_deposit",
  "ppf",
  "epf",
  "gold",
  "real_estate",
  "crypto",
  "bonds",
  "other",
];

export type CreateInvestmentResult = { error: string } | { ok: true; investment: Investment };

export async function createInvestment(formData: FormData): Promise<CreateInvestmentResult> {
  const supabase = await createClient();
  if (!(await can("investments", "create", supabase))) return { error: PERMISSION_ERROR };

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");

  if (!name) return { error: "Investment name is required." };
  if (!INVESTMENT_TYPES.includes(type)) return { error: "Invalid investment type." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data, error } = await supabase
    .from("investments")
    .insert({ user_id: user.id, name, type })
    .select()
    .single();

  if (error) return { error: error.message };

  await logAudit({
    action: "investment.created",
    targetType: "investment",
    targetId: data.id,
    summary: `Created investment "${name}" (${type})`,
  });

  revalidatePath("/investments");
  return { ok: true, investment: data as Investment };
}

export async function updateInvestment(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  if (!(await can("investments", "edit", supabase))) return { error: PERMISSION_ERROR };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");

  if (!id) return { error: "Missing investment id." };
  if (!name) return { error: "Investment name is required." };
  if (!INVESTMENT_TYPES.includes(type)) return { error: "Invalid investment type." };

  const { error } = await supabase.from("investments").update({ name, type }).eq("id", id);
  if (error) return { error: error.message };

  await logAudit({
    action: "investment.updated",
    targetType: "investment",
    targetId: id,
    summary: `Updated investment "${name}"`,
  });

  revalidatePath("/investments");
  return { ok: true };
}

export async function setInvestmentActive(id: string, isActive: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  if (!(await can("investments", "edit", supabase))) return { error: PERMISSION_ERROR };

  const { data: existing } = await supabase.from("investments").select("name").eq("id", id).single();
  const { error } = await supabase.from("investments").update({ is_active: isActive }).eq("id", id);
  if (error) return { error: error.message };

  await logAudit({
    action: isActive ? "investment.reactivated" : "investment.deactivated",
    targetType: "investment",
    targetId: id,
    summary: `${isActive ? "Reactivated" : "Deactivated"} investment "${existing?.name ?? id}"`,
  });

  revalidatePath("/investments");
  return { ok: true };
}

export async function deleteInvestment(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  if (!(await can("investments", "delete", supabase))) return { error: PERMISSION_ERROR };

  const { data: existing } = await supabase.from("investments").select("name").eq("id", id).single();

  const { count } = await supabase
    .from("investment_transactions")
    .select("id", { count: "exact", head: true })
    .eq("investment_id", id);

  if (count && count > 0) {
    const { error } = await supabase.from("investments").update({ is_active: false }).eq("id", id);
    if (error) return { error: error.message };
    await logAudit({
      action: "investment.deactivated",
      targetType: "investment",
      targetId: id,
      summary: `Deactivated investment "${existing?.name ?? id}" (has contributions, could not delete)`,
    });
    revalidatePath("/investments");
    return { ok: true };
  }

  const { error } = await supabase.from("investments").delete().eq("id", id);
  if (error) return { error: error.message };

  await logAudit({
    action: "investment.deleted",
    targetType: "investment",
    targetId: id,
    summary: `Deleted investment "${existing?.name ?? id}"`,
  });

  revalidatePath("/investments");
  return { ok: true };
}

export async function addInvestmentContribution(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  if (!(await can("investments", "create", supabase))) return { error: PERMISSION_ERROR };

  const investment_id = String(formData.get("investment_id") ?? "");
  const type = String(formData.get("type") ?? "invest") as InvestmentTxType;
  const amount = Number(formData.get("amount"));
  const transaction_date = String(formData.get("transaction_date") ?? "");
  const account_id = String(formData.get("account_id") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!investment_id) return { error: "Missing investment." };
  if (type !== "invest" && type !== "withdraw") return { error: "Invalid contribution type." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Amount must be greater than 0." };
  if (!transaction_date) return { error: "Date is required." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: investment } = await supabase
    .from("investments")
    .select("name")
    .eq("id", investment_id)
    .single();
  if (!investment) return { error: "Investment not found." };

  const { error } = await supabase.from("investment_transactions").insert({
    user_id: user.id,
    investment_id,
    type,
    amount,
    transaction_date,
    account_id,
    note,
  });
  if (error) return { error: error.message };

  await logAudit({
    action: type === "invest" ? "investment.contribution_added" : "investment.withdrawal_added",
    targetType: "investment",
    targetId: investment_id,
    summary: `${type === "invest" ? "Added ₹" : "Withdrew ₹"}${amount} ${type === "invest" ? "to" : "from"} "${investment.name}"`,
  });

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteInvestmentContribution(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  if (!(await can("investments", "delete", supabase))) return { error: PERMISSION_ERROR };

  const { data: existing } = await supabase
    .from("investment_transactions")
    .select("amount, type, investment_id")
    .eq("id", id)
    .single<Pick<InvestmentTransaction, "amount" | "type" | "investment_id">>();

  const { error } = await supabase.from("investment_transactions").delete().eq("id", id);
  if (error) return { error: error.message };

  await logAudit({
    action: "investment.contribution_deleted",
    targetType: "investment",
    targetId: existing?.investment_id ?? id,
    summary: existing ? `Removed ${existing.type} of ₹${existing.amount}` : "Removed a contribution",
  });

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { ok: true };
}

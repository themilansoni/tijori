"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, type Module } from "@/lib/authorize";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "./categories";

const PERMISSION_ERROR = "You don't have permission to do this.";

function moduleFor(type: "expense" | "income"): Module {
  return type === "expense" ? "expenses" : "income";
}

function parseTransactionForm(formData: FormData) {
  const amount = Number(formData.get("amount"));
  const category_id = String(formData.get("category_id") ?? "");
  const transaction_date = String(formData.get("transaction_date") ?? "");
  const description = String(formData.get("description") ?? "").trim() || null;
  const payment_method = String(formData.get("payment_method") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const account_id = String(formData.get("account_id") ?? "").trim() || null;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Amount must be greater than 0." } as const;
  }
  if (!category_id) return { error: "Category is required." } as const;
  if (!transaction_date) return { error: "Date is required." } as const;

  return {
    data: {
      amount,
      category_id,
      transaction_date,
      description,
      payment_method,
      note,
      account_id,
    },
  } as const;
}

export async function createTransaction(
  type: "expense" | "income",
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  if (!(await can(moduleFor(type), "create", supabase))) return { error: PERMISSION_ERROR };

  const parsed = parseTransactionForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data, error } = await supabase
    .from("transactions")
    .insert({ user_id: user.id, type, ...parsed.data })
    .select()
    .single();

  if (error) return { error: error.message };

  await logAudit({
    action: `${type}.created`,
    targetType: "transaction",
    targetId: data.id,
    summary: `Added ${type} of ₹${parsed.data.amount}`,
  });

  revalidatePath("/expenses");
  revalidatePath("/income");
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateTransaction(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing transaction id." };

  const parsed = parseTransactionForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("transactions")
    .select("type")
    .eq("id", id)
    .single();
  if (!existing) return { error: "Transaction not found." };

  if (!(await can(moduleFor(existing.type), "edit", supabase))) return { error: PERMISSION_ERROR };

  const { error } = await supabase.from("transactions").update(parsed.data).eq("id", id);

  if (error) return { error: error.message };

  await logAudit({
    action: `${existing.type}.updated`,
    targetType: "transaction",
    targetId: id,
    summary: `Edited ${existing.type} transaction`,
  });

  revalidatePath("/expenses");
  revalidatePath("/income");
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("transactions")
    .select("type, amount")
    .eq("id", id)
    .single();
  if (!existing) return { error: "Transaction not found." };

  if (!(await can(moduleFor(existing.type), "delete", supabase))) return { error: PERMISSION_ERROR };

  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) return { error: error.message };

  await logAudit({
    action: `${existing.type}.deleted`,
    targetType: "transaction",
    targetId: id,
    summary: `Deleted ${existing.type} of ₹${existing.amount}`,
  });

  revalidatePath("/expenses");
  revalidatePath("/income");
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return { ok: true };
}

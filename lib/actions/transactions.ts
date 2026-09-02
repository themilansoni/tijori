"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./categories";

function parseTransactionForm(formData: FormData) {
  const amount = Number(formData.get("amount"));
  const category_id = String(formData.get("category_id") ?? "");
  const transaction_date = String(formData.get("transaction_date") ?? "");
  const description = String(formData.get("description") ?? "").trim() || null;
  const payment_method = String(formData.get("payment_method") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Amount must be greater than 0." } as const;
  }
  if (!category_id) return { error: "Category is required." } as const;
  if (!transaction_date) return { error: "Date is required." } as const;

  return {
    data: { amount, category_id, transaction_date, description, payment_method, note },
  } as const;
}

export async function createTransaction(
  type: "expense" | "income",
  formData: FormData
): Promise<ActionResult> {
  const parsed = parseTransactionForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("transactions")
    .insert({ user_id: user.id, type, ...parsed.data });

  if (error) return { error: error.message };

  revalidatePath("/expenses");
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
  const { error } = await supabase.from("transactions").update(parsed.data).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/expenses");
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/expenses");
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return { ok: true };
}

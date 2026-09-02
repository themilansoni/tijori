"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./categories";

export async function createBudget(formData: FormData): Promise<ActionResult> {
  const category_id = String(formData.get("category_id") ?? "");
  const amount = Number(formData.get("amount"));
  const period = String(formData.get("period") ?? "");
  const start_date = String(formData.get("start_date") ?? "") || undefined;

  if (!category_id) return { error: "Category is required." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Budget must be greater than 0." };
  if (!["daily", "weekly", "monthly", "yearly"].includes(period)) {
    return { error: "Invalid budget period." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("budgets").insert({
    user_id: user.id,
    category_id,
    amount,
    period,
    ...(start_date ? { start_date } : {}),
  });

  if (error) return { error: error.message };

  revalidatePath("/budgets");
  revalidatePath("/expenses");
  return { ok: true };
}

export async function updateBudget(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const amount = Number(formData.get("amount"));
  const period = String(formData.get("period") ?? "");

  if (!id) return { error: "Missing budget id." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Budget must be greater than 0." };
  if (!["daily", "weekly", "monthly", "yearly"].includes(period)) {
    return { error: "Invalid budget period." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("budgets").update({ amount, period }).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/budgets");
  revalidatePath("/expenses");
  return { ok: true };
}

export async function setBudgetActive(id: string, isActive: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").update({ is_active: isActive }).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/budgets");
  revalidatePath("/expenses");
  return { ok: true };
}

export async function deleteBudget(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/budgets");
  revalidatePath("/expenses");
  return { ok: true };
}

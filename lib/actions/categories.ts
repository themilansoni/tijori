"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string } | { ok: true };

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");

  if (!name) return { error: "Category name is required." };
  if (type !== "expense" && type !== "income") return { error: "Invalid category type." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("categories")
    .insert({ user_id: user.id, name, type });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/expenses");
  revalidatePath("/budgets");
  return { ok: true };
}

export async function updateCategory(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!id) return { error: "Missing category id." };
  if (!name) return { error: "Category name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("categories").update({ name }).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/expenses");
  revalidatePath("/budgets");
  return { ok: true };
}

export async function setCategoryActive(id: string, isActive: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/expenses");
  revalidatePath("/budgets");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (count && count > 0) {
    // Historical transactions reference this category — deactivate instead of deleting.
    const { error } = await supabase
      .from("categories")
      .update({ is_active: false })
      .eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/settings");
    return { ok: true };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/expenses");
  revalidatePath("/budgets");
  return { ok: true };
}

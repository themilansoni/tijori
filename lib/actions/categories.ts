"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

export type ActionResult = { error?: string } | { ok: true };
export type CreateCategoryResult = { error: string } | { ok: true; category: Category };

const DUPLICATE_NAME_ERROR = "Category already exists. Please choose another name.";

async function isDuplicateName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  type: string,
  name: string,
  excludeId?: string
) {
  let query = supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", type)
    .ilike("name", name);

  if (excludeId) query = query.neq("id", excludeId);

  const { count } = await query;
  return Boolean(count && count > 0);
}

export async function createCategory(formData: FormData): Promise<CreateCategoryResult> {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");

  if (!name) return { error: "Category name is required." };
  if (type !== "expense" && type !== "income") return { error: "Invalid category type." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (await isDuplicateName(supabase, user.id, type, name)) {
    return { error: DUPLICATE_NAME_ERROR };
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({ user_id: user.id, name, type })
    .select()
    .single();

  if (error) {
    // DB unique index as a safety net in case of a race with the pre-check above.
    if (error.code === "23505") return { error: DUPLICATE_NAME_ERROR };
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/expenses");
  revalidatePath("/budgets");
  return { ok: true, category: data as Category };
}

export async function updateCategory(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!id) return { error: "Missing category id." };
  if (!name) return { error: "Category name is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: existing } = await supabase
    .from("categories")
    .select("type")
    .eq("id", id)
    .single();
  if (!existing) return { error: "Category not found." };

  if (await isDuplicateName(supabase, user.id, existing.type, name, id)) {
    return { error: DUPLICATE_NAME_ERROR };
  }

  const { error } = await supabase.from("categories").update({ name }).eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: DUPLICATE_NAME_ERROR };
    return { error: error.message };
  }

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

import { collection, doc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { requireUid } from "@/lib/firebase/require-user";
import type { ActionResult } from "./categories";

const PERIODS = ["daily", "weekly", "monthly", "yearly"];

export async function createBudget(formData: FormData): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  const category_id = String(formData.get("category_id") ?? "");
  const amount = Number(formData.get("amount"));
  const period = String(formData.get("period") ?? "");
  const start_date = String(formData.get("start_date") ?? "") || new Date().toISOString().slice(0, 10);

  if (!category_id) return { error: "Category is required." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Budget must be greater than 0." };
  if (!PERIODS.includes(period)) return { error: "Invalid budget period." };

  const now = new Date().toISOString();
  await addDoc(collection(db, "users", auth.uid, "budgets"), {
    user_id: auth.uid,
    category_id,
    amount,
    period,
    start_date,
    is_active: true,
    created_at: now,
    updated_at: now,
  });

  return { ok: true };
}

export async function updateBudget(formData: FormData): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  const id = String(formData.get("id") ?? "");
  const amount = Number(formData.get("amount"));
  const period = String(formData.get("period") ?? "");

  if (!id) return { error: "Missing budget id." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Budget must be greater than 0." };
  if (!PERIODS.includes(period)) return { error: "Invalid budget period." };

  await updateDoc(doc(db, "users", auth.uid, "budgets", id), {
    amount,
    period,
    updated_at: new Date().toISOString(),
  });

  return { ok: true };
}

export async function setBudgetActive(id: string, isActive: boolean): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  await updateDoc(doc(db, "users", auth.uid, "budgets", id), {
    is_active: isActive,
    updated_at: new Date().toISOString(),
  });

  return { ok: true };
}

export async function deleteBudget(id: string): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  await deleteDoc(doc(db, "users", auth.uid, "budgets", id));
  return { ok: true };
}

import { collection, doc, getDoc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { requireUid } from "@/lib/firebase/require-user";
import type { ActionResult } from "./categories";

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
  const auth = requireUid();
  if ("error" in auth) return auth;

  const parsed = parseTransactionForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const now = new Date().toISOString();
  await addDoc(collection(db, "users", auth.uid, "transactions"), {
    user_id: auth.uid,
    type,
    ...parsed.data,
    created_at: now,
    updated_at: now,
  });

  return { ok: true };
}

export async function updateTransaction(formData: FormData): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing transaction id." };

  const parsed = parseTransactionForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const ref = doc(db, "users", auth.uid, "transactions", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { error: "Transaction not found." };

  await updateDoc(ref, { ...parsed.data, updated_at: new Date().toISOString() });
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  const ref = doc(db, "users", auth.uid, "transactions", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { error: "Transaction not found." };

  await deleteDoc(ref);
  return { ok: true };
}

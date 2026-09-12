import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { requireUid } from "@/lib/firebase/require-user";
import type { ActionResult } from "./categories";
import type { Account } from "@/lib/types";

const ACCOUNT_TYPES = ["cash", "bank", "credit_card", "debit_card", "wallet", "investment", "other"];

export type CreateAccountResult = { error: string } | { ok: true; account: Account };

export async function createAccount(formData: FormData): Promise<CreateAccountResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const opening_balance = Number(formData.get("opening_balance") ?? 0);
  const currency = String(formData.get("currency") ?? "INR").trim() || "INR";

  if (!name) return { error: "Account name is required." };
  if (!ACCOUNT_TYPES.includes(type)) return { error: "Invalid account type." };
  if (!Number.isFinite(opening_balance)) return { error: "Opening balance must be a number." };

  const now = new Date().toISOString();
  const data = {
    user_id: auth.uid,
    name,
    type,
    opening_balance,
    currency,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
  const docRef = await addDoc(collection(db, "users", auth.uid, "accounts"), data);

  return { ok: true, account: { id: docRef.id, ...data } as Account };
}

export async function updateAccount(formData: FormData): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const opening_balance = Number(formData.get("opening_balance") ?? 0);
  const currency = String(formData.get("currency") ?? "INR").trim() || "INR";

  if (!id) return { error: "Missing account id." };
  if (!name) return { error: "Account name is required." };
  if (!Number.isFinite(opening_balance)) return { error: "Opening balance must be a number." };

  await updateDoc(doc(db, "users", auth.uid, "accounts", id), {
    name,
    type,
    opening_balance,
    currency,
    updated_at: new Date().toISOString(),
  });

  return { ok: true };
}

export async function setAccountActive(id: string, isActive: boolean): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  await updateDoc(doc(db, "users", auth.uid, "accounts", id), {
    is_active: isActive,
    updated_at: new Date().toISOString(),
  });

  return { ok: true };
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;
  const { uid } = auth;

  const txSnap = await getDocs(
    query(collection(db, "users", uid, "transactions"), where("account_id", "==", id))
  );

  if (!txSnap.empty) {
    await updateDoc(doc(db, "users", uid, "accounts", id), {
      is_active: false,
      updated_at: new Date().toISOString(),
    });
    return { ok: true };
  }

  await deleteDoc(doc(db, "users", uid, "accounts", id));
  return { ok: true };
}

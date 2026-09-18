import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  type Transaction as FirestoreTransaction,
  type DocumentReference,
  type DocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { requireUid } from "@/lib/firebase/require-user";
import type { ActionResult } from "./categories";
import type { Loan, Transaction } from "@/lib/types";

function parseTransactionForm(formData: FormData) {
  const amount = Number(formData.get("amount"));
  const category_id = String(formData.get("category_id") ?? "");
  const transaction_date = String(formData.get("transaction_date") ?? "");
  const description = String(formData.get("description") ?? "").trim() || null;
  const payment_method = String(formData.get("payment_method") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const account_id = String(formData.get("account_id") ?? "").trim() || null;
  const loan_id = String(formData.get("loan_id") ?? "").trim() || null;
  const owner_id = String(formData.get("owner_id") ?? "").trim() || null;

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
      loan_id,
      owner_id,
    },
  } as const;
}

/** Applies (positive `sign`) or reverses (negative `sign`) an EMI payment's effect on a loan, within a Firestore transaction. */
function applyLoanPayment(
  t: FirestoreTransaction,
  loanRef: DocumentReference,
  loanSnap: DocumentSnapshot,
  amount: number,
  sign: 1 | -1
) {
  if (!loanSnap.exists()) return;
  const loan = loanSnap.data() as Loan;
  const nextOutstanding = Math.max(0, Number(loan.outstanding_amount) - sign * amount);
  const nextEmisPaid = Math.max(0, Number(loan.emis_paid) + sign * 1);
  t.update(loanRef, {
    outstanding_amount: nextOutstanding,
    emis_paid: nextEmisPaid,
    updated_at: new Date().toISOString(),
  });
}

export async function createTransaction(
  type: "expense" | "income",
  formData: FormData
): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;
  const { uid } = auth;

  const parsed = parseTransactionForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const now = new Date().toISOString();
  const data = { user_id: uid, type, ...parsed.data, created_at: now, updated_at: now };

  if (type === "expense" && parsed.data.loan_id) {
    const txRef = doc(collection(db, "users", uid, "transactions"));
    const loanRef = doc(db, "users", uid, "loans", parsed.data.loan_id);
    await runTransaction(db, async (t) => {
      const loanSnap = await t.get(loanRef);
      t.set(txRef, data);
      applyLoanPayment(t, loanRef, loanSnap, parsed.data.amount, 1);
    });
  } else {
    await addDoc(collection(db, "users", uid, "transactions"), data);
  }

  return { ok: true };
}

export async function updateTransaction(formData: FormData): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;
  const { uid } = auth;

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing transaction id." };

  const parsed = parseTransactionForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const ref = doc(db, "users", uid, "transactions", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { error: "Transaction not found." };
  const existing = snap.data() as Transaction;

  const oldLoanId = existing.loan_id;
  const newLoanId = existing.type === "expense" ? parsed.data.loan_id : null;

  if (!oldLoanId && !newLoanId) {
    await updateDoc(ref, { ...parsed.data, updated_at: new Date().toISOString() });
    return { ok: true };
  }

  const sameLoan = Boolean(oldLoanId) && oldLoanId === newLoanId;

  await runTransaction(db, async (t) => {
    const oldLoanRef = oldLoanId ? doc(db, "users", uid, "loans", oldLoanId) : null;
    const newLoanRef = newLoanId ? doc(db, "users", uid, "loans", newLoanId) : null;
    const oldLoanSnap = oldLoanRef ? await t.get(oldLoanRef) : null;
    // When the loan link is unchanged, reuse the one read instead of fetching the same doc twice —
    // calling applyLoanPayment separately for "old" and "new" on the same doc would have the second
    // t.update() clobber the first, since both would compute from the same pre-transaction snapshot.
    const newLoanSnap = sameLoan ? oldLoanSnap : newLoanRef ? await t.get(newLoanRef) : null;

    t.update(ref, { ...parsed.data, updated_at: new Date().toISOString() });

    if (sameLoan && oldLoanRef && oldLoanSnap?.exists()) {
      const loan = oldLoanSnap.data() as Loan;
      const delta = parsed.data.amount - Number(existing.amount); // positive = now paying more against this loan
      const nextOutstanding = Math.max(0, Number(loan.outstanding_amount) - delta);
      t.update(oldLoanRef, { outstanding_amount: nextOutstanding, updated_at: new Date().toISOString() });
    } else {
      if (oldLoanRef && oldLoanSnap) {
        applyLoanPayment(t, oldLoanRef, oldLoanSnap, Number(existing.amount), -1);
      }
      if (newLoanRef && newLoanSnap) {
        applyLoanPayment(t, newLoanRef, newLoanSnap, parsed.data.amount, 1);
      }
    }
  });

  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;
  const { uid } = auth;

  const ref = doc(db, "users", uid, "transactions", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { error: "Transaction not found." };
  const existing = snap.data() as Transaction;

  if (!existing.loan_id) {
    await deleteDoc(ref);
    return { ok: true };
  }

  const loanRef = doc(db, "users", uid, "loans", existing.loan_id);
  await runTransaction(db, async (t) => {
    const loanSnap = await t.get(loanRef);
    t.delete(ref);
    applyLoanPayment(t, loanRef, loanSnap, Number(existing.amount), -1);
  });

  return { ok: true };
}

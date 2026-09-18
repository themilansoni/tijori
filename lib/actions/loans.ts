import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { requireUid } from "@/lib/firebase/require-user";
import type { ActionResult } from "./categories";
import type { Loan } from "@/lib/types";

type ParsedLoan = {
  name: string;
  interest_rate: number | null;
  principal_amount: number | null;
  outstanding_amount: number;
  emi_amount: number;
  tenure_months: number | null;
  emis_paid: number;
  next_due_date: string | null;
  owner_id: string | null;
};

function parseLoanForm(formData: FormData): { error: string } | { data: ParsedLoan } {
  const name = String(formData.get("name") ?? "").trim();
  const interestRateRaw = String(formData.get("interest_rate") ?? "").trim();
  const interest_rate = interestRateRaw ? Number(interestRateRaw) : null;
  const principalRaw = String(formData.get("principal_amount") ?? "").trim();
  const principal_amount = principalRaw ? Number(principalRaw) : null;
  const outstanding_amount = Number(formData.get("outstanding_amount"));
  const emi_amount = Number(formData.get("emi_amount"));
  const tenureRaw = String(formData.get("tenure_months") ?? "").trim();
  const tenure_months = tenureRaw ? Number(tenureRaw) : null;
  const emisPaidRaw = String(formData.get("emis_paid") ?? "").trim();
  const emis_paid = emisPaidRaw ? Number(emisPaidRaw) : 0;
  const next_due_date = String(formData.get("next_due_date") ?? "").trim() || null;
  const owner_id = String(formData.get("owner_id") ?? "").trim() || null;

  if (!name) return { error: "Name is required." } as const;
  if (!Number.isFinite(outstanding_amount) || outstanding_amount < 0) {
    return { error: "Outstanding amount must be 0 or more." } as const;
  }
  if (!Number.isFinite(emi_amount) || emi_amount <= 0) {
    return { error: "EMI amount must be greater than 0." } as const;
  }
  if (interest_rate != null && (!Number.isFinite(interest_rate) || interest_rate < 0)) {
    return { error: "Interest rate must be 0 or more." } as const;
  }
  if (principal_amount != null && (!Number.isFinite(principal_amount) || principal_amount < 0)) {
    return { error: "Principal amount must be 0 or more." } as const;
  }
  if (tenure_months != null && (!Number.isFinite(tenure_months) || tenure_months <= 0)) {
    return { error: "Tenure must be greater than 0 months." } as const;
  }
  if (!Number.isFinite(emis_paid) || emis_paid < 0) {
    return { error: "EMIs paid must be 0 or more." } as const;
  }

  return {
    data: {
      name,
      interest_rate,
      principal_amount,
      outstanding_amount,
      emi_amount,
      tenure_months,
      emis_paid,
      next_due_date,
      owner_id,
    },
  } as const;
}

export type CreateLoanResult = { error: string } | { ok: true; loan: Loan };

export async function createLoan(formData: FormData): Promise<CreateLoanResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  const parsed = parseLoanForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const now = new Date().toISOString();
  const data = {
    user_id: auth.uid,
    ...parsed.data,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
  const docRef = await addDoc(collection(db, "users", auth.uid, "loans"), data);

  return { ok: true, loan: { id: docRef.id, ...data } as Loan };
}

export async function updateLoan(formData: FormData): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing loan id." };

  const parsed = parseLoanForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  await updateDoc(doc(db, "users", auth.uid, "loans", id), {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  });
  return { ok: true };
}

export async function setLoanActive(id: string, isActive: boolean): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  await updateDoc(doc(db, "users", auth.uid, "loans", id), {
    is_active: isActive,
    updated_at: new Date().toISOString(),
  });
  return { ok: true };
}

export async function deleteLoan(id: string): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;
  const { uid } = auth;

  const linkedSnap = await getDocs(
    query(collection(db, "users", uid, "transactions"), where("loan_id", "==", id))
  );

  if (!linkedSnap.empty) {
    await updateDoc(doc(db, "users", uid, "loans", id), {
      is_active: false,
      updated_at: new Date().toISOString(),
    });
    return { ok: true };
  }

  await deleteDoc(doc(db, "users", uid, "loans", id));
  return { ok: true };
}

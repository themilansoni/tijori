import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { requireUid } from "@/lib/firebase/require-user";
import type { ActionResult } from "./categories";
import type { FireProfile } from "@/lib/types";

function fireProfileRef(uid: string) {
  return doc(db, "users", uid, "fireProfile", "default");
}

export async function getFireProfile(): Promise<FireProfile | null> {
  const auth = requireUid();
  if ("error" in auth) return null;

  const snap = await getDoc(fireProfileRef(auth.uid));
  return snap.exists() ? (snap.data() as FireProfile) : null;
}

export async function saveFireProfile(formData: FormData): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  const current_age = Number(formData.get("current_age"));
  const retirement_age = Number(formData.get("retirement_age"));
  const monthly_expenses = Number(formData.get("monthly_expenses"));
  const monthly_investment = Number(formData.get("monthly_investment") ?? 0) || 0;
  const expected_return_percent = Number(formData.get("expected_return_percent"));
  const inflation_percent = Number(formData.get("inflation_percent"));
  const safe_withdrawal_percent = Number(formData.get("safe_withdrawal_percent"));

  if (!Number.isFinite(current_age) || current_age <= 0) return { error: "Enter a valid current age." };
  if (!Number.isFinite(retirement_age) || retirement_age <= current_age) {
    return { error: "Target age must be greater than your current age." };
  }
  if (!Number.isFinite(monthly_expenses) || monthly_expenses < 0) {
    return { error: "Enter your monthly expenses." };
  }
  if (!Number.isFinite(expected_return_percent) || expected_return_percent < 0) {
    return { error: "Enter an expected return rate." };
  }
  if (!Number.isFinite(inflation_percent) || inflation_percent < 0) {
    return { error: "Enter an inflation rate." };
  }
  if (!Number.isFinite(safe_withdrawal_percent) || safe_withdrawal_percent <= 0) {
    return { error: "Enter a safe withdrawal rate." };
  }

  const data: FireProfile = {
    current_age,
    retirement_age,
    monthly_expenses,
    monthly_investment,
    expected_return_percent,
    inflation_percent,
    safe_withdrawal_percent,
    updated_at: new Date().toISOString(),
  };

  await setDoc(fireProfileRef(auth.uid), data);
  return { ok: true };
}

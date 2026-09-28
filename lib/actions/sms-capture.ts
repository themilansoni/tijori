import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { requireUid } from "@/lib/firebase/require-user";
import type { ActionResult } from "./categories";
import type { SmsCaptureConfig } from "@/lib/types";

function smsCaptureRef(uid: string) {
  return doc(db, "users", uid, "smsCapture", "default");
}

export async function getSmsCaptureConfig(): Promise<SmsCaptureConfig | null> {
  const auth = requireUid();
  if ("error" in auth) return null;

  const snap = await getDoc(smsCaptureRef(auth.uid));
  return snap.exists() ? (snap.data() as SmsCaptureConfig) : null;
}

export async function setSmsCaptureConfig(
  patch: Partial<Omit<SmsCaptureConfig, "updated_at">>
): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  const existing = await getDoc(smsCaptureRef(auth.uid));
  const current = existing.exists() ? (existing.data() as SmsCaptureConfig) : null;

  const next: SmsCaptureConfig = {
    enabled: current?.enabled ?? false,
    expense_category_id: current?.expense_category_id ?? null,
    income_category_id: current?.income_category_id ?? null,
    last_processed_date: current?.last_processed_date ?? Date.now(),
    ...patch,
    updated_at: new Date().toISOString(),
  };

  await setDoc(smsCaptureRef(auth.uid), next);
  return { ok: true };
}

/** Called by the capture engine after each successful poll — not exposed in Settings. */
export async function markSmsProcessedUpTo(date: number): Promise<void> {
  const auth = requireUid();
  if ("error" in auth) return;
  await setDoc(smsCaptureRef(auth.uid), { last_processed_date: date, updated_at: new Date().toISOString() }, { merge: true });
}

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { requireUid } from "@/lib/firebase/require-user";
import type { ActionResult } from "./categories";
import type { NotificationCaptureConfig } from "@/lib/types";

function configRef(uid: string) {
  return doc(db, "users", uid, "notificationCapture", "default");
}

export async function getNotificationCaptureConfig(): Promise<NotificationCaptureConfig | null> {
  const auth = requireUid();
  if ("error" in auth) return null;

  const snap = await getDoc(configRef(auth.uid));
  return snap.exists() ? (snap.data() as NotificationCaptureConfig) : null;
}

export async function setNotificationCaptureConfig(
  enabled: boolean,
  expenseCategoryId: string,
  incomeCategoryId: string
): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;
  if (enabled && (!expenseCategoryId || !incomeCategoryId)) {
    return { error: "Pick a default expense and income category first." };
  }

  const existing = await getDoc(configRef(auth.uid));
  const last_processed_at = existing.exists()
    ? (existing.data() as NotificationCaptureConfig).last_processed_at
    : Date.now();

  await setDoc(configRef(auth.uid), {
    enabled,
    expense_category_id: expenseCategoryId,
    income_category_id: incomeCategoryId,
    last_processed_at,
    updated_at: new Date().toISOString(),
  });
  return { ok: true };
}

export async function markNotificationCaptureProcessedUpTo(ts: number): Promise<void> {
  const auth = requireUid();
  if ("error" in auth) return;

  const ref = configRef(auth.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  await setDoc(ref, { ...(snap.data() as NotificationCaptureConfig), last_processed_at: ts, updated_at: new Date().toISOString() });
}

import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { requireUid } from "@/lib/firebase/require-user";
import type { ActionResult } from "./categories";

export type AppLockConfig = { pin_hash: string; pin_length: number; updated_at: string };

function appLockRef(uid: string) {
  return doc(db, "users", uid, "appLock", "default");
}

/** SHA-256 hex digest via the browser's Web Crypto API — no server round-trip needed. */
export async function hashPin(pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getAppLockConfig(): Promise<AppLockConfig | null> {
  const auth = requireUid();
  if ("error" in auth) return null;

  const snap = await getDoc(appLockRef(auth.uid));
  return snap.exists() ? (snap.data() as AppLockConfig) : null;
}

export async function setAppLockPin(pin: string): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;
  if (!/^\d{4,6}$/.test(pin)) return { error: "PIN must be 4 to 6 digits." };

  const pin_hash = await hashPin(pin);
  await setDoc(appLockRef(auth.uid), {
    pin_hash,
    pin_length: pin.length,
    updated_at: new Date().toISOString(),
  });
  return { ok: true };
}

export async function removeAppLockPin(): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  await deleteDoc(appLockRef(auth.uid));
  return { ok: true };
}

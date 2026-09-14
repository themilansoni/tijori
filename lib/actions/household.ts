import { collection, doc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { requireUid } from "@/lib/firebase/require-user";
import type { ActionResult } from "./categories";
import type { HouseholdMember } from "@/lib/types";

export type CreateHouseholdMemberResult = { error: string } | { ok: true; member: HouseholdMember };

export async function createHouseholdMember(formData: FormData): Promise<CreateHouseholdMemberResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  const data = { user_id: auth.uid, name, created_at: new Date().toISOString() };
  const docRef = await addDoc(collection(db, "users", auth.uid, "householdMembers"), data);

  return { ok: true, member: { id: docRef.id, ...data } as HouseholdMember };
}

export async function renameHouseholdMember(formData: FormData): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id) return { error: "Missing member id." };
  if (!name) return { error: "Name is required." };

  await updateDoc(doc(db, "users", auth.uid, "householdMembers", id), { name });
  return { ok: true };
}

export async function deleteHouseholdMember(id: string): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  await deleteDoc(doc(db, "users", auth.uid, "householdMembers", id));
  return { ok: true };
}

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { requireUid } from "@/lib/firebase/require-user";
import type { Category } from "@/lib/types";

export type ActionResult = { error?: string } | { ok: true };
export type CreateCategoryResult = { error: string } | { ok: true; category: Category };

const DUPLICATE_NAME_ERROR = "Category already exists. Please choose another name.";

function categoriesRef(uid: string) {
  return collection(db, "users", uid, "categories");
}

async function isDuplicateName(uid: string, type: string, name: string, excludeId?: string) {
  const snap = await getDocs(query(categoriesRef(uid), where("type", "==", type)));
  const lower = name.trim().toLowerCase();
  return snap.docs.some((d) => d.id !== excludeId && String(d.data().name).toLowerCase() === lower);
}

export async function createCategory(formData: FormData): Promise<CreateCategoryResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;
  const { uid } = auth;

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");

  if (!name) return { error: "Category name is required." };
  if (type !== "expense" && type !== "income") return { error: "Invalid category type." };

  if (await isDuplicateName(uid, type, name)) {
    return { error: DUPLICATE_NAME_ERROR };
  }

  const now = new Date().toISOString();
  const data = {
    user_id: uid,
    name,
    type,
    parent_category_id: null,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
  const docRef = await addDoc(categoriesRef(uid), data);

  return { ok: true, category: { id: docRef.id, ...data } as Category };
}

export async function updateCategory(formData: FormData): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;
  const { uid } = auth;

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!id) return { error: "Missing category id." };
  if (!name) return { error: "Category name is required." };

  const ref = doc(db, "users", uid, "categories", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { error: "Category not found." };

  if (await isDuplicateName(uid, snap.data().type, name, id)) {
    return { error: DUPLICATE_NAME_ERROR };
  }

  await updateDoc(ref, { name, updated_at: new Date().toISOString() });
  return { ok: true };
}

export async function setCategoryActive(id: string, isActive: boolean): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  await updateDoc(doc(db, "users", auth.uid, "categories", id), {
    is_active: isActive,
    updated_at: new Date().toISOString(),
  });
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;
  const { uid } = auth;

  const txSnap = await getDocs(
    query(collection(db, "users", uid, "transactions"), where("category_id", "==", id))
  );

  if (!txSnap.empty) {
    // Historical transactions reference this category — deactivate instead of deleting.
    await updateDoc(doc(db, "users", uid, "categories", id), {
      is_active: false,
      updated_at: new Date().toISOString(),
    });
    return { ok: true };
  }

  await deleteDoc(doc(db, "users", uid, "categories", id));
  return { ok: true };
}

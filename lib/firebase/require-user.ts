import { auth } from "@/lib/firebase/client";

/** Every lib/actions/*.ts function starts with this — mirrors the old `supabase.auth.getUser()` guard. */
export function requireUid(): { uid: string } | { error: string } {
  const uid = auth.currentUser?.uid;
  return uid ? { uid } : { error: "Not authenticated." };
}

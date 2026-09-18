import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { requireUid } from "@/lib/firebase/require-user";

/**
 * Upserts this calendar month's net worth snapshot with the latest figures. Called on every
 * dashboard load — the current month's doc keeps getting overwritten (so it always shows today's
 * numbers), while snapshots from past months are never touched again once the month turns over.
 */
export async function recordNetWorthSnapshot(values: { cash: number; investments: number; loans: number }): Promise<void> {
  const auth = requireUid();
  if ("error" in auth) return;

  const now = new Date();
  const month = now.toISOString().slice(0, 7); // YYYY-MM
  const net_worth = values.cash + values.investments - values.loans;

  await setDoc(doc(db, "users", auth.uid, "netWorthSnapshots", month), {
    user_id: auth.uid,
    month,
    date: now.toISOString().slice(0, 10),
    net_worth,
    cash: values.cash,
    investments: values.investments,
    loans: values.loans,
    created_at: now.toISOString(),
  });
}

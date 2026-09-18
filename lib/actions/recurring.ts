import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { addMonths, format, parseISO, setDate } from "date-fns";
import { db } from "@/lib/firebase/client";
import { requireUid } from "@/lib/firebase/require-user";
import type { ActionResult } from "./categories";
import type { RecurringRule } from "@/lib/types";

const DATE_FMT = "yyyy-MM-dd";

function nextMonthlyDate(fromIso: string, dayOfMonth: number): string {
  return format(setDate(addMonths(parseISO(fromIso), 1), dayOfMonth), DATE_FMT);
}

/** The first occurrence for a brand-new rule: this month's day if it hasn't passed yet, else next month's. */
function initialNextRunDate(dayOfMonth: number): string {
  const today = new Date();
  const thisMonthTarget = setDate(today, dayOfMonth);
  return format(today.getDate() <= dayOfMonth ? thisMonthTarget : addMonths(thisMonthTarget, 1), DATE_FMT);
}

type ParsedRule = {
  type: "expense" | "income";
  category_id: string;
  amount: number;
  description: string | null;
  account_id: string | null;
  owner_id: string | null;
  day_of_month: number;
};

function parseRuleForm(formData: FormData): { error: string } | { data: ParsedRule } {
  const type = String(formData.get("type") ?? "") as "expense" | "income";
  const category_id = String(formData.get("category_id") ?? "");
  const amount = Number(formData.get("amount"));
  const description = String(formData.get("description") ?? "").trim() || null;
  const account_id = String(formData.get("account_id") ?? "").trim() || null;
  const owner_id = String(formData.get("owner_id") ?? "").trim() || null;
  const day_of_month = Number(formData.get("day_of_month"));

  if (type !== "expense" && type !== "income") return { error: "Invalid type." } as const;
  if (!category_id) return { error: "Category is required." } as const;
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Amount must be greater than 0." } as const;
  if (!Number.isFinite(day_of_month) || day_of_month < 1 || day_of_month > 28) {
    return { error: "Day of month must be between 1 and 28." } as const;
  }

  return { data: { type, category_id, amount, description, account_id, owner_id, day_of_month } } as const;
}

export type CreateRecurringRuleResult = { error: string } | { ok: true; rule: RecurringRule };

export async function createRecurringRule(formData: FormData): Promise<CreateRecurringRuleResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  const parsed = parseRuleForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const now = new Date().toISOString();
  const data = {
    user_id: auth.uid,
    ...parsed.data,
    next_run_date: initialNextRunDate(parsed.data.day_of_month),
    last_run_date: null,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
  const docRef = await addDoc(collection(db, "users", auth.uid, "recurringRules"), data);

  return { ok: true, rule: { id: docRef.id, ...data } as RecurringRule };
}

export async function updateRecurringRule(formData: FormData): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing rule id." };

  const parsed = parseRuleForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  // Changing the day just moves the *next* occurrence; it doesn't rewrite history.
  await updateDoc(doc(db, "users", auth.uid, "recurringRules", id), {
    ...parsed.data,
    next_run_date: initialNextRunDate(parsed.data.day_of_month),
    updated_at: new Date().toISOString(),
  });
  return { ok: true };
}

export async function setRecurringRuleActive(id: string, isActive: boolean): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  await updateDoc(doc(db, "users", auth.uid, "recurringRules", id), {
    is_active: isActive,
    updated_at: new Date().toISOString(),
  });
  return { ok: true };
}

export async function deleteRecurringRule(id: string): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  await deleteDoc(doc(db, "users", auth.uid, "recurringRules", id));
  return { ok: true };
}

/**
 * Catches up every active rule whose next occurrence is due, logging a real transaction for each
 * missed month (capped at 24 per rule, so a long-dormant rule can't create a runaway backlog) and
 * advancing next_run_date past today. Safe to call on every page load — a rule that's already
 * caught up is a no-op.
 */
export async function processRecurringRules(): Promise<{ created: number } | { error: string }> {
  const auth = requireUid();
  if ("error" in auth) return auth;
  const { uid } = auth;

  const rulesSnap = await getDocs(
    query(collection(db, "users", uid, "recurringRules"), where("is_active", "==", true))
  );
  const todayIso = format(new Date(), DATE_FMT);
  let created = 0;

  for (const ruleDoc of rulesSnap.docs) {
    const rule = { id: ruleDoc.id, ...ruleDoc.data() } as RecurringRule;
    let nextRun = rule.next_run_date;
    let lastRun = rule.last_run_date;
    let guard = 0;

    while (nextRun <= todayIso && guard < 24) {
      const now = new Date().toISOString();
      await addDoc(collection(db, "users", uid, "transactions"), {
        user_id: uid,
        type: rule.type,
        category_id: rule.category_id,
        amount: rule.amount,
        transaction_date: nextRun,
        description: rule.description,
        payment_method: null,
        note: null,
        account_id: rule.account_id,
        loan_id: null,
        owner_id: rule.owner_id,
        created_at: now,
        updated_at: now,
      });
      created++;
      lastRun = nextRun;
      nextRun = nextMonthlyDate(nextRun, rule.day_of_month);
      guard++;
    }

    if (lastRun !== rule.last_run_date || nextRun !== rule.next_run_date) {
      await updateDoc(doc(db, "users", uid, "recurringRules", rule.id), {
        next_run_date: nextRun,
        last_run_date: lastRun,
        updated_at: new Date().toISOString(),
      });
    }
  }

  return { created };
}

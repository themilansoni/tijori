"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { mapDocs } from "@/lib/firebase/collection-helpers";
import { useAuth } from "@/lib/auth-context";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CategoryForm } from "@/components/forms/category-form";
import { HouseholdMemberForm } from "@/components/forms/household-member-form";
import { RecurringRuleForm } from "@/components/forms/recurring-rule-form";
import { ExportSection } from "@/components/settings/export-section";
import { AppLockSection } from "@/components/settings/app-lock-section";
import { CategoryRow } from "./category-row";
import { deleteHouseholdMember } from "@/lib/actions/household";
import { setRecurringRuleActive, deleteRecurringRule } from "@/lib/actions/recurring";
import { fmtCurrency } from "@/lib/calculations";
import type { Account, Category, HouseholdMember, RecurringRule } from "@/lib/types";

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [rules, setRules] = useState<RecurringRule[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [catSnap, memberSnap, accSnap, ruleSnap] = await Promise.all([
      getDocs(collection(db, "users", user.uid, "categories")),
      getDocs(collection(db, "users", user.uid, "householdMembers")),
      getDocs(collection(db, "users", user.uid, "accounts")),
      getDocs(collection(db, "users", user.uid, "recurringRules")),
    ]);
    setCategories(
      mapDocs<Category>(catSnap).sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
    );
    setMembers(mapDocs<HouseholdMember>(memberSnap).sort((a, b) => a.created_at.localeCompare(b.created_at)));
    setAccounts(mapDocs<Account>(accSnap).sort((a, b) => a.name.localeCompare(b.name)));
    setRules(mapDocs<RecurringRule>(ruleSnap).sort((a, b) => a.next_run_date.localeCompare(b.next_run_date)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading || loading) return null;

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Modal trigger={<Button>+ Add category</Button>} title="Add category">
          <CategoryForm onSuccess={load} />
        </Modal>
      </div>
      <p className="mt-2 text-muted">
        Manage your own categories — nothing here is hardcoded. Deactivating keeps history intact;
        deleting is only allowed when a category has no transactions.
      </p>

      <CategoryGroup title="Expense categories" categories={expenseCategories} onChanged={load} />
      <CategoryGroup title="Income categories" categories={incomeCategories} onChanged={load} />

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Household members</h2>
          <Modal trigger={<button className="text-xs text-accent">+ Add member</button>} title="Add household member">
            <HouseholdMemberForm onSuccess={load} />
          </Modal>
        </div>
        <p className="mt-1.5 text-[13px] text-muted">
          Tag investments with who they belong to — see individual and combined net worth on the
          Investments page.
        </p>

        {members.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
            No household members yet.
          </div>
        ) : (
          <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3">
                <span>{m.name}</span>
                <div className="flex items-center gap-3 text-xs">
                  <Modal
                    trigger={<button className="text-muted hover:text-foreground">Edit</button>}
                    title="Edit household member"
                  >
                    <HouseholdMemberForm member={m} onSuccess={load} />
                  </Modal>
                  <ConfirmButton
                    className="text-danger hover:brightness-110"
                    confirmMessage={`Remove "${m.name}"? Investments already tagged with them stay as-is, just unlabeled.`}
                    action={async () => {
                      const result = await deleteHouseholdMember(m.id);
                      load();
                      return result;
                    }}
                  >
                    Delete
                  </ConfirmButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Recurring transactions</h2>
          <Modal trigger={<button className="text-xs text-accent">+ Add recurring</button>} title="Add recurring transaction">
            <RecurringRuleForm
              expenseCategories={expenseCategories.filter((c) => c.is_active)}
              incomeCategories={incomeCategories.filter((c) => c.is_active)}
              accounts={accounts}
              members={members}
              onSuccess={load}
            />
          </Modal>
        </div>
        <p className="mt-1.5 text-[13px] text-muted">
          Rent, subscriptions, salary — anything that repeats monthly. Logs itself automatically
          next time you open the app on or after its day of the month.
        </p>

        {rules.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
            No recurring transactions yet.
          </div>
        ) : (
          <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface">
            {rules.map((r) => {
              const category = categories.find((c) => c.id === r.category_id);
              return (
                <div key={r.id} className={`flex items-center justify-between px-4 py-3 ${r.is_active ? "" : "opacity-50"}`}>
                  <div>
                    <div className="font-medium">
                      {r.description || category?.name || (r.type === "income" ? "Income" : "Expense")}
                    </div>
                    <div className="text-[11px] text-muted">
                      {category?.name ?? "—"} · Day {r.day_of_month} of month
                      {!r.is_active && " · inactive"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-semibold ${r.type === "income" ? "text-success" : ""}`}>
                      {r.type === "income" ? "+" : "−"}
                      {fmtCurrency(r.amount)}
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      <Modal
                        trigger={<button className="text-muted hover:text-foreground">Edit</button>}
                        title="Edit recurring transaction"
                      >
                        <RecurringRuleForm
                          rule={r}
                          expenseCategories={expenseCategories.filter((c) => c.is_active)}
                          incomeCategories={incomeCategories.filter((c) => c.is_active)}
                          accounts={accounts}
                          members={members}
                          onSuccess={load}
                        />
                      </Modal>
                      {r.is_active ? (
                        <ConfirmButton
                          className="text-muted hover:text-foreground"
                          confirmMessage={`Pause "${r.description || category?.name}"?`}
                          action={async () => {
                            const result = await setRecurringRuleActive(r.id, false);
                            load();
                            return result;
                          }}
                        >
                          Pause
                        </ConfirmButton>
                      ) : (
                        <ConfirmButton
                          className="text-accent hover:brightness-110"
                          confirmMessage={`Resume "${r.description || category?.name}"?`}
                          action={async () => {
                            const result = await setRecurringRuleActive(r.id, true);
                            load();
                            return result;
                          }}
                        >
                          Resume
                        </ConfirmButton>
                      )}
                      <ConfirmButton
                        className="text-danger hover:brightness-110"
                        confirmMessage={`Delete "${r.description || category?.name}"? Transactions it already logged stay as-is.`}
                        action={async () => {
                          const result = await deleteRecurringRule(r.id);
                          load();
                          return result;
                        }}
                      >
                        Delete
                      </ConfirmButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <AppLockSection />
      <ExportSection />
    </div>
  );
}

function CategoryGroup({
  title,
  categories,
  onChanged,
}: {
  title: string;
  categories: Category[];
  onChanged: () => void;
}) {
  const active = categories.filter((c) => c.is_active);
  const inactive = categories.filter((c) => !c.is_active);

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-muted">{title}</h2>

      {categories.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          No categories yet.
        </div>
      ) : (
        <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface">
          {active.map((c) => (
            <CategoryRow key={c.id} category={c} onChanged={onChanged} />
          ))}
          {inactive.length > 0 && (
            <>
              <div className="px-4 py-2 text-[11.5px] font-medium uppercase tracking-wide text-muted">
                Inactive
              </div>
              {inactive.map((c) => (
                <CategoryRow key={c.id} category={c} onChanged={onChanged} />
              ))}
            </>
          )}
        </div>
      )}
    </section>
  );
}

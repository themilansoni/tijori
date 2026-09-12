"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { mapDocs } from "@/lib/firebase/collection-helpers";
import { useAuth } from "@/lib/auth-context";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { BudgetForm } from "@/components/forms/budget-form";
import { BudgetRow } from "./budget-row";
import { budgetStatus, fmtCurrency } from "@/lib/calculations";
import type { Budget, Category, Transaction } from "@/lib/types";

export default function BudgetsPage() {
  const { user, loading: authLoading } = useAuth();
  const today = new Date();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const uid = user.uid;
    const [catSnap, budgetSnap, txSnap] = await Promise.all([
      getDocs(query(collection(db, "users", uid, "categories"), where("type", "==", "expense"))),
      getDocs(collection(db, "users", uid, "budgets")),
      getDocs(query(collection(db, "users", uid, "transactions"), where("type", "==", "expense"))),
    ]);

    const cats = mapDocs<Category>(catSnap).sort((a, b) => a.name.localeCompare(b.name));
    const catById = new Map(cats.map((c) => [c.id, c]));

    setCategories(cats);
    setBudgets(mapDocs<Budget>(budgetSnap).filter((b) => catById.has(b.category_id)));
    setTransactions(mapDocs<Transaction>(txSnap));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading || loading) return null;

  const activeCategories = categories.filter((c) => c.is_active);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const statuses = budgets.map((b) => budgetStatus(b, categoryById.get(b.category_id)!, transactions, today));

  const active = statuses.filter((s) => s.budget.is_active);
  const inactive = statuses.filter((s) => !s.budget.is_active);

  const totalBudget = active.reduce((s, x) => s + Number(x.budget.amount), 0);
  const totalSpent = active.reduce((s, x) => s + x.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overCount = active.filter((s) => s.isOverBudget).length;

  const categoriesWithBudget = new Set(budgets.map((b) => b.category_id));
  const categoriesAvailableForNewBudget = activeCategories.filter(
    (c) => !categoriesWithBudget.has(c.id)
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Budgets</h1>
        <Modal trigger={<Button>+ Create budget</Button>} title="Create budget">
          <BudgetForm categories={categoriesAvailableForNewBudget} onSuccess={load} />
        </Modal>
      </div>
      <p className="mt-2 text-muted">
        Each budget tracks spending over its own period (daily/weekly/monthly/yearly), evaluated
        live from your transactions.
      </p>

      {active.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface px-4 py-3.5">
            <div className="text-[11.5px] font-medium uppercase tracking-wide text-muted">Total Budgeted</div>
            <div className="mt-1.5 text-xl font-bold">{fmtCurrency(totalBudget)}</div>
          </div>
          <div className="rounded-xl border border-border bg-surface px-4 py-3.5">
            <div className="text-[11.5px] font-medium uppercase tracking-wide text-muted">Total Spent</div>
            <div className="mt-1.5 text-xl font-bold">{fmtCurrency(totalSpent)}</div>
          </div>
          <div className="rounded-xl border border-border bg-surface px-4 py-3.5">
            <div className="text-[11.5px] font-medium uppercase tracking-wide text-muted">Remaining</div>
            <div className={`mt-1.5 text-xl font-bold ${totalRemaining < 0 ? "text-danger" : ""}`}>
              {fmtCurrency(totalRemaining)}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface px-4 py-3.5">
            <div className="text-[11.5px] font-medium uppercase tracking-wide text-muted">Over Budget</div>
            <div className={`mt-1.5 text-xl font-bold ${overCount > 0 ? "text-danger" : ""}`}>
              {overCount} {overCount === 1 ? "category" : "categories"}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        {statuses.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-border p-12 text-center">
            <p className="mt-4 font-medium text-foreground">No budgets configured</p>
            <p className="mt-1 text-[13.5px] text-muted">
              Create a budget to start tracking your spending limits.
            </p>
            <div className="mt-4">
              <Modal trigger={<Button>+ Create budget</Button>} title="Create budget">
                <BudgetForm categories={categoriesAvailableForNewBudget} onSuccess={load} />
              </Modal>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {active.map((s) => (
              <BudgetRow key={s.budget.id} status={s} categories={activeCategories} onChanged={load} />
            ))}
            {inactive.map((s) => (
              <BudgetRow key={s.budget.id} status={s} categories={activeCategories} onChanged={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

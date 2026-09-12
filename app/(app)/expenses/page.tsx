"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { mapDocs } from "@/lib/firebase/collection-helpers";
import { useAuth } from "@/lib/auth-context";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { PeriodSelector, CustomRangePicker } from "@/components/ui/period-selector";
import { SpendBarChart } from "@/components/charts/spend-bar-chart";
import { ExpenseForm } from "@/components/forms/expense-form";
import { FiltersBar, type SortKey } from "./filters-bar";
import { ExpenseList } from "./expense-list";
import {
  getPeriodRange,
  sumAmount,
  dailyAverage,
  categorySpending,
  spendingByDay,
  spendingByMonth,
  fmtCurrency,
} from "@/lib/calculations";
import type { Account, Category, PeriodKey, Transaction } from "@/lib/types";

export default function ExpensesPage() {
  return (
    <Suspense fallback={null}>
      <ExpensesContent />
    </Suspense>
  );
}

function ExpensesContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const period = (searchParams.get("period") as PeriodKey) || "month";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const categoryFilter = searchParams.get("category") ?? undefined;
  const sort = (searchParams.get("sort") as SortKey) || "newest";
  const q = searchParams.get("q")?.trim().toLowerCase();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allExpenseTransactions, setAllExpenseTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const uid = user.uid;
    const [catSnap, txSnap, accSnap] = await Promise.all([
      getDocs(query(collection(db, "users", uid, "categories"), where("type", "==", "expense"))),
      getDocs(query(collection(db, "users", uid, "transactions"), where("type", "==", "expense"))),
      getDocs(query(collection(db, "users", uid, "accounts"), where("is_active", "==", true))),
    ]);
    setCategories(mapDocs<Category>(catSnap).sort((a, b) => a.name.localeCompare(b.name)));
    setAllExpenseTransactions(mapDocs<Transaction>(txSnap));
    setAccounts(mapDocs<Account>(accSnap).sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading || loading) return null;

  const today = new Date();
  const { start, end } =
    period === "custom" && from && to
      ? getPeriodRange("custom", today, { from, to })
      : getPeriodRange(period === "custom" ? "month" : period, today);

  const activeCategories = categories.filter((c) => c.is_active);
  const periodTransactions = allExpenseTransactions.filter(
    (t) => t.transaction_date >= start && t.transaction_date <= end
  );

  const totalExpenses = sumAmount(periodTransactions);
  const avgDaily = dailyAverage(periodTransactions, start, end);
  const catBreakdown = categorySpending(periodTransactions, categories);

  const chart =
    period === "year"
      ? spendingByMonth(periodTransactions, start, end).map((m) => ({ label: m.label, amount: m.amount }))
      : period === "today"
      ? []
      : spendingByDay(periodTransactions, start, end).map((d) => ({ label: d.label, amount: d.amount }));

  let visible = periodTransactions;
  if (categoryFilter) visible = visible.filter((t) => t.category_id === categoryFilter);
  if (q) {
    visible = visible.filter(
      (t) => t.description?.toLowerCase().includes(q) || t.note?.toLowerCase().includes(q)
    );
  }
  visible = [...visible].sort((a, b) => {
    switch (sort) {
      case "oldest":
        return a.transaction_date.localeCompare(b.transaction_date) || a.created_at.localeCompare(b.created_at);
      case "highest":
        return Number(b.amount) - Number(a.amount);
      case "lowest":
        return Number(a.amount) - Number(b.amount);
      case "newest":
      default:
        return b.transaction_date.localeCompare(a.transaction_date) || b.created_at.localeCompare(a.created_at);
    }
  });

  const periodLabel =
    period === "today"
      ? "Today"
      : period === "week"
      ? "This Week"
      : period === "year"
      ? "This Year"
      : period === "custom"
      ? `${start} → ${end}`
      : "This Month";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <Modal trigger={<Button>+ Add Expense</Button>} title="Add expense">
          <ExpenseForm categories={activeCategories} accounts={accounts} keepOpenOnAdd onSuccess={load} />
        </Modal>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <PeriodSelector current={period} />
        {period === "custom" && <CustomRangePicker from={from} to={to} />}
      </div>

      {activeCategories.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted">
          No expense categories yet —{" "}
          <a href="/settings" className="text-accent">
            create one in Settings
          </a>{" "}
          before adding an expense.
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={`Total (${periodLabel})`} value={fmtCurrency(totalExpenses)} />
        <StatCard label="Daily Average" value={fmtCurrency(avgDaily)} />
        <StatCard label="Transactions" value={String(periodTransactions.length)} />
        <StatCard
          label="Top Category"
          value={catBreakdown[0]?.category.name ?? "—"}
          sub={catBreakdown[0] ? fmtCurrency(catBreakdown[0].amount) : undefined}
        />
      </div>

      {chart.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-4">
          <div className="mb-2 text-sm font-semibold text-muted">Spending trend</div>
          <SpendBarChart data={chart} />
        </div>
      )}

      {catBreakdown.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 text-sm font-semibold text-muted">Category breakdown — {periodLabel}</div>
          <div className="space-y-2.5">
            {catBreakdown.map((c) => (
              <div key={c.category.id}>
                <div className="flex items-center justify-between text-sm">
                  <span>{c.category.name}</span>
                  <span className="text-muted">
                    {fmtCurrency(c.amount)} · {c.percent.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-foreground/8">
                  <div
                    className="h-full rounded-full bg-muted/40"
                    style={{ width: `${Math.min(c.percent, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Transactions</h2>
        <FiltersBar
          categories={categories}
          currentCategory={categoryFilter}
          currentSort={sort}
          currentSearch={searchParams.get("q") ?? undefined}
        />
      </div>

      <div className="mt-3">
        {periodTransactions.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-border p-12 text-center">
            <p className="mt-4 font-medium text-foreground">No expenses yet</p>
            <p className="mt-1 text-[13.5px] text-muted">
              Start tracking your spending for {periodLabel.toLowerCase()}.
            </p>
            <div className="mt-4">
              <Modal trigger={<Button>+ Add Expense</Button>} title="Add expense">
                <ExpenseForm categories={activeCategories} accounts={accounts} keepOpenOnAdd onSuccess={load} />
              </Modal>
            </div>
          </div>
        ) : (
          <ExpenseList transactions={visible} categories={categories} accounts={accounts} onChanged={load} />
        )}
      </div>
    </div>
  );
}

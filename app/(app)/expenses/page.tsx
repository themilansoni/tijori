import { createClient } from "@/lib/supabase/server";
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
import type { Category, PeriodKey, Transaction } from "@/lib/types";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const period = (sp.period as PeriodKey) || "month";
  const today = new Date();

  const { start, end } =
    period === "custom" && sp.from && sp.to
      ? getPeriodRange("custom", today, { from: sp.from, to: sp.to })
      : getPeriodRange(period === "custom" ? "month" : period, today);

  const supabase = await createClient();

  const [{ data: categoriesRaw }, { data: periodTxRaw }] = await Promise.all([
    supabase.from("categories").select("*").eq("type", "expense").order("name"),
    supabase
      .from("transactions")
      .select("*")
      .eq("type", "expense")
      .gte("transaction_date", start)
      .lte("transaction_date", end),
  ]);

  const categories = (categoriesRaw ?? []) as Category[];
  const activeCategories = categories.filter((c) => c.is_active);
  const periodTransactions = (periodTxRaw ?? []) as Transaction[];

  // ---- Summary stats ----
  const totalExpenses = sumAmount(periodTransactions);
  const avgDaily = dailyAverage(periodTransactions, start, end);
  const catBreakdown = categorySpending(periodTransactions, categories);

  // ---- Chart data ----
  const chart =
    period === "year"
      ? spendingByMonth(periodTransactions, start, end).map((m) => ({ label: m.label, amount: m.amount }))
      : period === "today"
      ? []
      : spendingByDay(periodTransactions, start, end).map((d) => ({ label: d.label, amount: d.amount }));

  // ---- Filters/sort/search (applied to the period's transactions for the list) ----
  const categoryFilter = sp.category;
  const sort = (sp.sort as SortKey) || "newest";
  const q = sp.q?.trim().toLowerCase();

  let visible = periodTransactions;
  if (categoryFilter) visible = visible.filter((t) => t.category_id === categoryFilter);
  if (q) {
    visible = visible.filter(
      (t) =>
        t.description?.toLowerCase().includes(q) || t.note?.toLowerCase().includes(q)
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
          <ExpenseForm categories={activeCategories} keepOpenOnAdd />
        </Modal>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <PeriodSelector current={period} />
        {period === "custom" && <CustomRangePicker from={sp.from} to={sp.to} />}
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
                <div className="mt-1 h-1.5 rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-accent"
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
          currentSearch={sp.q}
        />
      </div>

      <div className="mt-3">
        {periodTransactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-muted">No expenses yet for {periodLabel.toLowerCase()}.</p>
            <div className="mt-3">
              <Modal trigger={<Button>+ Add Expense</Button>} title="Add expense">
                <ExpenseForm categories={activeCategories} keepOpenOnAdd />
              </Modal>
            </div>
          </div>
        ) : (
          <ExpenseList transactions={visible} categories={categories} />
        )}
      </div>
    </div>
  );
}

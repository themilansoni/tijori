import Link from "next/link";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/authorize";
import { PeriodSelector, CustomRangePicker } from "@/components/ui/period-selector";
import { IncomeExpenseChart } from "@/components/charts/income-expense-chart";
import {
  getPeriodRange,
  sumAmount,
  categorySpending,
  amountByAccount,
  accountBalance,
  budgetStatus,
  incomeExpenseByDay,
  incomeExpenseByMonth,
  fmtCurrency,
} from "@/lib/calculations";
import { ACCOUNT_TYPES, type Account, type Budget, type Category, type PeriodKey, type Transaction } from "@/lib/types";

export default async function DashboardPage({
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

  const [allowed, { data: txRaw }, { data: categoriesRaw }, { data: accountsRaw }, { data: budgetsRaw }] =
    await Promise.all([
      can("dashboard", "view", supabase),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*"),
      supabase.from("accounts").select("*").order("name"),
      supabase.from("budgets").select("*, categories!inner(type)").eq("categories.type", "expense"),
    ]);

  if (!allowed) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted">
        You don&apos;t have permission to view the dashboard.
      </div>
    );
  }

  const allTransactions = (txRaw ?? []) as Transaction[];
  const categories = (categoriesRaw ?? []) as Category[];
  const accounts = (accountsRaw ?? []) as Account[];
  const budgets = (budgetsRaw ?? []) as Budget[];

  const periodTransactions = allTransactions.filter(
    (t) => t.transaction_date >= start && t.transaction_date <= end
  );
  const periodIncome = periodTransactions.filter((t) => t.type === "income");
  const periodExpense = periodTransactions.filter((t) => t.type === "expense");

  const totalIncome = sumAmount(periodIncome);
  const totalExpense = sumAmount(periodExpense);
  const netCashFlow = totalIncome - totalExpense;

  const activeAccounts = accounts.filter((a) => a.is_active);
  const totalBalance = activeAccounts.reduce((sum, a) => sum + accountBalance(a, allTransactions), 0);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const activeBudgets = budgets.filter((b) => b.is_active && categoryById.has(b.category_id));
  const budgetStatuses = activeBudgets.map((b) =>
    budgetStatus(b, categoryById.get(b.category_id)!, allTransactions, today)
  );
  const totalBudget = budgetStatuses.reduce((sum, s) => sum + Number(s.budget.amount), 0);
  const totalBudgetSpent = budgetStatuses.reduce((sum, s) => sum + s.spent, 0);
  const budgetRemaining = totalBudget - totalBudgetSpent;

  const expenseCatBreakdown = categorySpending(periodExpense, categories);
  const incomeCatBreakdown = categorySpending(periodIncome, categories);
  const incomeAccountBreakdown = amountByAccount(periodIncome, accounts);

  const chart =
    period === "year"
      ? incomeExpenseByMonth(periodTransactions, start, end)
      : period === "today"
      ? []
      : incomeExpenseByDay(periodTransactions, start, end);

  const recentTransactions = allTransactions.slice(0, 8);

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

  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[13.5px] text-muted">{greeting}</div>
          <h1 className="mt-0.5 text-[26px] font-semibold tracking-tight">Your financial overview</h1>
        </div>
        <PeriodSelector current={period} />
      </div>
      {period === "custom" && (
        <div className="mt-3">
          <CustomRangePicker from={sp.from} to={sp.to} />
        </div>
      )}

      {/* ---- Hero balance ---- */}
      <div className="mt-6 rounded-[var(--radius-lg)] border border-border bg-surface px-6 py-6 shadow-[var(--shadow-sm)] sm:px-8 sm:py-7">
        <div className="text-[12px] font-medium uppercase tracking-[0.5px] text-muted">Current Balance</div>
        <div className={`mt-1.5 text-[36px] font-semibold tracking-tight sm:text-[42px] ${totalBalance < 0 ? "text-danger" : ""}`}>
          {fmtCurrency(totalBalance)}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-5">
          <div>
            <div className="text-[11.5px] font-medium uppercase tracking-[0.4px] text-muted">Income</div>
            <div className="mt-1 text-lg font-semibold text-success sm:text-xl">{fmtCurrency(totalIncome)}</div>
          </div>
          <div>
            <div className="text-[11.5px] font-medium uppercase tracking-[0.4px] text-muted">Expenses</div>
            <div className="mt-1 text-lg font-semibold sm:text-xl">{fmtCurrency(totalExpense)}</div>
          </div>
          <div>
            <div className="text-[11.5px] font-medium uppercase tracking-[0.4px] text-muted">Net Cash Flow</div>
            <div className={`mt-1 text-lg font-semibold sm:text-xl ${netCashFlow < 0 ? "text-danger" : "text-success"}`}>
              {fmtCurrency(netCashFlow)}
            </div>
          </div>
        </div>
      </div>

      {/* ---- Accounts ---- */}
      <section className="mt-6 rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Accounts</h2>
          <Link href="/accounts" className="text-xs text-accent">
            Manage →
          </Link>
        </div>
        {activeAccounts.length === 0 ? (
          <p className="text-sm text-muted">
            No accounts yet.{" "}
            <Link href="/accounts" className="text-accent">
              Add one
            </Link>{" "}
            to see your money by account.
          </p>
        ) : (
          <div className="space-y-2">
            {activeAccounts.map((a) => {
              const bal = accountBalance(a, allTransactions);
              const typeLabel = ACCOUNT_TYPES.find((t) => t.value === a.type)?.label ?? a.type;
              return (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span>
                    {a.name} <span className="text-muted">· {typeLabel}</span>
                  </span>
                  <span className={`font-semibold ${bal < 0 ? "text-danger" : ""}`}>{fmtCurrency(bal)}</span>
                </div>
              );
            })}
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
              <span>Net Balance</span>
              <span className={totalBalance < 0 ? "text-danger" : "text-success"}>{fmtCurrency(totalBalance)}</span>
            </div>
          </div>
        )}
      </section>

      {/* ---- Expense + Income overview ---- */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted">Expense Overview — {periodLabel}</h2>
            <Link href="/expenses" className="text-xs text-accent">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold">{fmtCurrency(totalExpense)}</div>
              <div className="text-[11px] text-muted">Spent</div>
            </div>
            <div>
              <div className="text-lg font-bold">{fmtCurrency(totalBudget)}</div>
              <div className="text-[11px] text-muted">Budget</div>
            </div>
            <div>
              <div className={`text-lg font-bold ${budgetRemaining < 0 ? "text-danger" : ""}`}>
                {fmtCurrency(budgetRemaining)}
              </div>
              <div className="text-[11px] text-muted">Remaining</div>
            </div>
          </div>
          {expenseCatBreakdown.length > 0 && (
            <div className="mt-4 space-y-2">
              {expenseCatBreakdown.slice(0, 5).map((c) => (
                <div key={c.category.id}>
                  <div className="flex items-center justify-between text-xs">
                    <span>{c.category.name}</span>
                    <span className="text-muted">
                      {fmtCurrency(c.amount)} · {c.percent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-foreground/8">
                    <div className="h-full rounded-full bg-foreground/60" style={{ width: `${Math.min(c.percent, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted">Income Overview — {periodLabel}</h2>
            <Link href="/income" className="text-xs text-accent">
              View all →
            </Link>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-success">{fmtCurrency(totalIncome)}</div>
            <div className="text-[11px] text-muted">Total income</div>
          </div>
          {incomeCatBreakdown.length > 0 && (
            <div className="mt-4 space-y-2">
              {incomeCatBreakdown.slice(0, 4).map((c) => (
                <div key={c.category.id} className="flex items-center justify-between text-xs">
                  <span>{c.category.name}</span>
                  <span className="font-semibold text-success">{fmtCurrency(c.amount)}</span>
                </div>
              ))}
            </div>
          )}
          {incomeAccountBreakdown.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">By account</div>
              <div className="space-y-1.5">
                {incomeAccountBreakdown.map((a) => (
                  <div key={a.account.id} className="flex items-center justify-between text-xs">
                    <span>{a.account.name}</span>
                    <span className="text-muted">{fmtCurrency(a.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ---- Budget health ---- */}
      {budgetStatuses.length > 0 && (
        <section className="mt-6 rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted">Budget Health</h2>
            <Link href="/budgets" className="text-xs text-accent">
              Manage →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {budgetStatuses.map((s) => (
              <div key={s.budget.id}>
                <div className="flex items-center justify-between text-sm">
                  <span>{s.category.name}</span>
                  <span className={s.isOverBudget ? "font-semibold text-danger" : "text-muted"}>
                    {fmtCurrency(s.spent)} / {fmtCurrency(s.budget.amount)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-foreground/8">
                  <div
                    className={`h-full rounded-full ${s.isOverBudget ? "bg-danger" : "bg-success"}`}
                    style={{ width: `${Math.min(s.usedPercent, 100)}%` }}
                  />
                </div>
                <div className={`mt-0.5 text-[11px] ${s.isOverBudget ? "text-danger" : "text-muted"}`}>
                  {s.isOverBudget ? "OVER BUDGET" : `${s.usedPercent.toFixed(0)}% used`}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---- Trend ---- */}
      {chart.length > 0 && (
        <section className="mt-6 rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold text-muted">Income vs Expense — {periodLabel}</h2>
          <IncomeExpenseChart data={chart} />
        </section>
      )}

      {/* ---- Recent transactions ---- */}
      <section className="mt-6 rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Recent Transactions</h2>
          <Link href="/expenses" className="text-xs text-accent">
            View all →
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <p className="text-sm text-muted">No transactions yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <div className="font-medium">{categoryById.get(t.category_id)?.name ?? "—"}</div>
                  <div className="text-[11px] text-muted">
                    {format(parseISO(t.transaction_date), "dd MMM yyyy")}
                    {t.account_id ? ` · ${accounts.find((a) => a.id === t.account_id)?.name ?? ""}` : ""}
                  </div>
                </div>
                <span className={`font-semibold ${t.type === "income" ? "text-success" : "text-foreground"}`}>
                  {t.type === "income" ? "+" : "−"}
                  {fmtCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

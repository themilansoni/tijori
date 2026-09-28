"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { mapDocs } from "@/lib/firebase/collection-helpers";
import { useAuth } from "@/lib/auth-context";
import { getFireProfile } from "@/lib/actions/fire";
import { PeriodSelector, CustomRangePicker } from "@/components/ui/period-selector";
import { StatCard } from "@/components/ui/stat-card";
import {
  getPeriodRange,
  sumAmount,
  categorySpending,
  budgetStatus,
  calculateTotalPortfolioValue,
  calculateLoanTotals,
  accountBalance,
  isCashAccount,
  projectFire,
  requiredMonthlyInvestment,
  fmtCurrency,
  type CategorySpend,
} from "@/lib/calculations";
import type {
  Account,
  Budget,
  Category,
  FireProfile,
  InvestmentHolding,
  Loan,
  PeriodKey,
  Transaction,
} from "@/lib/types";

export default function ReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsContent />
    </Suspense>
  );
}

function ReportsContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const period = (searchParams.get("period") as PeriodKey) || "month";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [profile, setProfile] = useState<FireProfile | null>(null);
  const [holdings, setHoldings] = useState<InvestmentHolding[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const uid = user.uid;
    const [catSnap, txSnap, budgetSnap, fireProfile, holdingSnap, accSnap, loanSnap] = await Promise.all([
      getDocs(collection(db, "users", uid, "categories")),
      getDocs(collection(db, "users", uid, "transactions")),
      getDocs(collection(db, "users", uid, "budgets")),
      getFireProfile(),
      getDocs(collection(db, "users", uid, "investmentHoldings")),
      getDocs(collection(db, "users", uid, "accounts")),
      getDocs(collection(db, "users", uid, "loans")),
    ]);
    setCategories(mapDocs<Category>(catSnap));
    setTransactions(mapDocs<Transaction>(txSnap));
    setBudgets(mapDocs<Budget>(budgetSnap));
    setProfile(fireProfile);
    setHoldings(mapDocs<InvestmentHolding>(holdingSnap).filter((h) => h.is_active));
    setAccounts(mapDocs<Account>(accSnap).filter((a) => a.is_active));
    setLoans(mapDocs<Loan>(loanSnap));
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

  const periodTransactions = transactions.filter((t) => t.transaction_date >= start && t.transaction_date <= end);
  const periodIncome = periodTransactions.filter((t) => t.type === "income");
  const periodExpense = periodTransactions.filter((t) => t.type === "expense");

  const totalIncome = sumAmount(periodIncome);
  const totalExpense = sumAmount(periodExpense);
  const netSavings = totalIncome - totalExpense;
  const savingsRatePercent = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  const periodDays = differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;
  const periodMonths = Math.max(periodDays / 30.44, 1 / 30.44);
  const monthlyIncome = totalIncome / periodMonths;
  const monthlyExpense = totalExpense / periodMonths;
  const monthlySavings = monthlyIncome - monthlyExpense;

  const incomeBreakdown = categorySpending(periodIncome, categories).slice(0, 5);
  const expenseBreakdown = categorySpending(periodExpense, categories).slice(0, 5);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const activeBudgets = budgets.filter((b) => b.is_active && categoryById.has(b.category_id));
  const budgetStatuses = activeBudgets.map((b) => budgetStatus(b, categoryById.get(b.category_id)!, transactions, today));
  const totalBudgeted = budgetStatuses.reduce((s, x) => s + Number(x.budget.amount), 0);
  const totalBudgetSpent = budgetStatuses.reduce((s, x) => s + x.spent, 0);
  const overBudget = budgetStatuses.filter((s) => s.isOverBudget);

  const investmentsCorpus = calculateTotalPortfolioValue(holdings).currentValue;
  const cashBalance = accounts.filter(isCashAccount).reduce((sum, a) => sum + accountBalance(a, transactions), 0);
  const loanOutstanding = calculateLoanTotals(loans).totalOutstanding;
  const currentCorpus = investmentsCorpus + cashBalance - loanOutstanding;

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
        <h1 className="text-2xl font-bold">Reports</h1>
      </div>
      <p className="mt-2 text-muted">
        Income, spending, and budget health for {periodLabel.toLowerCase()} — plus what it means for
        reaching FIRE on schedule.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <PeriodSelector current={period} />
        {period === "custom" && <CustomRangePicker from={from} to={to} />}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Income" value={fmtCurrency(totalIncome)} tone="success" />
        <StatCard label="Expenses" value={fmtCurrency(totalExpense)} />
        <StatCard label="Net Savings" value={fmtCurrency(netSavings)} tone={netSavings < 0 ? "danger" : "accent"} />
        <StatCard
          label="Savings Rate"
          value={`${savingsRatePercent.toFixed(1)}%`}
          tone={savingsRatePercent < 0 ? "danger" : savingsRatePercent >= 20 ? "success" : "default"}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <CategoryList title="Top income sources" rows={incomeBreakdown} emptyText="No income logged yet." />
        <CategoryList title="Top expense categories" rows={expenseBreakdown} emptyText="No expenses logged yet." />
      </div>

      {activeBudgets.length > 0 && (
        <section className="mt-6 rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted">Budget health</h2>
            <Link href="/budgets" className="text-xs text-accent">
              Manage →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold">{fmtCurrency(totalBudgeted)}</div>
              <div className="text-[11px] text-muted">Budgeted</div>
            </div>
            <div>
              <div className="text-lg font-bold">{fmtCurrency(totalBudgetSpent)}</div>
              <div className="text-[11px] text-muted">Spent</div>
            </div>
            <div>
              <div className={`text-lg font-bold ${overBudget.length > 0 ? "text-danger" : ""}`}>{overBudget.length}</div>
              <div className="text-[11px] text-muted">Over budget</div>
            </div>
          </div>
          {overBudget.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
              {overBudget.map((s) => (
                <span key={s.budget.id} className="rounded-full bg-danger/10 px-2.5 py-1 text-[11px] font-medium text-danger">
                  {s.category.name} · {fmtCurrency(s.overBy)} over
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="mt-6">
        {profile ? (
          <FireInsights
            profile={profile}
            currentCorpus={currentCorpus}
            monthlySavings={monthlySavings}
            expenseBreakdown={expenseBreakdown}
            periodMonths={periodMonths}
            overBudget={overBudget}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="font-medium text-foreground">Set up your FIRE plan to see suggestions here</p>
            <p className="mt-1 text-[13.5px] text-muted">
              Once you've got a plan, this page tells you exactly what to change to stay on track.
            </p>
            <Link href="/fire" className="mt-3 inline-block text-[13px] font-medium text-accent">
              Set up FIRE plan →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryList({
  title,
  rows,
  emptyText,
}: {
  title: string;
  rows: CategorySpend[];
  emptyText: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 text-sm font-semibold text-muted">{title}</div>
      {rows.length === 0 ? (
        <p className="text-[13px] text-muted">{emptyText}</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.category.id}>
              <div className="flex items-center justify-between text-sm">
                <span>{r.category.name}</span>
                <span className="text-muted">
                  {fmtCurrency(r.amount)} · {r.percent.toFixed(0)}%
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-foreground/8">
                <div className="h-full rounded-full bg-muted/40" style={{ width: `${Math.min(r.percent, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type Suggestion = { title: string; description: string; tone: "success" | "warning" | "danger" };

function FireInsights({
  profile,
  currentCorpus,
  monthlySavings,
  expenseBreakdown,
  periodMonths,
  overBudget,
}: {
  profile: FireProfile;
  currentCorpus: number;
  monthlySavings: number;
  expenseBreakdown: CategorySpend[];
  periodMonths: number;
  overBudget: { budget: Budget; category: Category; overBy: number }[];
}) {
  const baseParams = {
    currentAge: profile.current_age,
    currentCorpus,
    monthlyExpenses: profile.monthly_expenses,
    expectedReturnPercent: profile.expected_return_percent,
    inflationPercent: profile.inflation_percent,
    swrPercent: profile.safe_withdrawal_percent,
  };

  const plannedFireAge = projectFire({ ...baseParams, monthlyInvestment: profile.monthly_investment }).fireAge;
  const actualFireAge = projectFire({ ...baseParams, monthlyInvestment: monthlySavings }).fireAge;
  const requiredForTarget = requiredMonthlyInvestment({ ...baseParams, targetAge: profile.retirement_age });

  const suggestions: Suggestion[] = [];

  if (monthlySavings < profile.monthly_investment - 500) {
    const gap = profile.monthly_investment - monthlySavings;
    const agePenalty =
      actualFireAge != null && plannedFireAge != null && actualFireAge > plannedFireAge
        ? ` At this pace you'd reach FI at age ${actualFireAge} instead of ${plannedFireAge}.`
        : "";
    suggestions.push({
      title: "You're saving less than your plan calls for",
      description: `Your average savings this period is ${fmtCurrency(monthlySavings)}/month, ${fmtCurrency(gap)} short of your planned ${fmtCurrency(profile.monthly_investment)}/month.${agePenalty}`,
      tone: "warning",
    });
  }

  if (requiredForTarget != null && requiredForTarget > profile.monthly_investment + 500) {
    suggestions.push({
      title: `Bump your plan to actually hit age ${profile.retirement_age}`,
      description: `Your saved plan invests ${fmtCurrency(profile.monthly_investment)}/month, but reaching FI by age ${profile.retirement_age} needs about ${fmtCurrency(requiredForTarget)}/month — ${fmtCurrency(requiredForTarget - profile.monthly_investment)} more than planned.`,
      tone: "danger",
    });
  } else if (requiredForTarget == null) {
    suggestions.push({
      title: `Target age ${profile.retirement_age} isn't reachable at this rate`,
      description: `Even a very large monthly investment can't get there with your current return/inflation assumptions. Push the target age out, or revisit your assumptions on the FIRE page.`,
      tone: "danger",
    });
  }

  const topExpense = expenseBreakdown[0];
  if (topExpense) {
    const monthlyTopAmount = topExpense.amount / periodMonths;
    const trimAmount = monthlyTopAmount * 0.1;
    if (trimAmount > 100) {
      const boostedFireAge = projectFire({ ...baseParams, monthlyInvestment: monthlySavings + trimAmount }).fireAge;
      const impact =
        boostedFireAge != null && actualFireAge != null && boostedFireAge < actualFireAge
          ? ` That alone could move your projected FI age from ${actualFireAge} to ${boostedFireAge}.`
          : "";
      suggestions.push({
        title: `Trim "${topExpense.category.name}" by 10%`,
        description: `It's your top expense category at ${fmtCurrency(monthlyTopAmount)}/month. A 10% cut frees up ${fmtCurrency(trimAmount)}/month toward your FIRE goal.${impact}`,
        tone: "success",
      });
    }
  }

  if (overBudget.length > 0) {
    const totalOver = overBudget.reduce((s, b) => s + b.overBy, 0);
    suggestions.push({
      title: `Rein in ${overBudget.length} over-budget categor${overBudget.length === 1 ? "y" : "ies"}`,
      description: `You're ${fmtCurrency(totalOver)} over budget in ${overBudget.map((b) => b.category.name).join(", ")}. Staying within budget there goes straight into savings.`,
      tone: "warning",
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      title: "You're on track",
      description: `At your current savings pace you're projected to reach FI by age ${actualFireAge ?? "—"}, meeting or beating your target of ${profile.retirement_age}. Keep it up.`,
      tone: "success",
    });
  }

  const toneClasses: Record<Suggestion["tone"], string> = {
    success: "border-success/30 bg-success/5",
    warning: "border-accent/30 bg-accent/5",
    danger: "border-danger/30 bg-danger/5",
  };
  const titleToneClasses: Record<Suggestion["tone"], string> = {
    success: "text-success",
    warning: "text-accent",
    danger: "text-danger",
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted">FIRE Insights</h2>
        <Link href="/fire" className="text-xs text-accent">
          Open FIRE calculator →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Planned investment" value={fmtCurrency(profile.monthly_investment)} sub="per month" />
        <StatCard
          label="Actual savings"
          value={fmtCurrency(monthlySavings)}
          sub="avg. per month, this period"
          tone={monthlySavings < 0 ? "danger" : monthlySavings >= profile.monthly_investment ? "success" : "default"}
        />
        <StatCard
          label={`Needed for age ${profile.retirement_age}`}
          value={requiredForTarget != null ? fmtCurrency(requiredForTarget) : "Not reachable"}
          sub="per month"
          tone={requiredForTarget != null && requiredForTarget > profile.monthly_investment ? "danger" : "success"}
        />
      </div>

      <div className="mt-4 space-y-3">
        {suggestions.map((s, i) => (
          <div key={i} className={`rounded-lg border p-3.5 ${toneClasses[s.tone]}`}>
            <div className={`text-[13.5px] font-semibold ${titleToneClasses[s.tone]}`}>{s.title}</div>
            <p className="mt-1 text-[13px] text-muted">{s.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

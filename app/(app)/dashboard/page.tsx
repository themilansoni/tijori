"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { mapDocs } from "@/lib/firebase/collection-helpers";
import { useAuth } from "@/lib/auth-context";
import { PeriodSelector, CustomRangePicker } from "@/components/ui/period-selector";
import { NetWorthChart } from "@/components/charts/net-worth-chart";
import { QuickAddFab } from "@/components/dashboard/quick-add-fab";
import { LiveBadge } from "@/components/ui/live-badge";
import { LiveClock } from "@/components/ui/live-clock";
import { recordNetWorthSnapshot } from "@/lib/actions/net-worth";
import { processRecurringRules } from "@/lib/actions/recurring";
import { refreshEquityPrices } from "@/lib/actions/prices";
import {
  getPeriodRange,
  sumAmount,
  accountBalance,
  isCashAccount,
  totalCreditCardDues,
  calculateTotalPortfolioValue,
  calculateLoanTotals,
  fmtCurrency,
} from "@/lib/calculations";
import type {
  Account,
  Category,
  InvestmentHolding,
  Loan,
  NetWorthSnapshot,
  PeriodKey,
  Transaction,
} from "@/lib/types";

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const period = (searchParams.get("period") as PeriodKey) || "month";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const [loading, setLoading] = useState(true);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeHoldings, setActiveHoldings] = useState<InvestmentHolding[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [netWorthHistory, setNetWorthHistory] = useState<NetWorthSnapshot[]>([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    const uid = user.uid;
    await processRecurringRules().catch(() => {});
    const [txSnap, catSnap, accSnap, holdingSnap, loanSnap, snapshotSnap] = await Promise.all([
      getDocs(collection(db, "users", uid, "transactions")),
      getDocs(collection(db, "users", uid, "categories")),
      getDocs(collection(db, "users", uid, "accounts")),
      getDocs(collection(db, "users", uid, "investmentHoldings")),
      getDocs(collection(db, "users", uid, "loans")),
      getDocs(collection(db, "users", uid, "netWorthSnapshots")),
    ]);

    const txs = mapDocs<Transaction>(txSnap);
    const accs = mapDocs<Account>(accSnap);
    const holdings = mapDocs<InvestmentHolding>(holdingSnap).filter((h) => h.is_active);
    const loansList = mapDocs<Loan>(loanSnap);

    setAllTransactions(txs.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)));
    setCategories(mapDocs<Category>(catSnap));
    setAccounts(accs.sort((a, b) => a.name.localeCompare(b.name)));
    setActiveHoldings(holdings.sort((a, b) => a.instrument_name.localeCompare(b.instrument_name)));
    setLoans(loansList);
    setNetWorthHistory(mapDocs<NetWorthSnapshot>(snapshotSnap).sort((a, b) => a.month.localeCompare(b.month)));
    setLoading(false);

    const cash = accs.filter((a) => a.is_active && isCashAccount(a)).reduce((sum, a) => sum + accountBalance(a, txs), 0);
    const investments = calculateTotalPortfolioValue(holdings).currentValue;
    const loanTotal = calculateLoanTotals(loansList).totalOutstanding;
    recordNetWorthSnapshot({ cash, investments, loans: loanTotal }).catch(() => {});
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep displayed prices live in the background while the dashboard is open and in the foreground.
  useEffect(() => {
    const hasRefreshable = activeHoldings.some(
      (h) => ["equity", "etf", "mutual_fund"].includes(h.asset_type) && h.symbol
    );
    if (!hasRefreshable) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      refreshEquityPrices().then((result) => {
        if (!("error" in result)) {
          setLastRefreshedAt(new Date());
          load(true);
        }
      });
    }, 3 * 60 * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHoldings]);

  if (authLoading || loading) return null;

  const today = new Date();
  const { start, end } =
    period === "custom" && from && to
      ? getPeriodRange("custom", today, { from, to })
      : getPeriodRange(period === "custom" ? "month" : period, today);

  const activeExpenseCategories = categories.filter((c) => c.is_active && c.type === "expense");
  const activeIncomeCategories = categories.filter((c) => c.is_active && c.type === "income");
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const periodTransactions = allTransactions.filter(
    (t) => t.transaction_date >= start && t.transaction_date <= end
  );
  const totalIncome = sumAmount(periodTransactions.filter((t) => t.type === "income"));
  const totalExpense = sumAmount(periodTransactions.filter((t) => t.type === "expense"));
  const netCashFlow = totalIncome - totalExpense;

  const activeAccounts = accounts.filter((a) => a.is_active);
  const totalBalance = activeAccounts
    .filter(isCashAccount)
    .reduce((sum, a) => sum + accountBalance(a, allTransactions), 0);
  const creditCardDues = totalCreditCardDues(activeAccounts, allTransactions);

  const portfolioTotals = calculateTotalPortfolioValue(activeHoldings);
  const loanOutstanding = calculateLoanTotals(loans).totalOutstanding;
  const netWorth = totalBalance + portfolioTotals.currentValue - loanOutstanding;

  const netWorthChartData = netWorthHistory.map((s) => ({
    label: format(parseISO(`${s.month}-01`), "MMM yyyy"),
    netWorth: s.net_worth,
  }));

  const hasLivePrices = activeHoldings.some((h) => ["equity", "etf", "mutual_fund"].includes(h.asset_type) && h.symbol);
  const recentTransactions = allTransactions.slice(0, 3);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <LiveClock />
          <h1 className="mt-0.5 text-[26px] font-semibold tracking-tight">Your financial overview</h1>
        </div>
        <PeriodSelector current={period} />
      </div>
      {period === "custom" && (
        <div className="mt-3">
          <CustomRangePicker from={from} to={to} />
        </div>
      )}

      {/* ---- Hero balance ---- */}
      <div className="mt-6 rounded-[var(--radius-lg)] border border-border bg-surface px-6 py-6 shadow-[var(--shadow-sm)] sm:px-8 sm:py-7">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <div className="text-[12px] font-medium uppercase tracking-[0.5px] text-muted">Current Balance</div>
            <div className={`mt-1.5 text-[36px] font-semibold tracking-tight sm:text-[42px] ${totalBalance < 0 ? "text-danger" : ""}`}>
              {fmtCurrency(totalBalance)}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <div className="text-[12px] font-medium uppercase tracking-[0.5px] text-muted">Net Worth</div>
              {hasLivePrices && <LiveBadge updatedAt={lastRefreshedAt} />}
            </div>
            <div className={`mt-1.5 text-[36px] font-semibold tracking-tight sm:text-[42px] ${netWorth < 0 ? "text-danger" : "text-accent"}`}>
              {fmtCurrency(netWorth)}
            </div>
            <div className="mt-1 text-[11.5px] text-muted">
              Cash + investments{loanOutstanding > 0 ? " − loans" : ""}
            </div>
          </div>
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

      {/* ---- Net worth trend ---- */}
      {netWorthChartData.length >= 2 && (
        <section className="mt-6 rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold text-muted">Net Worth Trend</h2>
          <NetWorthChart data={netWorthChartData} />
        </section>
      )}

      {/* ---- Quick links ---- */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link href="/accounts" className="rounded-xl border border-border bg-surface p-4 transition hover:border-border-strong">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium uppercase tracking-wide text-muted">Accounts</span>
            <span className="text-xs text-accent">Manage →</span>
          </div>
          <div className={`mt-2 text-xl font-bold ${totalBalance < 0 ? "text-danger" : ""}`}>{fmtCurrency(totalBalance)}</div>
          <div className="mt-0.5 text-[11px] text-muted">
            {activeAccounts.length} account{activeAccounts.length === 1 ? "" : "s"}
            {creditCardDues > 0 && ` · ${fmtCurrency(creditCardDues)} CC dues`}
          </div>
        </Link>

        {activeHoldings.length > 0 && (
          <Link href="/investments" className="rounded-xl border border-border bg-surface p-4 transition hover:border-border-strong">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-medium uppercase tracking-wide text-muted">Investments</span>
              <span className="text-xs text-accent">Manage →</span>
            </div>
            <div className="mt-2 text-xl font-bold text-success">{fmtCurrency(portfolioTotals.currentValue)}</div>
            <div className="mt-0.5 text-[11px] text-muted">
              {portfolioTotals.pricedInvested > 0
                ? `${portfolioTotals.unrealizedPnL >= 0 ? "+" : ""}${portfolioTotals.unrealizedPnLPercent.toFixed(1)}% P&L`
                : `${activeHoldings.length} holding${activeHoldings.length === 1 ? "" : "s"}`}
            </div>
          </Link>
        )}

        {loanOutstanding > 0 && (
          <Link href="/loans" className="rounded-xl border border-border bg-surface p-4 transition hover:border-border-strong">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-medium uppercase tracking-wide text-muted">Loans</span>
              <span className="text-xs text-accent">Manage →</span>
            </div>
            <div className="mt-2 text-xl font-bold text-danger">{fmtCurrency(loanOutstanding)}</div>
            <div className="mt-0.5 text-[11px] text-muted">outstanding</div>
          </Link>
        )}
      </div>

      {/* ---- Recent transactions ---- */}
      <section className="mt-6 rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Recent Transactions</h2>
          <Link href="/reports" className="text-xs text-accent">
            Full report →
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

      <QuickAddFab
        expenseCategories={activeExpenseCategories}
        incomeCategories={activeIncomeCategories}
        accounts={activeAccounts}
        canAddExpense
        canAddIncome
        onSuccess={load}
      />
    </div>
  );
}

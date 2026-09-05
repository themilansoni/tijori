import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
  parseISO,
  differenceInCalendarDays,
  addDays,
  addWeeks,
  addMonths,
  addYears,
} from "date-fns";
import type {
  Account,
  AssetType,
  Budget,
  BudgetPeriod,
  Category,
  InvestmentHolding,
  PeriodKey,
  Transaction,
} from "./types";

const ISO = "yyyy-MM-dd";
const toISO = (d: Date) => format(d, ISO);

/** Inclusive [start, end] date-string range for a given period, anchored on `today`. */
export function getPeriodRange(
  period: PeriodKey,
  today: Date,
  custom?: { from: string; to: string }
): { start: string; end: string } {
  switch (period) {
    case "today":
      return { start: toISO(today), end: toISO(today) };
    case "week":
      return {
        start: toISO(startOfWeek(today, { weekStartsOn: 1 })),
        end: toISO(endOfWeek(today, { weekStartsOn: 1 })),
      };
    case "month":
      return { start: toISO(startOfMonth(today)), end: toISO(endOfMonth(today)) };
    case "year":
      return { start: toISO(startOfYear(today)), end: toISO(endOfYear(today)) };
    case "custom":
      if (!custom) throw new Error("custom range requires from/to");
      return { start: custom.from, end: custom.to };
  }
}

/** The [start, end] range a budget currently covers, based on its period. */
export function getBudgetPeriodRange(
  budgetPeriod: BudgetPeriod,
  today: Date
): { start: string; end: string } {
  switch (budgetPeriod) {
    case "daily":
      return { start: toISO(today), end: toISO(today) };
    case "weekly":
      return {
        start: toISO(startOfWeek(today, { weekStartsOn: 1 })),
        end: toISO(endOfWeek(today, { weekStartsOn: 1 })),
      };
    case "monthly":
      return { start: toISO(startOfMonth(today)), end: toISO(endOfMonth(today)) };
    case "yearly":
      return { start: toISO(startOfYear(today)), end: toISO(endOfYear(today)) };
  }
}

export function sumAmount(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => sum + Number(t.amount), 0);
}

export function dailyAverage(transactions: Transaction[], start: string, end: string): number {
  const days = differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;
  if (days <= 0) return 0;
  return sumAmount(transactions) / days;
}

export type CategorySpend = {
  category: Category;
  amount: number;
  percent: number;
};

export function categorySpending(
  transactions: Transaction[],
  categories: Category[]
): CategorySpend[] {
  const total = sumAmount(transactions);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, number>();

  for (const t of transactions) {
    totals.set(t.category_id, (totals.get(t.category_id) ?? 0) + Number(t.amount));
  }

  return Array.from(totals.entries())
    .map(([categoryId, amount]) => ({
      category: byId.get(categoryId)!,
      amount,
      percent: total > 0 ? (amount / total) * 100 : 0,
    }))
    .filter((c) => c.category)
    .sort((a, b) => b.amount - a.amount);
}

export type BudgetStatus = {
  budget: Budget;
  category: Category;
  spent: number;
  remaining: number;
  usedPercent: number;
  isOverBudget: boolean;
  overBy: number;
  periodRange: { start: string; end: string };
};

export function budgetStatus(
  budget: Budget,
  category: Category,
  allTransactions: Transaction[],
  today: Date
): BudgetStatus {
  const periodRange = getBudgetPeriodRange(budget.period, today);
  const spent = sumAmount(
    allTransactions.filter(
      (t) =>
        t.category_id === budget.category_id &&
        t.transaction_date >= periodRange.start &&
        t.transaction_date <= periodRange.end
    )
  );
  const remaining = Number(budget.amount) - spent;
  const usedPercent = Number(budget.amount) > 0 ? (spent / Number(budget.amount)) * 100 : 0;

  return {
    budget,
    category,
    spent,
    remaining,
    usedPercent,
    isOverBudget: remaining < 0,
    overBy: remaining < 0 ? Math.abs(remaining) : 0,
    periodRange,
  };
}

export type DayPoint = { date: string; label: string; amount: number };

export function spendingByDay(
  transactions: Transaction[],
  start: string,
  end: string
): DayPoint[] {
  const days = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) });
  const totals = new Map<string, number>();
  for (const t of transactions) {
    totals.set(t.transaction_date, (totals.get(t.transaction_date) ?? 0) + Number(t.amount));
  }
  return days.map((d) => {
    const iso = toISO(d);
    return { date: iso, label: format(d, "EEE"), amount: totals.get(iso) ?? 0 };
  });
}

export type MonthPoint = { month: string; label: string; amount: number };

export function spendingByMonth(
  transactions: Transaction[],
  start: string,
  end: string
): MonthPoint[] {
  const months = eachMonthOfInterval({ start: parseISO(start), end: parseISO(end) });
  const totals = new Map<string, number>();
  for (const t of transactions) {
    const key = t.transaction_date.slice(0, 7); // YYYY-MM
    totals.set(key, (totals.get(key) ?? 0) + Number(t.amount));
  }
  return months.map((m) => {
    const key = format(m, "yyyy-MM");
    return { month: key, label: format(m, "MMM"), amount: totals.get(key) ?? 0 };
  });
}

export type IncomeExpensePoint = { label: string; income: number; expense: number };

/** Income vs. expense, one point per day in [start, end] — for the monthly/weekly dashboard trend view. */
export function incomeExpenseByDay(
  transactions: Transaction[],
  start: string,
  end: string
): IncomeExpensePoint[] {
  const days = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) });
  const income = new Map<string, number>();
  const expense = new Map<string, number>();
  for (const t of transactions) {
    const bucket = t.type === "income" ? income : expense;
    bucket.set(t.transaction_date, (bucket.get(t.transaction_date) ?? 0) + Number(t.amount));
  }
  return days.map((d) => {
    const iso = toISO(d);
    return { label: format(d, "d MMM"), income: income.get(iso) ?? 0, expense: expense.get(iso) ?? 0 };
  });
}

/** Income vs. expense, one point per month in [start, end] — for the yearly dashboard trend view. */
export function incomeExpenseByMonth(
  transactions: Transaction[],
  start: string,
  end: string
): IncomeExpensePoint[] {
  const months = eachMonthOfInterval({ start: parseISO(start), end: parseISO(end) });
  const income = new Map<string, number>();
  const expense = new Map<string, number>();
  for (const t of transactions) {
    const key = t.transaction_date.slice(0, 7);
    const bucket = t.type === "income" ? income : expense;
    bucket.set(key, (bucket.get(key) ?? 0) + Number(t.amount));
  }
  return months.map((m) => {
    const key = format(m, "yyyy-MM");
    return { label: format(m, "MMM"), income: income.get(key) ?? 0, expense: expense.get(key) ?? 0 };
  });
}

/** Current balance = opening balance + all income into it - all expenses out of it. */
export function accountBalance(account: Account, allTransactions: Transaction[]): number {
  const forAccount = allTransactions.filter((t) => t.account_id === account.id);
  const income = sumAmount(forAccount.filter((t) => t.type === "income"));
  const expense = sumAmount(forAccount.filter((t) => t.type === "expense"));
  return Number(account.opening_balance) + income - expense;
}

export type AccountAmount = { account: Account; amount: number };

/** Sum of `transactions` grouped by account (e.g. "income by account" for a period). */
export function amountByAccount(transactions: Transaction[], accounts: Account[]): AccountAmount[] {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (!t.account_id) continue;
    totals.set(t.account_id, (totals.get(t.account_id) ?? 0) + Number(t.amount));
  }
  return Array.from(totals.entries())
    .map(([accountId, amount]) => ({ account: byId.get(accountId)!, amount }))
    .filter((a) => a.account)
    .sort((a, b) => b.amount - a.amount);
}

export function fmtCurrency(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}₹${Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/**
 * Centralized investment-portfolio math — every screen (list, dashboard,
 * detail) reads through these instead of computing invested/market value
 * inline, so the definition of "P&L" only lives in one place.
 */
export function calculateInvestedAmount(holding: InvestmentHolding): number {
  return Number(holding.quantity) * Number(holding.average_buy_price);
}

/** Market value is null (not zero) when there's no price yet — never invent a number. */
export function calculateMarketValue(holding: InvestmentHolding): number | null {
  if (holding.current_price == null) return null;
  return Number(holding.quantity) * Number(holding.current_price);
}

export function calculateUnrealizedPnL(holding: InvestmentHolding): number | null {
  const marketValue = calculateMarketValue(holding);
  if (marketValue == null) return null;
  return marketValue - calculateInvestedAmount(holding);
}

export function calculatePnLPercentage(holding: InvestmentHolding): number | null {
  const pnl = calculateUnrealizedPnL(holding);
  const invested = calculateInvestedAmount(holding);
  if (pnl == null || invested <= 0) return null;
  return (pnl / invested) * 100;
}

export type PortfolioTotals = {
  totalInvested: number;
  /** Sum of market value across holdings that have a current price; holdings with no price yet are excluded. */
  currentValue: number;
  /** Invested amount for only the priced holdings — the fair comparison base for `unrealizedPnL`. */
  pricedInvested: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  /** How many active holdings have no current price yet (so currentValue understates the true total). */
  unpricedCount: number;
};

export function calculateTotalPortfolioValue(holdings: InvestmentHolding[]): PortfolioTotals {
  const active = holdings.filter((h) => h.is_active);
  const totalInvested = active.reduce((sum, h) => sum + calculateInvestedAmount(h), 0);

  let currentValue = 0;
  let pricedInvested = 0;
  let unpricedCount = 0;

  for (const h of active) {
    const marketValue = calculateMarketValue(h);
    if (marketValue == null) {
      unpricedCount += 1;
      continue;
    }
    currentValue += marketValue;
    pricedInvested += calculateInvestedAmount(h);
  }

  const unrealizedPnL = currentValue - pricedInvested;
  return {
    totalInvested,
    currentValue,
    pricedInvested,
    unrealizedPnL,
    unrealizedPnLPercent: pricedInvested > 0 ? (unrealizedPnL / pricedInvested) * 100 : 0,
    unpricedCount,
  };
}

export type AssetAllocation = { assetType: AssetType; value: number; percent: number };

/** Portfolio allocation by asset type, using market value where priced and invested amount as a fallback. */
export function calculatePortfolioAllocation(holdings: InvestmentHolding[]): AssetAllocation[] {
  const active = holdings.filter((h) => h.is_active);
  const totals = new Map<AssetType, number>();
  for (const h of active) {
    const value = calculateMarketValue(h) ?? calculateInvestedAmount(h);
    totals.set(h.asset_type, (totals.get(h.asset_type) ?? 0) + value);
  }
  const grandTotal = Array.from(totals.values()).reduce((a, b) => a + b, 0);
  return Array.from(totals.entries())
    .map(([assetType, value]) => ({
      assetType,
      value,
      percent: grandTotal > 0 ? (value / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

export function nextBudgetStartExample(period: BudgetPeriod, today: Date): Date {
  switch (period) {
    case "daily":
      return addDays(today, 1);
    case "weekly":
      return addWeeks(today, 1);
    case "monthly":
      return addMonths(today, 1);
    case "yearly":
      return addYears(today, 1);
  }
}

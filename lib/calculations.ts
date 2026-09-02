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
import type { Account, Budget, BudgetPeriod, Category, PeriodKey, Transaction } from "./types";

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

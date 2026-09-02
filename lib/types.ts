export type Category = {
  id: string;
  user_id: string;
  name: string;
  type: "expense" | "income";
  parent_category_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  type: "expense" | "income";
  category_id: string;
  amount: number;
  transaction_date: string; // YYYY-MM-DD
  description: string | null;
  payment_method: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type BudgetPeriod = "daily" | "weekly" | "monthly" | "yearly";

export type Budget = {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  period: BudgetPeriod;
  start_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const PAYMENT_METHODS = [
  "Cash",
  "UPI",
  "Credit Card",
  "Debit Card",
  "Bank Transfer",
  "Other",
] as const;

export type PeriodKey = "today" | "week" | "month" | "year" | "custom";

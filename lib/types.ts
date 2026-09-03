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
  account_id: string | null;
  amount: number;
  transaction_date: string; // YYYY-MM-DD
  description: string | null;
  payment_method: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type AccountType =
  | "cash"
  | "bank"
  | "credit_card"
  | "debit_card"
  | "wallet"
  | "investment"
  | "other";

export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  opening_balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "credit_card", label: "Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "wallet", label: "Wallet" },
  { value: "investment", label: "Investment" },
  { value: "other", label: "Other" },
];

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

export type Role = {
  id: string;
  name: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

export type PermAction = "view" | "create" | "edit" | "delete";

export type Permission = {
  id: string;
  module: string;
  action: PermAction;
};

export type InvestmentType =
  | "mutual_fund"
  | "stocks"
  | "fixed_deposit"
  | "ppf"
  | "epf"
  | "gold"
  | "real_estate"
  | "crypto"
  | "bonds"
  | "other";

export const INVESTMENT_TYPES: { value: InvestmentType; label: string }[] = [
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "stocks", label: "Stocks" },
  { value: "fixed_deposit", label: "Fixed Deposit" },
  { value: "ppf", label: "PPF" },
  { value: "epf", label: "EPF" },
  { value: "gold", label: "Gold" },
  { value: "real_estate", label: "Real Estate" },
  { value: "crypto", label: "Crypto" },
  { value: "bonds", label: "Bonds" },
  { value: "other", label: "Other" },
];

export type Investment = {
  id: string;
  user_id: string;
  name: string;
  type: InvestmentType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type InvestmentTxType = "invest" | "withdraw";

export type InvestmentTransaction = {
  id: string;
  user_id: string;
  investment_id: string;
  type: InvestmentTxType;
  amount: number;
  transaction_date: string;
  account_id: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  status: "active" | "inactive";
  role_id: string | null;
  created_at: string;
  updated_at: string;
};

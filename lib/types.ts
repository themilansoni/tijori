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

export type PermAction = "view" | "create" | "edit" | "delete" | "sync" | "connect";

export type Permission = {
  id: string;
  module: string;
  action: PermAction;
};

export type AssetType =
  | "stock"
  | "etf"
  | "mutual_fund"
  | "bond"
  | "gold"
  | "fixed_deposit"
  | "other";

export const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: "stock", label: "Stock" },
  { value: "etf", label: "ETF" },
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "bond", label: "Bond" },
  { value: "gold", label: "Gold" },
  { value: "fixed_deposit", label: "Fixed Deposit" },
  { value: "other", label: "Other" },
];

export type InvestmentSource = "manual" | "zerodha";

export type InvestmentHolding = {
  id: string;
  user_id: string;
  broker_connection_id: string | null;
  source: InvestmentSource;
  instrument_name: string;
  asset_type: AssetType;
  symbol: string | null;
  isin: string | null;
  exchange: string | null;
  quantity: number;
  average_buy_price: number;
  current_price: number | null;
  price_source: "manual" | "zerodha";
  last_price_update: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type InvestmentTxType = "buy" | "sell" | "dividend" | "bonus" | "split";

export type InvestmentTransaction = {
  id: string;
  user_id: string;
  holding_id: string;
  type: InvestmentTxType;
  quantity: number | null;
  price: number | null;
  charges: number;
  total_amount: number;
  transaction_date: string;
  account_id: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type BrokerName = "zerodha" | "upstox";

export type BrokerConnectionStatus = "connected" | "disconnected" | "expired" | "error";

export type BrokerConnection = {
  id: string;
  user_id: string;
  broker: BrokerName;
  status: BrokerConnectionStatus;
  broker_user_id: string | null;
  connected_at: string | null;
  last_synced_at: string | null;
  last_error: string | null;
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

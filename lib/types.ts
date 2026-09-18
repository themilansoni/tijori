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

export type AssetType =
  | "equity"
  | "etf"
  | "mutual_fund"
  | "bond"
  | "gold"
  | "fixed_deposit"
  | "recurring_deposit"
  | "provident_fund"
  | "ppf"
  | "real_estate"
  | "other";

export const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: "equity", label: "Equity" },
  { value: "etf", label: "ETF" },
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "bond", label: "Bond" },
  { value: "gold", label: "Gold" },
  { value: "fixed_deposit", label: "Fixed Deposit" },
  { value: "recurring_deposit", label: "Recurring Deposit" },
  { value: "provident_fund", label: "Provident Fund (PF)" },
  { value: "ppf", label: "PPF" },
  { value: "real_estate", label: "Real Estate / Home" },
  { value: "other", label: "Other" },
];

/** Equity, ETF, and mutual fund holdings are grouped together as one "Equity & Funds" category in the holdings table. */
const EQUITY_CATEGORY_TYPES: AssetType[] = ["equity", "etf", "mutual_fund"];
export function getAssetCategoryKey(type: AssetType): string {
  return EQUITY_CATEGORY_TYPES.includes(type) ? "equity_funds" : type;
}
export function getAssetCategoryLabel(type: AssetType): string {
  if (EQUITY_CATEGORY_TYPES.includes(type)) return "Equity & Funds";
  return ASSET_TYPES.find((t) => t.value === type)?.label ?? type;
}

/** Types tracked as quantity × price. Everything else is a lump-sum value the user updates by hand. */
const QUANTITY_BASED_TYPES: AssetType[] = ["equity", "etf", "mutual_fund", "bond"];
export function isQuantityBasedAsset(type: AssetType): boolean {
  return QUANTITY_BASED_TYPES.includes(type);
}

/** Gold is a lump-sum type (invested amount + current value, like real estate) but
 *  also accepts an optional weight in grams, purely for reference — it never drives
 *  the valuation math. */
export function isWeightTrackedAsset(type: AssetType): boolean {
  return type === "gold";
}

/** Interest-bearing lump-sum types where a rate/maturity date are meaningful. */
const INTEREST_BEARING_TYPES: AssetType[] = ["fixed_deposit", "recurring_deposit", "provident_fund", "ppf"];
export function isInterestBearingAsset(type: AssetType): boolean {
  return INTEREST_BEARING_TYPES.includes(type);
}

/** "Other" is a lump-sum type too, but simpler still: just a name and one amount, no invested-vs-current split. */
export function isSimpleAmountAsset(type: AssetType): boolean {
  return type === "other";
}

export type InvestmentSource = "manual" | "zerodha";

export type InvestmentHolding = {
  id: string;
  user_id: string;
  source: InvestmentSource;
  instrument_name: string;
  asset_type: AssetType;
  symbol: string | null;
  isin: string | null;
  exchange: string | null;
  quantity: number;
  average_buy_price: number;
  current_price: number | null;
  weight_grams: number | null;
  price_source: "manual" | "zerodha";
  last_price_update: string | null;
  interest_rate: number | null;
  maturity_date: string | null;
  owner_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type HouseholdMember = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
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

export type FireProfile = {
  current_age: number;
  retirement_age: number;
  monthly_expenses: number;
  monthly_investment: number;
  expected_return_percent: number;
  inflation_percent: number;
  safe_withdrawal_percent: number;
  updated_at: string;
};

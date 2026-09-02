import { LayoutGrid, ArrowDownRight, ArrowUpRight, Target, Wallet, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/expenses", label: "Expenses", icon: ArrowDownRight },
  { href: "/income", label: "Income", icon: ArrowUpRight },
  { href: "/budgets", label: "Budgets", icon: Target },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
];

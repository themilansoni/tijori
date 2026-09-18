import { LayoutGrid, ArrowDownRight, ArrowUpRight, Target, Wallet, TrendingUp, Landmark, Flame, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/expenses", label: "Expenses", icon: ArrowDownRight },
  { href: "/income", label: "Income", icon: ArrowUpRight },
  { href: "/budgets", label: "Budgets", icon: Target },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/investments", label: "Investments", icon: TrendingUp },
  { href: "/loans", label: "Loans", icon: Landmark },
  { href: "/fire", label: "FIRE", icon: Flame },
  { href: "/settings", label: "Settings", icon: Settings },
];

import { TransactionList } from "@/components/transactions/transaction-list";
import type { Account, Category, Transaction } from "@/lib/types";

export function IncomeList({
  transactions,
  categories,
  accounts,
}: {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
}) {
  return (
    <TransactionList type="income" transactions={transactions} categories={categories} accounts={accounts} />
  );
}

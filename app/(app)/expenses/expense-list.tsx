import { TransactionList } from "@/components/transactions/transaction-list";
import type { Account, Category, Transaction } from "@/lib/types";

export function ExpenseList({
  transactions,
  categories,
  accounts = [],
}: {
  transactions: Transaction[];
  categories: Category[];
  accounts?: Account[];
}) {
  return (
    <TransactionList type="expense" transactions={transactions} categories={categories} accounts={accounts} />
  );
}

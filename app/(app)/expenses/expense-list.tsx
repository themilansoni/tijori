import { TransactionList } from "@/components/transactions/transaction-list";
import type { Account, Category, Loan, Transaction } from "@/lib/types";

export function ExpenseList({
  transactions,
  categories,
  accounts = [],
  loans = [],
  onChanged,
}: {
  transactions: Transaction[];
  categories: Category[];
  accounts?: Account[];
  loans?: Loan[];
  onChanged?: () => void;
}) {
  return (
    <TransactionList
      type="expense"
      transactions={transactions}
      categories={categories}
      accounts={accounts}
      loans={loans}
      onChanged={onChanged}
    />
  );
}

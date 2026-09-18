import { TransactionList } from "@/components/transactions/transaction-list";
import type { Account, Category, HouseholdMember, Loan, Transaction } from "@/lib/types";

export function ExpenseList({
  transactions,
  categories,
  accounts = [],
  loans = [],
  members = [],
  onChanged,
}: {
  transactions: Transaction[];
  categories: Category[];
  accounts?: Account[];
  loans?: Loan[];
  members?: HouseholdMember[];
  onChanged?: () => void;
}) {
  return (
    <TransactionList
      type="expense"
      transactions={transactions}
      categories={categories}
      accounts={accounts}
      loans={loans}
      members={members}
      onChanged={onChanged}
    />
  );
}

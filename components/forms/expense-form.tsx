import { TransactionForm } from "@/components/forms/transaction-form";
import type { Account, Category, HouseholdMember, Loan, Transaction } from "@/lib/types";

export function ExpenseForm({
  categories,
  accounts = [],
  loans = [],
  members = [],
  transaction,
  defaultDate,
  keepOpenOnAdd,
  onSuccess,
}: {
  categories: Category[];
  accounts?: Account[];
  loans?: Loan[];
  members?: HouseholdMember[];
  transaction?: Transaction;
  defaultDate?: string;
  keepOpenOnAdd?: boolean;
  onSuccess?: () => void;
}) {
  return (
    <TransactionForm
      type="expense"
      categories={categories}
      accounts={accounts}
      loans={loans}
      members={members}
      transaction={transaction}
      defaultDate={defaultDate}
      keepOpenOnAdd={keepOpenOnAdd}
      onSuccess={onSuccess}
    />
  );
}

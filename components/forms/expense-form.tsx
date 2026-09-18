import { TransactionForm } from "@/components/forms/transaction-form";
import type { Account, Category, Loan, Transaction } from "@/lib/types";

export function ExpenseForm({
  categories,
  accounts = [],
  loans = [],
  transaction,
  defaultDate,
  keepOpenOnAdd,
  onSuccess,
}: {
  categories: Category[];
  accounts?: Account[];
  loans?: Loan[];
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
      transaction={transaction}
      defaultDate={defaultDate}
      keepOpenOnAdd={keepOpenOnAdd}
      onSuccess={onSuccess}
    />
  );
}

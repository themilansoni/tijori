import { TransactionForm } from "@/components/forms/transaction-form";
import type { Account, Category, Transaction } from "@/lib/types";

export function ExpenseForm({
  categories,
  accounts = [],
  transaction,
  defaultDate,
  keepOpenOnAdd,
}: {
  categories: Category[];
  accounts?: Account[];
  transaction?: Transaction;
  defaultDate?: string;
  keepOpenOnAdd?: boolean;
}) {
  return (
    <TransactionForm
      type="expense"
      categories={categories}
      accounts={accounts}
      transaction={transaction}
      defaultDate={defaultDate}
      keepOpenOnAdd={keepOpenOnAdd}
    />
  );
}

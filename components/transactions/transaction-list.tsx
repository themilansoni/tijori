"use client";

import { format, parseISO } from "date-fns";
import { Modal } from "@/components/ui/modal";
import { TransactionForm } from "@/components/forms/transaction-form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { deleteTransaction } from "@/lib/actions/transactions";
import { fmtCurrency } from "@/lib/calculations";
import type { Account, Category, Transaction } from "@/lib/types";

export function TransactionList({
  type,
  transactions,
  categories,
  accounts,
}: {
  type: "expense" | "income";
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
}) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const noun = type === "income" ? "income" : "expenses";
  const amountColor = type === "income" ? "text-accent" : "text-foreground";
  const sign = type === "income" ? "+" : "−";

  function accountLabel(t: Transaction) {
    if (t.account_id) return accountById.get(t.account_id)?.name ?? "—";
    return t.payment_method || "—";
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <p className="text-muted">No {noun} match these filters yet.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium">Description</th>
              <th className="px-4 py-2.5 text-right font-medium">Amount</th>
              <th className="px-4 py-2.5 font-medium">{type === "income" ? "Account" : "Payment"}</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.map((t) => (
              <tr key={t.id} className="bg-surface">
                <td className="px-4 py-3 whitespace-nowrap text-muted">
                  {format(parseISO(t.transaction_date), "dd MMM yyyy")}
                </td>
                <td className="px-4 py-3">{categoryById.get(t.category_id)?.name ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{t.description || "—"}</td>
                <td className={`px-4 py-3 text-right font-semibold ${amountColor}`}>
                  {sign}
                  {fmtCurrency(t.amount)}
                </td>
                <td className="px-4 py-3 text-muted">{accountLabel(t)}</td>
                <td className="px-4 py-3">
                  <RowActions type={type} transaction={t} categories={categories} accounts={accounts} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {transactions.map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{categoryById.get(t.category_id)?.name ?? "—"}</div>
                <div className="mt-0.5 text-xs text-muted">
                  {format(parseISO(t.transaction_date), "dd MMM yyyy")}
                  {accountLabel(t) !== "—" ? ` · ${accountLabel(t)}` : ""}
                </div>
                {t.description && <div className="mt-1 text-sm text-muted">{t.description}</div>}
              </div>
              <div className={`text-right font-bold ${amountColor}`}>
                {sign}
                {fmtCurrency(t.amount)}
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <RowActions type={type} transaction={t} categories={categories} accounts={accounts} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function RowActions({
  type,
  transaction,
  categories,
  accounts,
}: {
  type: "expense" | "income";
  transaction: Transaction;
  categories: Category[];
  accounts: Account[];
}) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <Modal
        trigger={<button className="text-muted hover:text-foreground">Edit</button>}
        title={type === "income" ? "Edit income" : "Edit expense"}
      >
        <TransactionForm
          type={type}
          categories={categories}
          accounts={accounts}
          transaction={transaction}
        />
      </Modal>
      <ConfirmButton
        className="text-danger hover:brightness-110"
        confirmMessage={`Delete this ${type === "income" ? "income" : "expense"}? This can't be undone.`}
        action={() => deleteTransaction(transaction.id)}
      >
        Delete
      </ConfirmButton>
    </div>
  );
}

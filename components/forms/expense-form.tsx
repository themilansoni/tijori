"use client";

import { useState, useTransition } from "react";
import { createTransaction, updateTransaction } from "@/lib/actions/transactions";
import { Field, SelectField, TextareaField, SubmitButton, FormError } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import { PAYMENT_METHODS, type Category, type Transaction } from "@/lib/types";

export function ExpenseForm({
  categories,
  transaction,
  defaultDate,
  keepOpenOnAdd,
}: {
  categories: Category[];
  transaction?: Transaction;
  defaultDate?: string;
  keepOpenOnAdd?: boolean;
}) {
  const { close } = useModal();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [resetKey, setResetKey] = useState(0);

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = transaction
        ? await updateTransaction(formData)
        : await createTransaction("expense", formData);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      if (transaction || !keepOpenOnAdd) {
        close();
      } else {
        setResetKey((k) => k + 1);
      }
    });
  }

  const today = defaultDate ?? new Date().toISOString().slice(0, 10);

  return (
    <form key={resetKey} action={handleSubmit}>
      {transaction && <input type="hidden" name="id" value={transaction.id} />}

      <Field
        label="Amount (₹)"
        name="amount"
        type="number"
        step="0.01"
        min="0.01"
        placeholder="450"
        defaultValue={transaction?.amount}
        required
        autoFocus
      />

      <SelectField label="Category" name="category_id" defaultValue={transaction?.category_id} required>
        <option value="" disabled>
          Select category
        </option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectField>

      <Field
        label="Date"
        name="transaction_date"
        type="date"
        defaultValue={transaction?.transaction_date ?? today}
        required
      />

      <SelectField
        label="Payment method (optional)"
        name="payment_method"
        defaultValue={transaction?.payment_method ?? ""}
      >
        <option value="">Not specified</option>
        {PAYMENT_METHODS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </SelectField>

      <Field
        label="Description (optional)"
        name="description"
        placeholder="Lunch with friends"
        defaultValue={transaction?.description ?? ""}
      />

      <TextareaField
        label="Note (optional)"
        name="note"
        rows={2}
        placeholder="Anything else worth remembering"
        defaultValue={transaction?.note ?? ""}
      />

      <FormError message={error} />
      <SubmitButton pending={pending}>
        {transaction ? "Save changes" : "Save expense"}
      </SubmitButton>
    </form>
  );
}

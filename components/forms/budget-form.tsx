"use client";

import { useState, useTransition } from "react";
import { createBudget, updateBudget } from "@/lib/actions/budgets";
import { Field, SelectField, SubmitButton, FormError } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import type { Budget, Category } from "@/lib/types";

export function BudgetForm({
  categories,
  budget,
}: {
  categories: Category[];
  budget?: Budget;
}) {
  const { close } = useModal();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = budget ? await updateBudget(formData) : await createBudget(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      close();
    });
  }

  return (
    <form action={handleSubmit}>
      {budget && <input type="hidden" name="id" value={budget.id} />}

      {!budget && (
        <SelectField label="Category" name="category_id" required defaultValue="">
          <option value="" disabled>
            Select category
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
      )}

      <Field
        label="Budget amount (₹)"
        name="amount"
        type="number"
        step="0.01"
        min="0.01"
        placeholder="5000"
        defaultValue={budget?.amount}
        required
        autoFocus={!!budget}
      />

      <SelectField label="Period" name="period" defaultValue={budget?.period ?? "monthly"}>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
      </SelectField>

      {!budget && (
        <Field
          label="Effective from"
          name="start_date"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
      )}

      <FormError message={error} />
      <SubmitButton pending={pending}>{budget ? "Save changes" : "Create budget"}</SubmitButton>
    </form>
  );
}

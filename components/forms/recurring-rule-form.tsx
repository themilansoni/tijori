"use client";

import { useState, useTransition } from "react";
import { createRecurringRule, updateRecurringRule } from "@/lib/actions/recurring";
import { Field, SelectField, SubmitButton, FormError } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import type { Account, Category, HouseholdMember, RecurringRule } from "@/lib/types";

export function RecurringRuleForm({
  rule,
  expenseCategories,
  incomeCategories,
  accounts = [],
  members = [],
  onSuccess,
}: {
  rule?: RecurringRule;
  expenseCategories: Category[];
  incomeCategories: Category[];
  accounts?: Account[];
  members?: HouseholdMember[];
  onSuccess?: () => void;
}) {
  const { close } = useModal();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [type, setType] = useState<"expense" | "income">(rule?.type ?? "expense");

  const categories = type === "income" ? incomeCategories : expenseCategories;

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = rule ? await updateRecurringRule(formData) : await createRecurringRule(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onSuccess?.();
      close();
    });
  }

  return (
    <form action={handleSubmit}>
      {rule && <input type="hidden" name="id" value={rule.id} />}

      <SelectField label="Type" name="type" value={type} onChange={(e) => setType(e.target.value as "expense" | "income")}>
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </SelectField>

      <SelectField label="Category" name="category_id" defaultValue={rule?.category_id ?? ""} required>
        <option value="" disabled>
          Select category
        </option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectField>

      <div className="mt-5 grid grid-cols-2 gap-3 [&>label]:!mt-0">
        <Field
          label="Amount (₹)"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="15000"
          defaultValue={rule?.amount}
          required
        />
        <Field
          label="Day of month"
          name="day_of_month"
          type="number"
          step="1"
          min="1"
          max="28"
          placeholder="5"
          defaultValue={rule?.day_of_month ?? 1}
          required
        />
      </div>
      <p className="mt-1.5 text-[12px] text-muted">
        Capped at 28 so it never skips a short month. Logs automatically next time you open the app
        on or after that day.
      </p>

      <Field
        label="Description (optional)"
        name="description"
        placeholder="e.g. Rent, Netflix"
        defaultValue={rule?.description ?? ""}
      />

      <SelectField label={type === "income" ? "Received into (optional)" : "Paid from (optional)"} name="account_id" defaultValue={rule?.account_id ?? ""}>
        <option value="">{accounts.length ? "Select account" : "No accounts yet"}</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </SelectField>

      <SelectField label="Person (optional)" name="owner_id" defaultValue={rule?.owner_id ?? ""}>
        <option value="">Unassigned</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </SelectField>

      <FormError message={error} />
      <SubmitButton pending={pending}>{rule ? "Save changes" : "Add recurring"}</SubmitButton>
    </form>
  );
}

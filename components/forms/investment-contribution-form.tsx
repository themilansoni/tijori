"use client";

import { useState, useTransition } from "react";
import { addInvestmentContribution } from "@/lib/actions/investments";
import { Field, SelectField, TextareaField, SubmitButton, FormError } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import type { Account, Investment } from "@/lib/types";

export function InvestmentContributionForm({
  investment,
  accounts,
}: {
  investment: Investment;
  accounts: Account[];
}) {
  const { close } = useModal();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await addInvestmentContribution(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      close();
    });
  }

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="investment_id" value={investment.id} />

      <SelectField label="Type" name="type" defaultValue="invest">
        <option value="invest">Money invested</option>
        <option value="withdraw">Money withdrawn</option>
      </SelectField>

      <Field
        label="Amount (₹)"
        name="amount"
        type="number"
        step="0.01"
        min="0.01"
        placeholder="5000"
        required
        autoFocus
      />

      <Field
        label="Date"
        name="transaction_date"
        type="date"
        defaultValue={new Date().toISOString().slice(0, 10)}
        required
      />

      <SelectField label="Paid from / to (optional)" name="account_id" defaultValue="">
        <option value="">Not specified</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </SelectField>

      <TextareaField label="Note (optional)" name="note" rows={2} placeholder="Anything worth remembering" />

      <FormError message={error} />
      <SubmitButton pending={pending}>Save</SubmitButton>
    </form>
  );
}

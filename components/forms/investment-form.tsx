"use client";

import { useState, useTransition } from "react";
import { createInvestment, updateInvestment } from "@/lib/actions/investments";
import { Field, SelectField, SubmitButton, FormError } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import { INVESTMENT_TYPES, type Investment } from "@/lib/types";

export function InvestmentForm({ investment }: { investment?: Investment }) {
  const { close } = useModal();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = investment ? await updateInvestment(formData) : await createInvestment(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      close();
    });
  }

  return (
    <form action={handleSubmit}>
      {investment && <input type="hidden" name="id" value={investment.id} />}

      <Field
        label="Investment name"
        name="name"
        placeholder="e.g. Nifty 50 Index Fund"
        defaultValue={investment?.name}
        required
        autoFocus
      />

      <SelectField label="Type" name="type" defaultValue={investment?.type ?? "mutual_fund"}>
        {INVESTMENT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </SelectField>

      <FormError message={error} />
      <SubmitButton pending={pending}>{investment ? "Save changes" : "Add investment"}</SubmitButton>
    </form>
  );
}

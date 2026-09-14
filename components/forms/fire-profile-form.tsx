"use client";

import { useState, useTransition } from "react";
import { saveFireProfile } from "@/lib/actions/fire";
import { Field, SubmitButton, FormError } from "@/components/ui/field";
import type { FireProfile } from "@/lib/types";

export function FireProfileForm({
  profile,
  onSuccess,
}: {
  profile?: FireProfile | null;
  onSuccess?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await saveFireProfile(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onSuccess?.();
    });
  }

  return (
    <form action={handleSubmit}>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Current age"
          name="current_age"
          type="number"
          min="1"
          placeholder="30"
          defaultValue={profile?.current_age}
          required
          autoFocus
        />
        <Field
          label="Target FI age"
          name="retirement_age"
          type="number"
          min="1"
          placeholder="45"
          defaultValue={profile?.retirement_age}
          required
        />
      </div>

      <Field
        label="Current monthly expenses (₹)"
        name="monthly_expenses"
        type="number"
        step="0.01"
        min="0"
        placeholder="50000"
        defaultValue={profile?.monthly_expenses}
        required
      />

      <Field
        label="Monthly investment (₹, optional)"
        name="monthly_investment"
        type="number"
        step="0.01"
        min="0"
        placeholder="30000"
        defaultValue={profile?.monthly_investment ?? ""}
      />
      <p className="mt-1.5 text-[12px] text-muted">How much you're currently adding to your investments each month.</p>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Expected return (%/yr)"
          name="expected_return_percent"
          type="number"
          step="0.1"
          min="0"
          placeholder="12"
          defaultValue={profile?.expected_return_percent ?? 12}
          required
        />
        <Field
          label="Inflation (%/yr)"
          name="inflation_percent"
          type="number"
          step="0.1"
          min="0"
          placeholder="6"
          defaultValue={profile?.inflation_percent ?? 6}
          required
        />
      </div>

      <Field
        label="Safe withdrawal rate (%/yr)"
        name="safe_withdrawal_percent"
        type="number"
        step="0.1"
        min="0.1"
        placeholder="4"
        defaultValue={profile?.safe_withdrawal_percent ?? 4}
        required
      />
      <p className="mt-1.5 text-[12px] text-muted">
        The share of your corpus you plan to draw each year in retirement — 4% is the common default.
      </p>

      <FormError message={error} />
      <SubmitButton pending={pending}>{profile ? "Save changes" : "Set up my FIRE plan"}</SubmitButton>
    </form>
  );
}

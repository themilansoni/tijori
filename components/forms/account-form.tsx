"use client";

import { useState, useTransition } from "react";
import { createAccount, updateAccount } from "@/lib/actions/accounts";
import { Field, SelectField, SubmitButton, FormError } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import { ACCOUNT_TYPES, type Account } from "@/lib/types";

export function AccountForm({ account }: { account?: Account }) {
  const { close } = useModal();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = account ? await updateAccount(formData) : await createAccount(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      close();
    });
  }

  return (
    <form action={handleSubmit}>
      {account && <input type="hidden" name="id" value={account.id} />}

      <Field
        label="Account name"
        name="name"
        placeholder="e.g. HDFC Bank"
        defaultValue={account?.name}
        required
        autoFocus
      />

      <SelectField label="Account type" name="type" defaultValue={account?.type ?? "bank"}>
        {ACCOUNT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </SelectField>

      <Field
        label="Opening balance (₹)"
        name="opening_balance"
        type="number"
        step="0.01"
        placeholder="0"
        defaultValue={account?.opening_balance ?? 0}
      />

      <Field
        label="Currency"
        name="currency"
        placeholder="INR"
        defaultValue={account?.currency ?? "INR"}
      />

      <FormError message={error} />
      <SubmitButton pending={pending}>{account ? "Save changes" : "Add account"}</SubmitButton>
    </form>
  );
}

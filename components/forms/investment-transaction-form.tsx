"use client";

import { useState, useTransition } from "react";
import { recordInvestmentTransaction } from "@/lib/actions/investments";
import { Field, SelectField, TextareaField, SubmitButton, FormError } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import type { Account, InvestmentHolding, InvestmentTxType } from "@/lib/types";

const TYPE_LABELS: Record<InvestmentTxType, string> = {
  buy: "Buy",
  sell: "Sell",
  dividend: "Dividend received",
  bonus: "Bonus shares",
  split: "Stock split",
};

export function InvestmentTransactionForm({
  holding,
  accounts,
}: {
  holding: InvestmentHolding;
  accounts: Account[];
}) {
  const { close } = useModal();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [type, setType] = useState<InvestmentTxType>("buy");

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await recordInvestmentTransaction(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      close();
    });
  }

  const needsQuantity = type === "buy" || type === "sell" || type === "bonus" || type === "split";
  const needsPrice = type === "buy" || type === "sell";

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="holding_id" value={holding.id} />

      <SelectField
        label="Type"
        name="type"
        value={type}
        onChange={(e) => setType(e.target.value as InvestmentTxType)}
      >
        {(Object.keys(TYPE_LABELS) as InvestmentTxType[]).map((t) => (
          <option key={t} value={t}>
            {TYPE_LABELS[t]}
          </option>
        ))}
      </SelectField>

      {needsQuantity && (
        <Field
          label={type === "split" ? "New total quantity after split" : "Quantity"}
          name="quantity"
          type="number"
          step="0.0001"
          min="0.0001"
          placeholder={type === "split" ? "100" : "10"}
          required
        />
      )}

      {needsPrice && (
        <Field label="Price per unit (₹)" name="price" type="number" step="0.01" min="0.01" placeholder="1720" required />
      )}

      {type === "dividend" && (
        <Field label="Amount received (₹)" name="total_amount" type="number" step="0.01" min="0.01" placeholder="500" required />
      )}

      {(type === "buy" || type === "sell") && (
        <Field label="Charges (₹, optional)" name="charges" type="number" step="0.01" min="0" placeholder="20" />
      )}

      <Field
        label="Date"
        name="transaction_date"
        type="date"
        defaultValue={new Date().toISOString().slice(0, 10)}
        required
      />

      {(type === "buy" || type === "sell" || type === "dividend") && (
        <SelectField label="Account (optional)" name="account_id" defaultValue="">
          <option value="">Not specified</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </SelectField>
      )}

      <TextareaField label="Note (optional)" name="note" rows={2} placeholder="Anything worth remembering" />

      <FormError message={error} />
      <SubmitButton pending={pending}>Save</SubmitButton>
    </form>
  );
}

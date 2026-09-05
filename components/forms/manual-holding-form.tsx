"use client";

import { useState, useTransition } from "react";
import { createManualHolding, updateManualHolding } from "@/lib/actions/investments";
import { Field, SelectField, SubmitButton, FormError } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import { ASSET_TYPES, type InvestmentHolding } from "@/lib/types";

export function ManualHoldingForm({ holding }: { holding?: InvestmentHolding }) {
  const { close } = useModal();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = holding ? await updateManualHolding(formData) : await createManualHolding(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      close();
    });
  }

  return (
    <form action={handleSubmit}>
      {holding && <input type="hidden" name="id" value={holding.id} />}

      <Field
        label="Investment name"
        name="instrument_name"
        placeholder="e.g. HDFC Bank"
        defaultValue={holding?.instrument_name}
        required
        autoFocus
      />

      <SelectField label="Type" name="asset_type" defaultValue={holding?.asset_type ?? "stock"}>
        {ASSET_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </SelectField>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Symbol (optional)" name="symbol" placeholder="HDFCBANK" defaultValue={holding?.symbol ?? ""} />
        <Field label="ISIN (optional)" name="isin" placeholder="INE040A01034" defaultValue={holding?.isin ?? ""} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Quantity"
          name="quantity"
          type="number"
          step="0.0001"
          min="0.0001"
          placeholder="50"
          defaultValue={holding?.quantity}
          required
        />
        <Field
          label="Avg. buy price (₹)"
          name="average_buy_price"
          type="number"
          step="0.01"
          min="0"
          placeholder="1450"
          defaultValue={holding?.average_buy_price}
          required
        />
      </div>

      <Field
        label="Current price (₹, optional)"
        name="current_price"
        type="number"
        step="0.01"
        min="0"
        placeholder="1720"
        defaultValue={holding?.current_price ?? ""}
      />
      <p className="mt-1.5 text-[12px] text-muted">
        Labeled &quot;Manual&quot; on the dashboard — update it yourself whenever you check the price.
      </p>

      <FormError message={error} />
      <SubmitButton pending={pending}>{holding ? "Save changes" : "Add investment"}</SubmitButton>
    </form>
  );
}

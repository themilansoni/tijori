"use client";

import { useState, useTransition } from "react";
import { createManualHolding, updateManualHolding } from "@/lib/actions/investments";
import { Field, SelectField, SubmitButton, FormError } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import { ASSET_TYPES, isQuantityBasedAsset, isInterestBearingAsset, type AssetType, type InvestmentHolding } from "@/lib/types";

export function ManualHoldingForm({
  holding,
  onSuccess,
}: {
  holding?: InvestmentHolding;
  onSuccess?: () => void;
}) {
  const { close } = useModal();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [assetType, setAssetType] = useState<AssetType>(holding?.asset_type ?? "equity");

  const quantityBased = isQuantityBasedAsset(assetType);
  const interestBearing = isInterestBearingAsset(assetType);

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = holding ? await updateManualHolding(formData) : await createManualHolding(formData);
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
      {holding && <input type="hidden" name="id" value={holding.id} />}

      <Field
        label="Investment name"
        name="instrument_name"
        placeholder={quantityBased ? "e.g. HDFC Bank" : "e.g. SBI FD — 3yr"}
        defaultValue={holding?.instrument_name}
        required
        autoFocus
      />

      <SelectField
        label="Type"
        name="asset_type"
        value={assetType}
        onChange={(e) => setAssetType(e.target.value as AssetType)}
      >
        {ASSET_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </SelectField>

      {quantityBased && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Symbol (optional)" name="symbol" placeholder="HDFCBANK" defaultValue={holding?.symbol ?? ""} />
          <Field label="ISIN (optional)" name="isin" placeholder="INE040A01034" defaultValue={holding?.isin ?? ""} />
        </div>
      )}

      {quantityBased ? (
        <>
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
        </>
      ) : (
        <>
          <input type="hidden" name="quantity" value="1" />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Invested amount (₹)"
              name="average_buy_price"
              type="number"
              step="0.01"
              min="0"
              placeholder="100000"
              defaultValue={holding?.average_buy_price}
              required
            />
            <Field
              label="Current value (₹)"
              name="current_price"
              type="number"
              step="0.01"
              min="0"
              placeholder="108000"
              defaultValue={holding?.current_price ?? ""}
              required
            />
          </div>
          <p className="mt-1.5 text-[12px] text-muted">
            Update the current value yourself whenever you check your passbook, statement, or an estimate.
          </p>

          {interestBearing && (
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Interest rate (%, optional)"
                name="interest_rate"
                type="number"
                step="0.01"
                min="0"
                placeholder="7.1"
                defaultValue={holding?.interest_rate ?? ""}
              />
              <Field
                label="Maturity date (optional)"
                name="maturity_date"
                type="date"
                defaultValue={holding?.maturity_date ?? ""}
              />
            </div>
          )}
        </>
      )}

      <FormError message={error} />
      <SubmitButton pending={pending}>{holding ? "Save changes" : "Add investment"}</SubmitButton>
    </form>
  );
}

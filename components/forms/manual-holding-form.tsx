"use client";

import { useState, useTransition } from "react";
import { createManualHolding, updateManualHolding } from "@/lib/actions/investments";
import { refreshHoldingPrice } from "@/lib/actions/prices";
import { Field, SelectField, SubmitButton, FormError } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import { EquitySearchField } from "@/components/forms/equity-search-field";
import type { NseEquity } from "@/lib/nse-search";
import {
  ASSET_TYPES,
  isQuantityBasedAsset,
  isInterestBearingAsset,
  isSimpleAmountAsset,
  type AssetType,
  type InvestmentHolding,
} from "@/lib/types";

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
  const [amount, setAmount] = useState(holding?.average_buy_price != null ? String(holding.average_buy_price) : "");
  const [instrumentName, setInstrumentName] = useState(holding?.instrument_name ?? "");
  const [symbol, setSymbol] = useState(holding?.symbol ?? "");
  const [isin, setIsin] = useState(holding?.isin ?? "");

  const quantityBased = isQuantityBasedAsset(assetType);
  const interestBearing = isInterestBearingAsset(assetType);
  const simpleAmount = isSimpleAmountAsset(assetType);
  const nseSearchable = assetType === "equity" || assetType === "etf";

  function handleEquitySelect(equity: NseEquity) {
    setInstrumentName(equity.name);
    setSymbol(equity.symbol);
    setIsin(equity.isin);
  }

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      if (holding) {
        const result = await updateManualHolding(formData);
        if ("error" in result) {
          setError(result.error);
          return;
        }
        if (nseSearchable && symbol) {
          await refreshHoldingPrice(holding.id, symbol);
        }
      } else {
        const result = await createManualHolding(formData);
        if ("error" in result) {
          setError(result.error);
          return;
        }
        if (nseSearchable && symbol) {
          await refreshHoldingPrice(result.holding.id, symbol);
        }
      }
      onSuccess?.();
      close();
    });
  }

  return (
    <form action={handleSubmit}>
      {holding && <input type="hidden" name="id" value={holding.id} />}

      {nseSearchable ? (
        <EquitySearchField value={instrumentName} onChange={setInstrumentName} onSelect={handleEquitySelect} />
      ) : (
        <Field
          label="Investment name"
          name="instrument_name"
          placeholder={quantityBased ? "e.g. HDFC Gold ETF" : simpleAmount ? "e.g. Cash at home" : "e.g. SBI FD — 3yr"}
          value={instrumentName}
          onChange={(e) => setInstrumentName(e.target.value)}
          required
          autoFocus
        />
      )}

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
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 [&>label]:!mt-0">
            <Field
              label="Symbol (optional)"
              name="symbol"
              placeholder="HDFCBANK"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
            />
            <Field
              label="ISIN (optional)"
              name="isin"
              placeholder="INE040A01034"
              value={isin}
              onChange={(e) => setIsin(e.target.value)}
            />
          </div>
          {nseSearchable && (
            <p className="mt-1.5 text-[12px] text-muted">
              {instrumentName && symbol
                ? "Filled in from the NSE listing — edit if needed."
                : "Search by company name above, or fill these in yourself. Symbol is needed for “Refresh prices” later."}
            </p>
          )}
        </>
      )}

      {quantityBased ? (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 [&>label]:!mt-0">
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
      ) : simpleAmount ? (
        <>
          <input type="hidden" name="quantity" value="1" />
          <input type="hidden" name="current_price" value={amount} />
          <Field
            label="Amount (₹)"
            name="average_buy_price"
            type="number"
            step="0.01"
            min="0"
            placeholder="25000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </>
      ) : (
        <>
          <input type="hidden" name="quantity" value="1" />
          <div className="mt-5 grid grid-cols-2 gap-3 [&>label]:!mt-0">
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
            <div className="mt-5 grid grid-cols-2 gap-3 [&>label]:!mt-0">
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

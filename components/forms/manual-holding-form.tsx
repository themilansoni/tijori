"use client";

import { useState, useTransition } from "react";
import { createManualHolding, updateManualHolding } from "@/lib/actions/investments";
import { refreshHoldingPrice, lookupEquityPrice } from "@/lib/actions/prices";
import { createHouseholdMember } from "@/lib/actions/household";
import { Field, SelectField, SubmitButton, FormError } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import { EquitySearchField } from "@/components/forms/equity-search-field";
import { MutualFundSearchField } from "@/components/forms/mutual-fund-search-field";
import type { NseEquity } from "@/lib/nse-search";
import type { MfScheme } from "@/lib/mf-search";
import {
  ASSET_TYPES,
  isQuantityBasedAsset,
  isInterestBearingAsset,
  isSimpleAmountAsset,
  isWeightTrackedAsset,
  type AssetType,
  type HouseholdMember,
  type InvestmentHolding,
} from "@/lib/types";

const ADD_INVESTOR_SENTINEL = "__add_investor__";

/** Gold used to be tracked as grams × price/gram (quantity-based). Existing holdings
 *  saved that way have no `weight_grams` and a quantity that isn't 1 — convert those
 *  to totals so editing them shows the right numbers under the new lump-sum model. */
function deriveGoldLumpDefaults(holding: InvestmentHolding | undefined): { grams: string; invested: string; current: string } {
  if (!holding) return { grams: "", invested: "", current: "" };
  const isLegacyGold = holding.asset_type === "gold" && holding.weight_grams == null && Number(holding.quantity) !== 1;
  if (isLegacyGold) {
    const qty = Number(holding.quantity);
    const invested = qty * Number(holding.average_buy_price);
    const current = holding.current_price != null ? qty * Number(holding.current_price) : null;
    return { grams: String(qty), invested: String(invested), current: current != null ? String(current) : "" };
  }
  return {
    grams: holding.weight_grams != null ? String(holding.weight_grams) : "",
    invested: String(holding.average_buy_price),
    current: holding.current_price != null ? String(holding.current_price) : "",
  };
}

export function ManualHoldingForm({
  holding,
  members: initialMembers = [],
  onSuccess,
}: {
  holding?: InvestmentHolding;
  members?: HouseholdMember[];
  onSuccess?: () => void;
}) {
  const { close } = useModal();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [assetType, setAssetType] = useState<AssetType | "">(holding?.asset_type ?? "");
  const [amount, setAmount] = useState(holding?.average_buy_price != null ? String(holding.average_buy_price) : "");
  const [instrumentName, setInstrumentName] = useState(holding?.instrument_name ?? "");
  const [symbol, setSymbol] = useState(holding?.symbol ?? "");
  const [isin, setIsin] = useState(holding?.isin ?? "");
  const [currentPrice, setCurrentPrice] = useState(holding?.current_price != null ? String(holding.current_price) : "");
  const [priceFetching, setPriceFetching] = useState(false);
  const goldDefaults = deriveGoldLumpDefaults(holding);
  const [weightGrams, setWeightGrams] = useState(goldDefaults.grams);
  const [lumpInvested, setLumpInvested] = useState(goldDefaults.invested);
  const [lumpCurrent, setLumpCurrent] = useState(goldDefaults.current);

  const [members, setMembers] = useState(initialMembers);
  const [ownerId, setOwnerId] = useState(holding?.owner_id ?? "");
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [memberError, setMemberError] = useState<string | undefined>();
  const [memberPending, startMemberTransition] = useTransition();

  function handleOwnerChange(value: string) {
    if (value === ADD_INVESTOR_SENTINEL) {
      setAddingMember(true);
      setMemberError(undefined);
      return;
    }
    setOwnerId(value);
  }

  function handleAddMember() {
    const name = newMemberName.trim();
    if (!name) {
      setMemberError("Name is required.");
      return;
    }
    setMemberError(undefined);

    const formData = new FormData();
    formData.set("name", name);

    startMemberTransition(async () => {
      const result = await createHouseholdMember(formData);
      if ("error" in result) {
        setMemberError(result.error);
        return;
      }
      setMembers((prev) => [...prev, result.member]);
      setOwnerId(result.member.id);
      setAddingMember(false);
      setNewMemberName("");
    });
  }

  const quantityBased = assetType ? isQuantityBasedAsset(assetType) : false;
  const interestBearing = assetType ? isInterestBearingAsset(assetType) : false;
  const simpleAmount = assetType ? isSimpleAmountAsset(assetType) : false;
  const weightTracked = assetType ? isWeightTrackedAsset(assetType) : false;
  const nseSearchable = assetType === "equity" || assetType === "etf";
  const mfSearchable = assetType === "mutual_fund";
  const searchable = nseSearchable || mfSearchable;

  function handleEquitySelect(equity: NseEquity) {
    setInstrumentName(equity.name);
    setSymbol(equity.symbol);
    setIsin(equity.isin);
    setPriceFetching(true);
    lookupEquityPrice(equity.symbol).then((price) => {
      setPriceFetching(false);
      if (price != null) setCurrentPrice(String(price));
    });
  }

  function handleMfSelect(scheme: MfScheme) {
    // AMFI's NAV file already carries today's price with the search result — no separate lookup needed.
    setInstrumentName(scheme.name);
    setSymbol(scheme.schemeCode);
    setIsin(scheme.isin ?? "");
    setCurrentPrice(String(scheme.nav));
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
        if (searchable && symbol) {
          await refreshHoldingPrice(holding.id, assetType as AssetType, symbol);
        }
      } else {
        const result = await createManualHolding(formData);
        if ("error" in result) {
          setError(result.error);
          return;
        }
        if (searchable && symbol) {
          await refreshHoldingPrice(result.holding.id, assetType as AssetType, symbol);
        }
      }
      onSuccess?.();
      close();
    });
  }

  return (
    <form action={handleSubmit}>
      {holding && <input type="hidden" name="id" value={holding.id} />}

      <SelectField
        label="Type"
        name="asset_type"
        value={assetType}
        onChange={(e) => setAssetType(e.target.value as AssetType)}
        required
        autoFocus={!holding}
      >
        {!assetType && (
          <option value="" disabled>
            Select an investment type…
          </option>
        )}
        {ASSET_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </SelectField>

      {!assetType && (
        <p className="mt-1.5 text-[12px] text-muted">Pick a type above, then search or fill in the details.</p>
      )}

      {assetType && (
        <>
          {nseSearchable ? (
            <EquitySearchField value={instrumentName} onChange={setInstrumentName} onSelect={handleEquitySelect} />
          ) : mfSearchable ? (
            <MutualFundSearchField value={instrumentName} onChange={setInstrumentName} onSelect={handleMfSelect} />
          ) : (
            <Field
              label="Investment name"
              name="instrument_name"
              placeholder={
                quantityBased
                  ? "e.g. HDFC Corp Bond"
                  : weightTracked
                  ? "e.g. Gold coins, locker"
                  : simpleAmount
                  ? "e.g. Cash at home"
                  : "e.g. SBI FD — 3yr"
              }
              value={instrumentName}
              onChange={(e) => setInstrumentName(e.target.value)}
              required
              autoFocus
            />
          )}

          <SelectField
            label="Investor (optional)"
            name="owner_id"
            value={ownerId}
            onChange={(e) => handleOwnerChange(e.target.value)}
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
            <option value={ADD_INVESTOR_SENTINEL} style={{ color: "var(--accent)" }}>
              + Add investor
            </option>
          </SelectField>

          {addingMember && (
            <div className="mt-2 rounded-[10px] border border-accent/35 bg-surface-2 p-3">
              <div className="text-[11.5px] font-medium tracking-[0.2px] text-muted">Add investor</div>
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="e.g. Me, or your name"
                autoFocus
                className="mt-2 w-full rounded-[9px] border border-border bg-surface px-[13px] py-2.5 text-[14px] text-foreground placeholder:text-muted/60 transition focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.16)]"
              />
              {memberError && <p className="mt-2 text-[12px] text-danger">{memberError}</p>}
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddingMember(false);
                    setNewMemberName("");
                    setMemberError(undefined);
                  }}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={memberPending}
                  onClick={handleAddMember}
                  className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground transition hover:brightness-105 disabled:opacity-60"
                >
                  {memberPending ? "Adding…" : "Add Investor"}
                </button>
              </div>
            </div>
          )}

          {quantityBased && (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3 [&>label]:!mt-0">
                <Field
                  label={mfSearchable ? "Scheme code (optional)" : "Symbol (optional)"}
                  name="symbol"
                  placeholder={mfSearchable ? "122639" : "HDFCBANK"}
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
              {searchable && (
                <p className="mt-1.5 text-[12px] text-muted">
                  {instrumentName && symbol
                    ? `Filled in from the ${mfSearchable ? "AMFI" : "NSE"} listing — edit if needed.`
                    : `Search by ${mfSearchable ? "fund" : "company"} name above, or fill these in yourself. ${
                        mfSearchable ? "Scheme code" : "Symbol"
                      } is needed for “Refresh prices” later.`}
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
                label={priceFetching ? "Current price (₹) — fetching live price…" : "Current price (₹, optional)"}
                name="current_price"
                type="number"
                step="0.01"
                min="0"
                placeholder="1720"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
              />
              <p className="mt-1.5 text-[12px] text-muted">
                {searchable
                  ? `Filled in live when you pick a ${mfSearchable ? "fund" : "company"} above — edit it yourself any time after.`
                  : "Labeled “Manual” on the dashboard — update it yourself whenever you check the price."}
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
              {weightTracked && (
                <Field
                  label="Grams (optional)"
                  name="weight_grams"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="10"
                  value={weightGrams}
                  onChange={(e) => setWeightGrams(e.target.value)}
                />
              )}
              <div className="mt-5 grid grid-cols-2 gap-3 [&>label]:!mt-0">
                <Field
                  label="Invested amount (₹)"
                  name="average_buy_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="100000"
                  value={lumpInvested}
                  onChange={(e) => setLumpInvested(e.target.value)}
                  required
                />
                <Field
                  label="Current value (₹)"
                  name="current_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="108000"
                  value={lumpCurrent}
                  onChange={(e) => setLumpCurrent(e.target.value)}
                  required
                />
              </div>
              <p className="mt-1.5 text-[12px] text-muted">
                {weightTracked
                  ? "Enter grams if you're tracking weight, or just leave it blank and fill in the total value."
                  : "Update the current value yourself whenever you check your passbook, statement, or an estimate."}
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
        </>
      )}

      <FormError message={error} />
      <SubmitButton pending={pending || priceFetching}>{holding ? "Save changes" : "Add investment"}</SubmitButton>
    </form>
  );
}

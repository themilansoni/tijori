import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { requireUid } from "@/lib/firebase/require-user";
import type { ActionResult } from "./categories";
import type { AssetType, InvestmentHolding, InvestmentTxType } from "@/lib/types";

const ASSET_TYPES: AssetType[] = ["stock", "etf", "mutual_fund", "bond", "gold", "fixed_deposit", "other"];
const TX_TYPES: InvestmentTxType[] = ["buy", "sell", "dividend", "bonus", "split"];

type ParsedHolding = {
  instrument_name: string;
  asset_type: AssetType;
  symbol: string | null;
  isin: string | null;
  exchange: string | null;
  quantity: number;
  average_buy_price: number;
  current_price: number | null;
};

function parseHoldingForm(formData: FormData): { error: string } | { data: ParsedHolding } {
  const instrument_name = String(formData.get("instrument_name") ?? "").trim();
  const asset_type = String(formData.get("asset_type") ?? "") as AssetType;
  const symbol = String(formData.get("symbol") ?? "").trim() || null;
  const isin = String(formData.get("isin") ?? "").trim() || null;
  const exchange = String(formData.get("exchange") ?? "").trim() || null;
  const quantity = Number(formData.get("quantity"));
  const average_buy_price = Number(formData.get("average_buy_price"));
  const currentPriceRaw = String(formData.get("current_price") ?? "").trim();
  const current_price = currentPriceRaw ? Number(currentPriceRaw) : null;

  if (!instrument_name) return { error: "Name is required." } as const;
  if (!ASSET_TYPES.includes(asset_type)) return { error: "Invalid asset type." } as const;
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: "Quantity must be greater than 0." } as const;
  if (!Number.isFinite(average_buy_price) || average_buy_price < 0) {
    return { error: "Average buy price must be 0 or more." } as const;
  }
  if (current_price != null && (!Number.isFinite(current_price) || current_price < 0)) {
    return { error: "Current price must be 0 or more." } as const;
  }

  return {
    data: { instrument_name, asset_type, symbol, isin, exchange, quantity, average_buy_price, current_price },
  } as const;
}

export type CreateHoldingResult = { error: string } | { ok: true; holding: InvestmentHolding };

export async function createManualHolding(formData: FormData): Promise<CreateHoldingResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  const parsed = parseHoldingForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const now = new Date().toISOString();
  const data = {
    user_id: auth.uid,
    source: "manual" as const,
    price_source: "manual" as const,
    ...parsed.data,
    is_active: true,
    last_price_update: null,
    created_at: now,
    updated_at: now,
  };
  const docRef = await addDoc(collection(db, "users", auth.uid, "investmentHoldings"), data);

  return { ok: true, holding: { id: docRef.id, ...data } as InvestmentHolding };
}

export async function updateManualHolding(formData: FormData): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing holding id." };

  const parsed = parseHoldingForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const ref = doc(db, "users", auth.uid, "investmentHoldings", id);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().source !== "manual") {
    return { error: "Broker-synced holdings are updated by syncing, not edited directly." };
  }

  await updateDoc(ref, { ...parsed.data, price_source: "manual", updated_at: new Date().toISOString() });
  return { ok: true };
}

export async function setHoldingActive(id: string, isActive: boolean): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  await updateDoc(doc(db, "users", auth.uid, "investmentHoldings", id), {
    is_active: isActive,
    updated_at: new Date().toISOString(),
  });
  return { ok: true };
}

export async function deleteHolding(id: string): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;
  const { uid } = auth;

  const txSnap = await getDocs(
    query(collection(db, "users", uid, "investmentTransactions"), where("holding_id", "==", id))
  );

  if (!txSnap.empty) {
    await updateDoc(doc(db, "users", uid, "investmentHoldings", id), {
      is_active: false,
      updated_at: new Date().toISOString(),
    });
    return { ok: true };
  }

  await deleteDoc(doc(db, "users", uid, "investmentHoldings", id));
  return { ok: true };
}

/**
 * Records a BUY/SELL/DIVIDEND/BONUS/SPLIT against a holding and mutates the
 * holding's quantity/average_buy_price accordingly (weighted-average cost
 * basis). Runs as a single Firestore transaction so the insert + holding
 * update are atomic — this is the one place this math lives.
 */
export async function recordInvestmentTransaction(formData: FormData): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;
  const { uid } = auth;

  const holding_id = String(formData.get("holding_id") ?? "");
  const type = String(formData.get("type") ?? "") as InvestmentTxType;
  const quantityRaw = String(formData.get("quantity") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();
  const charges = Number(formData.get("charges") ?? 0) || 0;
  const totalAmountRaw = String(formData.get("total_amount") ?? "").trim();
  const transaction_date = String(formData.get("transaction_date") ?? "");
  const account_id = String(formData.get("account_id") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!holding_id) return { error: "Missing holding." };
  if (!TX_TYPES.includes(type)) return { error: "Invalid transaction type." };
  if (!transaction_date) return { error: "Date is required." };

  const quantity = quantityRaw ? Number(quantityRaw) : null;
  const price = priceRaw ? Number(priceRaw) : null;

  if ((type === "buy" || type === "sell" || type === "bonus" || type === "split") && (!quantity || quantity <= 0)) {
    return { error: "Quantity is required for this transaction type." };
  }
  if ((type === "buy" || type === "sell") && (!price || price <= 0)) {
    return { error: "Price is required for buy/sell." };
  }

  const total_amount =
    totalAmountRaw && Number.isFinite(Number(totalAmountRaw))
      ? Number(totalAmountRaw)
      : quantity && price
      ? quantity * price + (type === "buy" ? charges : -charges)
      : 0;

  const holdingRef = doc(db, "users", uid, "investmentHoldings", holding_id);
  const now = new Date().toISOString();

  try {
    await runTransaction(db, async (t) => {
      const holdingSnap = await t.get(holdingRef);
      if (!holdingSnap.exists()) throw new Error("Holding not found.");
      const holding = holdingSnap.data() as InvestmentHolding;

      const currentQty = Number(holding.quantity);
      const currentAvg = Number(holding.average_buy_price);
      let nextQty = currentQty;
      let nextAvg = currentAvg;

      if (type === "buy" && quantity && price) {
        nextQty = currentQty + quantity;
        nextAvg = nextQty > 0 ? (currentQty * currentAvg + quantity * price) / nextQty : 0;
      } else if (type === "sell" && quantity) {
        nextQty = Math.max(0, currentQty - quantity);
        // Average cost of remaining shares is unchanged on a sell.
      } else if (type === "bonus" && quantity) {
        nextQty = currentQty + quantity;
        nextAvg = nextQty > 0 ? (currentQty * currentAvg) / nextQty : 0;
      } else if (type === "split" && quantity) {
        // `quantity` here is read as the new total quantity after the split.
        nextQty = quantity;
        nextAvg = nextQty > 0 ? (currentQty * currentAvg) / nextQty : 0;
      }
      // dividend: no change to quantity or cost basis.

      const txRef = doc(collection(db, "users", uid, "investmentTransactions"));
      t.set(txRef, {
        user_id: uid,
        holding_id,
        type,
        quantity,
        price,
        charges,
        total_amount,
        transaction_date,
        account_id,
        note,
        created_at: now,
        updated_at: now,
      });

      if (nextQty !== currentQty || nextAvg !== currentAvg) {
        t.update(holdingRef, { quantity: nextQty, average_buy_price: nextAvg, updated_at: now });
      }
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to record transaction." };
  }

  return { ok: true };
}

export async function deleteInvestmentTransaction(id: string): Promise<ActionResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;

  await deleteDoc(doc(db, "users", auth.uid, "investmentTransactions", id));
  return { ok: true };
}

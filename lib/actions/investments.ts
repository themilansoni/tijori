"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/authorize";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "./categories";
import type { AssetType, InvestmentHolding, InvestmentTxType } from "@/lib/types";

const PERMISSION_ERROR = "You don't have permission to do this.";
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
  const supabase = await createClient();
  if (!(await can("investments", "create", supabase))) return { error: PERMISSION_ERROR };

  const parsed = parseHoldingForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data, error } = await supabase
    .from("investment_holdings")
    .insert({
      user_id: user.id,
      source: "manual",
      price_source: "manual",
      ...parsed.data,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logAudit({
    action: "investment_holding.created",
    targetType: "investment_holding",
    targetId: data.id,
    summary: `Added holding "${parsed.data.instrument_name}"`,
  });

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { ok: true, holding: data as InvestmentHolding };
}

export async function updateManualHolding(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  if (!(await can("investments", "edit", supabase))) return { error: PERMISSION_ERROR };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing holding id." };

  const parsed = parseHoldingForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { data: existing } = await supabase
    .from("investment_holdings")
    .select("source")
    .eq("id", id)
    .single();
  if (existing?.source !== "manual") {
    return { error: "Broker-synced holdings are updated by syncing, not edited directly." };
  }

  const { error } = await supabase
    .from("investment_holdings")
    .update({ ...parsed.data, price_source: "manual" })
    .eq("id", id);
  if (error) return { error: error.message };

  await logAudit({
    action: "investment_holding.updated",
    targetType: "investment_holding",
    targetId: id,
    summary: `Updated holding "${parsed.data.instrument_name}"`,
  });

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setHoldingActive(id: string, isActive: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  if (!(await can("investments", "edit", supabase))) return { error: PERMISSION_ERROR };

  const { data: existing } = await supabase
    .from("investment_holdings")
    .select("instrument_name")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("investment_holdings").update({ is_active: isActive }).eq("id", id);
  if (error) return { error: error.message };

  await logAudit({
    action: isActive ? "investment_holding.reactivated" : "investment_holding.deactivated",
    targetType: "investment_holding",
    targetId: id,
    summary: `${isActive ? "Reactivated" : "Deactivated"} holding "${existing?.instrument_name ?? id}"`,
  });

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteHolding(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  if (!(await can("investments", "delete", supabase))) return { error: PERMISSION_ERROR };

  const { data: existing } = await supabase
    .from("investment_holdings")
    .select("instrument_name")
    .eq("id", id)
    .single();

  const { count } = await supabase
    .from("investment_transactions")
    .select("id", { count: "exact", head: true })
    .eq("holding_id", id);

  if (count && count > 0) {
    const { error } = await supabase.from("investment_holdings").update({ is_active: false }).eq("id", id);
    if (error) return { error: error.message };
    await logAudit({
      action: "investment_holding.deactivated",
      targetType: "investment_holding",
      targetId: id,
      summary: `Deactivated holding "${existing?.instrument_name ?? id}" (has transactions, could not delete)`,
    });
    revalidatePath("/investments");
    return { ok: true };
  }

  const { error } = await supabase.from("investment_holdings").delete().eq("id", id);
  if (error) return { error: error.message };

  await logAudit({
    action: "investment_holding.deleted",
    targetType: "investment_holding",
    targetId: id,
    summary: `Deleted holding "${existing?.instrument_name ?? id}"`,
  });

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Records a BUY/SELL/DIVIDEND/BONUS/SPLIT against a holding and mutates the
 * holding's quantity/average_buy_price accordingly (weighted-average cost
 * basis). This is the one place that logic lives — nothing else should
 * hand-roll quantity math.
 */
export async function recordInvestmentTransaction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  if (!(await can("investments", "edit", supabase))) return { error: PERMISSION_ERROR };

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

  const { data: holding } = await supabase
    .from("investment_holdings")
    .select("*")
    .eq("id", holding_id)
    .single<InvestmentHolding>();
  if (!holding) return { error: "Holding not found." };

  const { error: insertError, data: tx } = await supabase
    .from("investment_transactions")
    .insert({
      user_id: holding.user_id,
      holding_id,
      type,
      quantity,
      price,
      charges,
      total_amount,
      transaction_date,
      account_id,
      note,
    })
    .select()
    .single();
  if (insertError) return { error: insertError.message };

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

  if (nextQty !== currentQty || nextAvg !== currentAvg) {
    const { error: updateError } = await supabase
      .from("investment_holdings")
      .update({ quantity: nextQty, average_buy_price: nextAvg })
      .eq("id", holding_id);
    if (updateError) return { error: updateError.message };
  }

  await logAudit({
    action: `investment_holding.${type}`,
    targetType: "investment_holding",
    targetId: holding_id,
    summary: `Recorded ${type} on "${holding.instrument_name}"`,
    metadata: { transactionId: tx.id },
  });

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteInvestmentTransaction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  if (!(await can("investments", "delete", supabase))) return { error: PERMISSION_ERROR };

  const { data: existing } = await supabase
    .from("investment_transactions")
    .select("type, total_amount, holding_id")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("investment_transactions").delete().eq("id", id);
  if (error) return { error: error.message };

  await logAudit({
    action: "investment_transaction.deleted",
    targetType: "investment_holding",
    targetId: existing?.holding_id ?? id,
    summary: existing
      ? `Removed a ${existing.type} transaction of ₹${existing.total_amount} (holding quantity/price were not recalculated automatically)`
      : "Removed a transaction",
  });

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { ok: true };
}

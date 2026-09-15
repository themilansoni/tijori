import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { requireUid } from "@/lib/firebase/require-user";
import { lookupMfNav } from "@/lib/mf-search";
import type { AssetType, InvestmentHolding } from "@/lib/types";

// Small standalone Vercel serverless functions -- just proxy a Yahoo Finance
// quote lookup (NSE/BSE via .NS/.BO suffix) and an AMFI NAV lookup (for
// mutual funds), so the browser isn't blocked by CORS. No auth, no user data
// touches either endpoint; the Firestore write happens from here, using
// this session's own normal permissions. `symbol` doubles as the AMFI
// scheme code for mutual_fund holdings.
const PRICE_PROXY_URL = "https://tijori-price-proxy.vercel.app/api/price";
const MAX_HOLDINGS_PER_REFRESH = 30;
const PRICEABLE_TYPES: AssetType[] = ["equity", "etf", "mutual_fund"];

function isPriceableType(type: AssetType): boolean {
  return PRICEABLE_TYPES.includes(type);
}

async function fetchEquityPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(`${PRICE_PROXY_URL}?symbol=${encodeURIComponent(symbol)}`);
    const data = await res.json();
    return res.ok && typeof data.price === "number" ? data.price : null;
  } catch {
    return null;
  }
}

async function fetchPrice(assetType: AssetType, symbol: string): Promise<number | null> {
  return assetType === "mutual_fund" ? lookupMfNav(symbol) : fetchEquityPrice(symbol);
}

/** Read-only price lookup — no Firestore write, no auth needed. Used to pre-fill "Current price" the moment a company/fund is picked from search, before the holding even exists yet. */
export async function lookupEquityPrice(symbol: string): Promise<number | null> {
  return fetchEquityPrice(symbol);
}

/** Fetches and saves the price for one holding — used right after adding/editing an equity/ETF/mutual fund so it's priced immediately, without waiting for a manual refresh. */
export async function refreshHoldingPrice(holdingId: string, assetType: AssetType, symbol: string): Promise<number | null> {
  const auth = requireUid();
  if ("error" in auth) return null;

  const price = await fetchPrice(assetType, symbol);
  if (price == null) return null;

  const now = new Date().toISOString();
  await updateDoc(doc(db, "users", auth.uid, "investmentHoldings", holdingId), {
    current_price: price,
    last_price_update: now,
    updated_at: now,
  });
  return price;
}

export type RefreshPricesResult = { error: string } | { ok: true; updated: string[]; skipped: string[] };

export async function refreshEquityPrices(): Promise<RefreshPricesResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;
  const { uid } = auth;

  const snap = await getDocs(collection(db, "users", uid, "investmentHoldings"));
  const eligible = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as InvestmentHolding)
    .filter((h) => h.is_active && isPriceableType(h.asset_type) && h.symbol)
    .slice(0, MAX_HOLDINGS_PER_REFRESH);

  if (eligible.length === 0) {
    return { error: "No priceable holdings with a symbol set — add one on the holding first." };
  }

  const updated: string[] = [];
  const skipped: string[] = [];
  const now = new Date().toISOString();

  await Promise.all(
    eligible.map(async (h) => {
      const price = await fetchPrice(h.asset_type, h.symbol!);
      if (price == null) {
        skipped.push(h.instrument_name);
        return;
      }
      await updateDoc(doc(db, "users", uid, "investmentHoldings", h.id), {
        current_price: price,
        last_price_update: now,
        updated_at: now,
      });
      updated.push(h.instrument_name);
    })
  );

  return { ok: true, updated, skipped };
}

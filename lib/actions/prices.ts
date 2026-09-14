import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { requireUid } from "@/lib/firebase/require-user";
import type { InvestmentHolding } from "@/lib/types";

// Small standalone Vercel serverless function -- just proxies a Yahoo
// Finance quote lookup (NSE/BSE via .NS/.BO suffix) so the browser isn't
// blocked by CORS. No auth, no user data touches it; the Firestore write
// happens from here, using this session's own normal permissions.
const PRICE_PROXY_URL = "https://tijori-price-proxy.vercel.app/api/price";
const MAX_HOLDINGS_PER_REFRESH = 30;

export type RefreshPricesResult = { error: string } | { ok: true; updated: string[]; skipped: string[] };

export async function refreshEquityPrices(): Promise<RefreshPricesResult> {
  const auth = requireUid();
  if ("error" in auth) return auth;
  const { uid } = auth;

  const snap = await getDocs(collection(db, "users", uid, "investmentHoldings"));
  const eligible = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as InvestmentHolding)
    .filter((h) => h.is_active && (h.asset_type === "equity" || h.asset_type === "etf") && h.symbol)
    .slice(0, MAX_HOLDINGS_PER_REFRESH);

  if (eligible.length === 0) {
    return { error: "No equity/ETF holdings with a symbol set — add one on the holding first." };
  }

  const updated: string[] = [];
  const skipped: string[] = [];
  const now = new Date().toISOString();

  await Promise.all(
    eligible.map(async (h) => {
      try {
        const res = await fetch(`${PRICE_PROXY_URL}?symbol=${encodeURIComponent(h.symbol!)}`);
        const data = await res.json();
        if (!res.ok || typeof data.price !== "number") {
          skipped.push(h.instrument_name);
          return;
        }
        await updateDoc(doc(db, "users", uid, "investmentHoldings", h.id), {
          current_price: data.price,
          last_price_update: now,
          updated_at: now,
        });
        updated.push(h.instrument_name);
      } catch {
        skipped.push(h.instrument_name);
      }
    })
  );

  return { ok: true, updated, skipped };
}

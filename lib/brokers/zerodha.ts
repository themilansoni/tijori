import "server-only";
import { createHash } from "crypto";
import type { BrokerAdapter, BrokerConnectResult, NormalizedHolding } from "./types";

const KITE_LOGIN_URL = "https://kite.zerodha.com/connect/login";
const KITE_API_BASE = "https://api.kite.trade";

/**
 * Kite Connect adapter. Requires a paid Kite Connect app (₹2,000/month,
 * billed by Zerodha directly to the developer account) — this only
 * implements the parts that plan actually exposes: session exchange and
 * equity holdings. Kite Connect access tokens expire daily (Zerodha's own
 * platform limit, not something this adapter can extend), so callers
 * should expect `connect()` to be re-run roughly once a day, not treated
 * as a one-time setup step.
 */
export class ZerodhaAdapter implements BrokerAdapter {
  readonly broker = "zerodha" as const;

  private get apiKey() {
    return process.env.ZERODHA_API_KEY;
  }

  private get apiSecret() {
    return process.env.ZERODHA_API_SECRET;
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiSecret);
  }

  getLoginUrl(): string {
    if (!this.apiKey) throw new Error("Zerodha isn't configured yet (missing ZERODHA_API_KEY).");
    return `${KITE_LOGIN_URL}?v=3&api_key=${encodeURIComponent(this.apiKey)}`;
  }

  async connect(requestToken: string): Promise<BrokerConnectResult> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error("Zerodha isn't configured yet (missing ZERODHA_API_KEY/ZERODHA_API_SECRET).");
    }

    const checksum = createHash("sha256")
      .update(this.apiKey + requestToken + this.apiSecret)
      .digest("hex");

    const res = await fetch(`${KITE_API_BASE}/session/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Kite-Version": "3",
      },
      body: new URLSearchParams({
        api_key: this.apiKey,
        request_token: requestToken,
        checksum,
      }),
    });

    const json = await res.json();
    if (!res.ok || json.status !== "success") {
      throw new Error(json?.message ?? "Zerodha rejected the login — please reconnect.");
    }

    return { accessToken: json.data.access_token, brokerUserId: json.data.user_id };
  }

  async getHoldings(accessToken: string): Promise<NormalizedHolding[]> {
    if (!this.apiKey) throw new Error("Zerodha isn't configured yet (missing ZERODHA_API_KEY).");

    const res = await fetch(`${KITE_API_BASE}/portfolio/holdings`, {
      headers: {
        Authorization: `token ${this.apiKey}:${accessToken}`,
        "X-Kite-Version": "3",
      },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || json.status !== "success") {
      if (res.status === 403) throw new Error("Zerodha session expired — please reconnect.");
      throw new Error(json?.message ?? "Couldn't fetch holdings from Zerodha.");
    }

    type KiteHolding = {
      tradingsymbol: string;
      exchange: string;
      isin: string | null;
      quantity: number;
      average_price: number;
      last_price: number | null;
    };

    return (json.data as KiteHolding[]).map((h) => ({
      symbol: h.tradingsymbol,
      isin: h.isin || null,
      instrumentName: h.tradingsymbol,
      exchange: h.exchange,
      assetType: "stock" as const,
      quantity: Number(h.quantity),
      averageBuyPrice: Number(h.average_price),
      currentPrice: h.last_price != null ? Number(h.last_price) : null,
    }));
  }
}

import type { AssetType, BrokerName } from "@/lib/types";

/** A holding as reported by a broker, before it's written into investment_holdings. */
export type NormalizedHolding = {
  symbol: string;
  isin: string | null;
  instrumentName: string;
  exchange: string | null;
  assetType: AssetType;
  quantity: number;
  averageBuyPrice: number;
  currentPrice: number | null;
};

export type BrokerConnectResult = {
  accessToken: string;
  brokerUserId: string;
};

/**
 * One implementation per broker. The rest of the app (Server Actions, UI)
 * only ever talks to this interface — broker-specific request/response
 * shapes stay inside the adapter so a second broker can be added without
 * touching anything else.
 */
export interface BrokerAdapter {
  readonly broker: BrokerName;
  readonly isConfigured: boolean;
  /** URL to send the user to for the broker's own login/consent screen. */
  getLoginUrl(): string;
  /** Exchange the callback's one-time request token for a session access token. */
  connect(requestToken: string): Promise<BrokerConnectResult>;
  /** Current holdings, normalized to Tijori's shape. */
  getHoldings(accessToken: string): Promise<NormalizedHolding[]>;
}

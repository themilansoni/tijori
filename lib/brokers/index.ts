import "server-only";
import type { BrokerName } from "@/lib/types";
import type { BrokerAdapter } from "./types";
import { ZerodhaAdapter } from "./zerodha";

const adapters: Partial<Record<BrokerName, BrokerAdapter>> = {
  zerodha: new ZerodhaAdapter(),
  // Upstox intentionally not implemented yet — add an UpstoxAdapter here
  // once there's a real developer app to test against.
};

export function getBrokerAdapter(broker: BrokerName): BrokerAdapter {
  const adapter = adapters[broker];
  if (!adapter) throw new Error(`${broker} isn't wired up yet.`);
  return adapter;
}

export const SUPPORTED_BROKERS: { value: BrokerName; label: string }[] = [
  { value: "zerodha", label: "Zerodha (Kite Connect)" },
];

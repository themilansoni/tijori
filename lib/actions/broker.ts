"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/authorize";
import { logAudit } from "@/lib/audit";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { getBrokerAdapter } from "@/lib/brokers";
import type { ActionResult } from "./categories";
import type { BrokerConnection, BrokerName } from "@/lib/types";

const PERMISSION_ERROR = "You don't have permission to do this.";

export type SyncResult =
  | { error: string }
  | { ok: true; holdingsSynced: number };

/**
 * Fetches the current holdings from a connected broker and upserts them into
 * investment_holdings, keyed on (broker_connection_id, isin) so re-running
 * this never creates duplicates — it just refreshes quantity/price.
 */
export async function syncBrokerHoldings(broker: BrokerName): Promise<SyncResult> {
  const supabase = await createClient();
  if (!(await can("investments", "sync", supabase))) return { error: PERMISSION_ERROR };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: connection } = await supabase
    .from("broker_connections")
    .select("*")
    .eq("broker", broker)
    .single<BrokerConnection & { encrypted_access_token: string | null }>();

  if (!connection || !connection.encrypted_access_token) {
    return { error: `${broker} isn't connected yet.` };
  }

  const adapter = getBrokerAdapter(broker);
  let accessToken: string;
  try {
    accessToken = decryptSecret(connection.encrypted_access_token);
  } catch {
    return { error: "Stored connection is corrupted — please reconnect." };
  }

  try {
    const holdings = await adapter.getHoldings(accessToken);

    for (const h of holdings) {
      await supabase.from("investment_holdings").upsert(
        {
          user_id: user.id,
          broker_connection_id: connection.id,
          source: broker,
          instrument_name: h.instrumentName,
          asset_type: h.assetType,
          symbol: h.symbol,
          isin: h.isin,
          exchange: h.exchange,
          quantity: h.quantity,
          average_buy_price: h.averageBuyPrice,
          current_price: h.currentPrice,
          price_source: broker,
          last_price_update: new Date().toISOString(),
          is_active: true,
        },
        { onConflict: "broker_connection_id,isin" }
      );
    }

    await supabase
      .from("broker_connections")
      .update({ status: "connected", last_synced_at: new Date().toISOString(), last_error: null })
      .eq("id", connection.id);

    await logAudit({
      action: "broker.synced",
      targetType: "broker_connection",
      targetId: connection.id,
      summary: `Synced ${holdings.length} holding(s) from ${broker}`,
    });

    revalidatePath("/investments");
    revalidatePath("/dashboard");
    return { ok: true, holdingsSynced: holdings.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed.";
    const expired = message.toLowerCase().includes("expired") || message.toLowerCase().includes("token");
    await supabase
      .from("broker_connections")
      .update({ status: expired ? "expired" : "error", last_error: message })
      .eq("id", connection.id);
    revalidatePath("/investments");
    return { error: message };
  }
}

export async function disconnectBroker(connectionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  if (!(await can("investments", "connect", supabase))) return { error: PERMISSION_ERROR };

  const { error } = await supabase
    .from("broker_connections")
    .update({
      status: "disconnected",
      encrypted_access_token: null,
      connected_at: null,
    })
    .eq("id", connectionId);
  if (error) return { error: error.message };

  await logAudit({
    action: "broker.disconnected",
    targetType: "broker_connection",
    targetId: connectionId,
    summary: "Disconnected broker",
  });

  revalidatePath("/investments");
  return { ok: true };
}

/**
 * Called only from the OAuth callback route (not a form action) — exchanges
 * the broker's one-time request token for an access token, stores it
 * encrypted, and runs an initial sync. Kept here (rather than inline in the
 * route handler) so the connect+sync sequence is unit-testable independent
 * of Next.js routing.
 */
export async function completeBrokerConnection(
  broker: BrokerName,
  requestToken: string
): Promise<SyncResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (!(await can("investments", "connect", supabase))) return { error: PERMISSION_ERROR };

  const adapter = getBrokerAdapter(broker);

  try {
    const { accessToken, brokerUserId } = await adapter.connect(requestToken);

    const { data: connection, error } = await supabase
      .from("broker_connections")
      .upsert(
        {
          user_id: user.id,
          broker,
          status: "connected",
          encrypted_access_token: encryptSecret(accessToken),
          broker_user_id: brokerUserId,
          connected_at: new Date().toISOString(),
          last_error: null,
        },
        { onConflict: "user_id,broker" }
      )
      .select()
      .single();

    if (error || !connection) return { error: error?.message ?? "Couldn't save the connection." };

    await logAudit({
      action: "broker.connected",
      targetType: "broker_connection",
      targetId: connection.id,
      summary: `Connected ${broker}`,
    });

    return syncBrokerHoldings(broker);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Connection failed." };
  }
}

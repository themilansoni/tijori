"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Button } from "@/components/ui/button";
import { syncBrokerHoldings, disconnectBroker } from "@/lib/actions/broker";
import type { BrokerConnection } from "@/lib/types";

export function BrokerConnectionCard({
  connection,
  configured,
  canConnect,
  canSync,
  notice,
}: {
  connection: BrokerConnection | null;
  configured: boolean;
  canConnect: boolean;
  canSync: boolean;
  notice?: { type: "error" | "success"; message: string };
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [lastSync, setLastSync] = useState<string | undefined>();

  function handleSync() {
    setError(undefined);
    setLastSync(undefined);
    startTransition(async () => {
      const result = await syncBrokerHoldings("zerodha");
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setLastSync(`Synced ${result.holdingsSynced} holding${result.holdingsSynced === 1 ? "" : "s"}.`);
    });
  }

  const status = connection?.status ?? "disconnected";

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted">Broker Connection</h2>
      </div>

      {notice && (
        <div
          className={`mb-3 rounded-[10px] border px-3.5 py-2.5 text-[13px] ${
            notice.type === "error" ? "border-danger/30 bg-danger/8 text-danger" : "border-success/30 bg-success/8 text-success"
          }`}
        >
          {notice.message}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`h-2 w-2 rounded-full ${
              status === "connected" ? "bg-success" : status === "expired" || status === "error" ? "bg-danger" : "bg-muted"
            }`}
          />
          <div>
            <div className="text-sm font-medium">
              Zerodha —{" "}
              {status === "connected"
                ? "Connected"
                : status === "expired"
                ? "Session expired"
                : status === "error"
                ? "Sync error"
                : "Not connected"}
            </div>
            {connection?.last_synced_at && (
              <div className="text-[12px] text-muted">
                Last synced {format(parseISO(connection.last_synced_at), "d MMM, h:mm a")}
              </div>
            )}
            {!configured && (
              <div className="text-[12px] text-muted">Zerodha isn&apos;t configured on this deployment yet.</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {(status === "disconnected" || status === "expired") && canConnect && configured && (
            <a href="/api/broker/zerodha/login">
              <Button size="sm">{status === "expired" ? "Reconnect" : "Connect Zerodha"}</Button>
            </a>
          )}
          {status === "connected" && canSync && (
            <Button size="sm" disabled={pending} onClick={handleSync}>
              {pending ? "Syncing…" : "Sync Now"}
            </Button>
          )}
          {connection && status !== "disconnected" && canConnect && (
            <ConfirmButton
              className="text-muted hover:text-foreground"
              confirmMessage="Disconnect Zerodha? Your synced holdings stay, but they'll stop updating until you reconnect."
              action={() => disconnectBroker(connection.id)}
            >
              Disconnect
            </ConfirmButton>
          )}
        </div>
      </div>

      {(error || connection?.last_error) && (
        <p className="mt-2.5 text-[12.5px] text-danger">{error ?? connection?.last_error}</p>
      )}
      {lastSync && <p className="mt-2.5 text-[12.5px] text-success">{lastSync}</p>}

      <p className="mt-3 text-[11.5px] text-muted">
        Kite Connect sessions expire once a day (a Zerodha platform limit) — you&apos;ll need to reconnect
        periodically, not just the first time.
      </p>
    </section>
  );
}

import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/authorize";
import { getBrokerAdapter } from "@/lib/brokers";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { ManualHoldingForm } from "@/components/forms/manual-holding-form";
import { HoldingsTable } from "./holdings-table";
import { BrokerConnectionCard } from "./broker-connection-card";
import { AllocationBreakdown } from "./allocation-breakdown";
import { TijoriMark } from "@/components/ui/tijori-mark";
import { calculateTotalPortfolioValue, calculatePortfolioAllocation, fmtCurrency } from "@/lib/calculations";
import type { Account, BrokerConnection, InvestmentHolding } from "@/lib/types";

export default async function InvestmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const [
    { data: holdingsRaw },
    { data: accountsRaw },
    { data: connectionRaw },
    canCreate,
    canConnect,
    canSync,
  ] = await Promise.all([
    supabase.from("investment_holdings").select("*").order("created_at"),
    supabase.from("accounts").select("*").eq("is_active", true).order("name"),
    supabase.from("broker_connections").select("*").eq("broker", "zerodha").maybeSingle(),
    can("investments", "create", supabase),
    can("investments", "connect", supabase),
    can("investments", "sync", supabase),
  ]);

  const holdings = (holdingsRaw ?? []) as InvestmentHolding[];
  const accounts = (accountsRaw ?? []) as Account[];
  const connection = (connectionRaw ?? null) as BrokerConnection | null;
  const zerodhaConfigured = getBrokerAdapter("zerodha").isConfigured;

  const totals = calculateTotalPortfolioValue(holdings);
  const allocation = calculatePortfolioAllocation(holdings);

  const notice = sp.broker_error
    ? { type: "error" as const, message: sp.broker_error }
    : sp.broker_connected
    ? { type: "success" as const, message: `Zerodha connected — synced ${sp.synced ?? 0} holding(s).` }
    : undefined;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Investments</h1>
        {canCreate && (
          <Modal trigger={<Button>+ Add investment</Button>} title="Add investment">
            <ManualHoldingForm />
          </Modal>
        )}
      </div>
      <p className="mt-2 text-muted">
        Connect a broker for holdings that sync automatically, or track anything else by hand — every
        figure here is computed from quantity × price, never estimated.
      </p>

      {holdings.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Total Invested" value={fmtCurrency(totals.totalInvested)} />
          <StatCard label="Current Value" value={fmtCurrency(totals.currentValue)} tone="accent" />
          <StatCard
            label="Unrealized P&L"
            value={fmtCurrency(totals.unrealizedPnL)}
            sub={totals.pricedInvested > 0 ? `${totals.unrealizedPnLPercent >= 0 ? "+" : ""}${totals.unrealizedPnLPercent.toFixed(2)}%` : undefined}
            tone={totals.unrealizedPnL < 0 ? "danger" : "success"}
          />
          <StatCard
            label="Unpriced Holdings"
            value={String(totals.unpricedCount)}
            sub={totals.unpricedCount > 0 ? "Add a current price" : "All priced"}
          />
        </div>
      )}

      <div className="mt-6">
        <BrokerConnectionCard
          connection={connection}
          configured={zerodhaConfigured}
          canConnect={canConnect}
          canSync={canSync}
          notice={notice}
        />
      </div>

      <div className="mt-6">
        {holdings.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-border p-12 text-center">
            <TijoriMark variant="bare" tone="ink" size={30} className="mx-auto opacity-40" />
            <p className="mt-4 font-medium text-foreground">No investments yet</p>
            <p className="mt-1 text-[13.5px] text-muted">
              Connect Zerodha above, or add a stock, fund, or other investment by hand.
            </p>
            <div className="mt-4">
              <Modal trigger={<Button>+ Add investment</Button>} title="Add investment">
                <ManualHoldingForm />
              </Modal>
            </div>
          </div>
        ) : (
          <HoldingsTable holdings={holdings} accounts={accounts} />
        )}
      </div>

      {allocation.length > 0 && (
        <div className="mt-6">
          <AllocationBreakdown allocation={allocation} />
        </div>
      )}
    </div>
  );
}

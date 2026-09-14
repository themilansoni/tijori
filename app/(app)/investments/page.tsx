"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { mapDocs } from "@/lib/firebase/collection-helpers";
import { useAuth } from "@/lib/auth-context";
import { refreshEquityPrices } from "@/lib/actions/prices";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { ManualHoldingForm } from "@/components/forms/manual-holding-form";
import { HoldingsTable } from "./holdings-table";
import { AllocationBreakdown } from "./allocation-breakdown";
import { calculateTotalPortfolioValue, calculatePortfolioAllocation, fmtCurrency } from "@/lib/calculations";
import type { Account, HouseholdMember, InvestmentHolding } from "@/lib/types";

const UNASSIGNED = "__unassigned__";

export default function InvestmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [holdings, setHoldings] = useState<InvestmentHolding[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [refreshing, startRefresh] = useTransition();
  const [refreshMessage, setRefreshMessage] = useState<string | undefined>();
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null); // null = everyone

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const uid = user.uid;
    const [holdingSnap, accSnap, memberSnap] = await Promise.all([
      getDocs(collection(db, "users", uid, "investmentHoldings")),
      getDocs(collection(db, "users", uid, "accounts")),
      getDocs(collection(db, "users", uid, "householdMembers")),
    ]);
    setHoldings(mapDocs<InvestmentHolding>(holdingSnap).sort((a, b) => a.created_at.localeCompare(b.created_at)));
    setAccounts(
      mapDocs<Account>(accSnap)
        .filter((a) => a.is_active)
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setMembers(mapDocs<HouseholdMember>(memberSnap).sort((a, b) => a.created_at.localeCompare(b.created_at)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  function handleRefreshPrices() {
    setRefreshMessage(undefined);
    startRefresh(async () => {
      const result = await refreshEquityPrices();
      if ("error" in result) {
        setRefreshMessage(result.error);
        return;
      }
      setRefreshMessage(
        result.skipped.length > 0
          ? `Updated ${result.updated.length} — couldn't find a price for ${result.skipped.join(", ")}.`
          : `Updated ${result.updated.length} price${result.updated.length === 1 ? "" : "s"}.`
      );
      await load();
    });
  }

  if (authLoading || loading) return null;

  const visibleHoldings =
    ownerFilter == null
      ? holdings
      : ownerFilter === UNASSIGNED
      ? holdings.filter((h) => !h.owner_id)
      : holdings.filter((h) => h.owner_id === ownerFilter);

  const totals = calculateTotalPortfolioValue(visibleHoldings);
  const allocation = calculatePortfolioAllocation(visibleHoldings);
  const hasRefreshableHoldings = holdings.some(
    (h) => h.is_active && (h.asset_type === "equity" || h.asset_type === "etf") && h.symbol
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Investments</h1>
        <div className="flex items-center gap-2.5">
          {hasRefreshableHoldings && (
            <Button variant="ghost" onClick={handleRefreshPrices} disabled={refreshing}>
              {refreshing ? "Refreshing…" : "Refresh prices"}
            </Button>
          )}
          <Modal trigger={<Button>+ Add investment</Button>} title="Add investment">
            <ManualHoldingForm members={members} onSuccess={load} />
          </Modal>
        </div>
      </div>
      {refreshMessage && <p className="mt-2 text-[13px] text-muted">{refreshMessage}</p>}
      <p className="mt-2 text-muted">
        Track equity, funds, gold, FDs, RDs, PF, PPF, real estate, and anything else you hold —
        every figure here is computed from what you enter, never estimated.
      </p>

      {members.length > 0 && holdings.length > 0 && (
        <NetWorthByPerson holdings={holdings} members={members} ownerFilter={ownerFilter} onSelect={setOwnerFilter} />
      )}

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
        {visibleHoldings.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-border p-12 text-center">
            <p className="mt-4 font-medium text-foreground">
              {holdings.length === 0 ? "No investments yet" : "No investments for this person"}
            </p>
            <p className="mt-1 text-[13.5px] text-muted">Add a stock, fund, deposit, or any other investment by hand.</p>
            <div className="mt-4">
              <Modal trigger={<Button>+ Add investment</Button>} title="Add investment">
                <ManualHoldingForm members={members} onSuccess={load} />
              </Modal>
            </div>
          </div>
        ) : (
          <HoldingsTable holdings={visibleHoldings} accounts={accounts} members={members} onChanged={load} />
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

function NetWorthByPerson({
  holdings,
  members,
  ownerFilter,
  onSelect,
}: {
  holdings: InvestmentHolding[];
  members: HouseholdMember[];
  ownerFilter: string | null;
  onSelect: (ownerId: string | null) => void;
}) {
  const householdTotal = calculateTotalPortfolioValue(holdings).currentValue;
  const hasUnassigned = holdings.some((h) => !h.owner_id);

  const rows = [
    ...members.map((m) => ({
      id: m.id,
      name: m.name,
      value: calculateTotalPortfolioValue(holdings.filter((h) => h.owner_id === m.id)).currentValue,
    })),
    ...(hasUnassigned
      ? [{ id: UNASSIGNED, name: "Unassigned", value: calculateTotalPortfolioValue(holdings.filter((h) => !h.owner_id)).currentValue }]
      : []),
  ];

  return (
    <div className="mt-5 rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted">Net Worth by Person</h2>
        <span className="text-xs text-muted">Household: {fmtCurrency(householdTotal)}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition ${
            ownerFilter == null ? "bg-accent text-accent-foreground" : "bg-surface-2 text-muted hover:text-foreground"
          }`}
        >
          All · {fmtCurrency(householdTotal)}
        </button>
        {rows.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition ${
              ownerFilter === r.id ? "bg-accent text-accent-foreground" : "bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            {r.name} · {fmtCurrency(r.value)}
          </button>
        ))}
      </div>
    </div>
  );
}

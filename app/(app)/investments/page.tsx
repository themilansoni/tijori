"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { mapDocs } from "@/lib/firebase/collection-helpers";
import { useAuth } from "@/lib/auth-context";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { ManualHoldingForm } from "@/components/forms/manual-holding-form";
import { HoldingsTable } from "./holdings-table";
import { AllocationBreakdown } from "./allocation-breakdown";
import { calculateTotalPortfolioValue, calculatePortfolioAllocation, fmtCurrency } from "@/lib/calculations";
import type { Account, InvestmentHolding } from "@/lib/types";

export default function InvestmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [holdings, setHoldings] = useState<InvestmentHolding[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const uid = user.uid;
    const [holdingSnap, accSnap] = await Promise.all([
      getDocs(collection(db, "users", uid, "investmentHoldings")),
      getDocs(collection(db, "users", uid, "accounts")),
    ]);
    setHoldings(mapDocs<InvestmentHolding>(holdingSnap).sort((a, b) => a.created_at.localeCompare(b.created_at)));
    setAccounts(
      mapDocs<Account>(accSnap)
        .filter((a) => a.is_active)
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading || loading) return null;

  const totals = calculateTotalPortfolioValue(holdings);
  const allocation = calculatePortfolioAllocation(holdings);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Investments</h1>
        <Modal trigger={<Button>+ Add investment</Button>} title="Add investment">
          <ManualHoldingForm onSuccess={load} />
        </Modal>
      </div>
      <p className="mt-2 text-muted">
        Track stocks, funds, and other investments by hand — every figure here is computed from
        quantity × price, never estimated.
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
        {holdings.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-border p-12 text-center">
            <p className="mt-4 font-medium text-foreground">No investments yet</p>
            <p className="mt-1 text-[13.5px] text-muted">Add a stock, fund, or other investment by hand.</p>
            <div className="mt-4">
              <Modal trigger={<Button>+ Add investment</Button>} title="Add investment">
                <ManualHoldingForm onSuccess={load} />
              </Modal>
            </div>
          </div>
        ) : (
          <HoldingsTable holdings={holdings} accounts={accounts} onChanged={load} />
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

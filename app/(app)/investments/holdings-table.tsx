"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ManualHoldingForm } from "@/components/forms/manual-holding-form";
import { InvestmentTransactionForm } from "@/components/forms/investment-transaction-form";
import { setHoldingActive, deleteHolding } from "@/lib/actions/investments";
import {
  calculateInvestedAmount,
  calculateMarketValue,
  calculateUnrealizedPnL,
  calculatePnLPercentage,
  calculateTotalPortfolioValue,
  fmtCurrency,
} from "@/lib/calculations";
import {
  ASSET_TYPES,
  getAssetCategoryKey,
  getAssetCategoryLabel,
  isQuantityBasedAsset,
  type Account,
  type HouseholdMember,
  type InvestmentHolding,
} from "@/lib/types";

type SortKey = "name" | "currentValue" | "invested" | "pnl" | "pnlPercent";

type Row = {
  holding: InvestmentHolding;
  invested: number;
  currentValue: number | null;
  pnl: number | null;
  pnlPercent: number | null;
};

export function HoldingsTable({
  holdings,
  accounts,
  members = [],
  onChanged,
}: {
  holdings: InvestmentHolding[];
  accounts: Account[];
  members?: HouseholdMember[];
  onChanged?: () => void;
}) {
  const memberById = new Map(members.map((m) => [m.id, m]));
  const [sortKey, setSortKey] = useState<SortKey>("currentValue");
  const [sortDesc, setSortDesc] = useState(true);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  function toggleGroup(key: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function sortRows(rows: Row[]): Row[] {
    const sorted = [...rows].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.holding.instrument_name.localeCompare(b.holding.instrument_name);
        case "invested":
          return b.invested - a.invested;
        case "pnl":
          return (b.pnl ?? -Infinity) - (a.pnl ?? -Infinity);
        case "pnlPercent":
          return (b.pnlPercent ?? -Infinity) - (a.pnlPercent ?? -Infinity);
        case "currentValue":
        default:
          return (b.currentValue ?? -Infinity) - (a.currentValue ?? -Infinity);
      }
    });
    return sortDesc ? sorted : sorted.reverse();
  }

  const groups = useMemo(() => {
    const byKey = new Map<string, { label: string; rows: Row[] }>();
    for (const h of holdings) {
      const key = getAssetCategoryKey(h.asset_type);
      const row: Row = {
        holding: h,
        invested: calculateInvestedAmount(h),
        currentValue: calculateMarketValue(h),
        pnl: calculateUnrealizedPnL(h),
        pnlPercent: calculatePnLPercentage(h),
      };
      if (!byKey.has(key)) byKey.set(key, { label: getAssetCategoryLabel(h.asset_type), rows: [] });
      byKey.get(key)!.rows.push(row);
    }

    const withTotals = Array.from(byKey.entries()).map(([key, { label, rows }]) => ({
      key,
      label,
      rows: sortRows(rows),
      totals: calculateTotalPortfolioValue(rows.map((r) => r.holding)),
    }));

    return withTotals.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return sortDesc ? a.label.localeCompare(b.label) : b.label.localeCompare(a.label);
        case "invested":
          return sortDesc ? b.totals.totalInvested - a.totals.totalInvested : a.totals.totalInvested - b.totals.totalInvested;
        case "pnl":
          return sortDesc
            ? b.totals.unrealizedPnL - a.totals.unrealizedPnL
            : a.totals.unrealizedPnL - b.totals.unrealizedPnL;
        case "pnlPercent":
          return sortDesc
            ? b.totals.unrealizedPnLPercent - a.totals.unrealizedPnLPercent
            : a.totals.unrealizedPnLPercent - b.totals.unrealizedPnLPercent;
        case "currentValue":
        default:
          return sortDesc ? b.totals.currentValue - a.totals.currentValue : a.totals.currentValue - b.totals.currentValue;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings, sortKey, sortDesc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  const headers: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "name", label: "Investment" },
    { key: "invested", label: "Invested", align: "right" },
    { key: "currentValue", label: "Current Value", align: "right" },
    { key: "pnl", label: "P&L", align: "right" },
    { key: "pnlPercent", label: "P&L %", align: "right" },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11.5px] font-medium uppercase tracking-wide text-muted">
            {headers.map((h) => (
              <th key={h.key} className={h.align === "right" ? "text-right" : "text-left"}>
                <button
                  onClick={() => toggleSort(h.key)}
                  className={`px-4 py-2.5 hover:text-foreground ${h.align === "right" ? "w-full text-right" : ""}`}
                >
                  {h.label}
                  {sortKey === h.key && (sortDesc ? " ↓" : " ↑")}
                </button>
              </th>
            ))}
            <th className="px-4 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {groups.map((group) => {
            const open = openGroups.has(group.key);
            return (
              <Fragment key={group.key}>
                <tr
                  onClick={() => toggleGroup(group.key)}
                  className="cursor-pointer bg-surface-2/50 hover:bg-surface-2"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-medium">
                      <ChevronRight
                        size={15}
                        strokeWidth={2}
                        className={`shrink-0 text-muted transition-transform ${open ? "rotate-90" : ""}`}
                      />
                      {group.label}
                    </div>
                    <div className="pl-[22px] text-[11px] text-muted">
                      {group.rows.length} holding{group.rows.length === 1 ? "" : "s"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{fmtCurrency(group.totals.totalInvested)}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {fmtCurrency(group.totals.currentValue)}
                    {group.totals.unpricedCount > 0 && (
                      <span className="ml-1 text-[11px] font-normal text-muted">
                        ({group.totals.unpricedCount} unpriced)
                      </span>
                    )}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      group.totals.pricedInvested > 0 ? (group.totals.unrealizedPnL < 0 ? "text-danger" : "text-success") : ""
                    }`}
                  >
                    {group.totals.pricedInvested > 0 ? fmtCurrency(group.totals.unrealizedPnL) : "—"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      group.totals.pricedInvested > 0 ? (group.totals.unrealizedPnLPercent < 0 ? "text-danger" : "text-success") : ""
                    }`}
                  >
                    {group.totals.pricedInvested > 0
                      ? `${group.totals.unrealizedPnLPercent >= 0 ? "+" : ""}${group.totals.unrealizedPnLPercent.toFixed(2)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3" />
                </tr>
                {open &&
                  group.rows.map(({ holding, invested, currentValue, pnl, pnlPercent }) => {
                    const typeLabel = ASSET_TYPES.find((t) => t.value === holding.asset_type)?.label ?? holding.asset_type;
                    const quantityBased = isQuantityBasedAsset(holding.asset_type);
                    return (
                      <tr key={holding.id} className={holding.is_active ? "" : "opacity-50"}>
                        <td className="py-3 pl-10 pr-4">
                          <div className="font-medium">{holding.instrument_name}</div>
                          <div className="text-[11px] text-muted">
                            {typeLabel}
                            {quantityBased && ` · ${Number(holding.quantity).toLocaleString("en-IN")} qty`}
                            {holding.weight_grams != null && ` · ${Number(holding.weight_grams).toLocaleString("en-IN")}g`}
                            {holding.owner_id && memberById.has(holding.owner_id) && ` · ${memberById.get(holding.owner_id)!.name}`}
                            {holding.source === "zerodha" && " · Zerodha"}
                            {!holding.is_active && " · inactive"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">{fmtCurrency(invested)}</td>
                        <td className="px-4 py-3 text-right">
                          {currentValue != null ? fmtCurrency(currentValue) : <span className="text-muted">No price yet</span>}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${pnl != null ? (pnl < 0 ? "text-danger" : "text-success") : ""}`}>
                          {pnl != null ? fmtCurrency(pnl) : "—"}
                        </td>
                        <td className={`px-4 py-3 text-right ${pnlPercent != null ? (pnlPercent < 0 ? "text-danger" : "text-success") : ""}`}>
                          {pnlPercent != null ? `${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2.5 whitespace-nowrap text-xs">
                            {quantityBased && (
                              <Modal trigger={<Button size="sm">+ Txn</Button>} title={`Record transaction — ${holding.instrument_name}`}>
                                <InvestmentTransactionForm holding={holding} accounts={accounts} onSuccess={onChanged} />
                              </Modal>
                            )}
                            {holding.source === "manual" && (
                              <Modal
                                trigger={<button className="text-muted hover:text-foreground">Edit</button>}
                                title="Edit investment"
                              >
                                <ManualHoldingForm holding={holding} members={members} onSuccess={onChanged} />
                              </Modal>
                            )}
                            {holding.is_active ? (
                              <ConfirmButton
                                className="text-muted hover:text-foreground"
                                confirmMessage={`Deactivate "${holding.instrument_name}"?`}
                                action={async () => {
                                  const result = await setHoldingActive(holding.id, false);
                                  onChanged?.();
                                  return result;
                                }}
                              >
                                Deactivate
                              </ConfirmButton>
                            ) : (
                              <ConfirmButton
                                className="text-accent hover:brightness-110"
                                confirmMessage={`Reactivate "${holding.instrument_name}"?`}
                                action={async () => {
                                  const result = await setHoldingActive(holding.id, true);
                                  onChanged?.();
                                  return result;
                                }}
                              >
                                Reactivate
                              </ConfirmButton>
                            )}
                            <ConfirmButton
                              className="text-danger hover:brightness-110"
                              confirmMessage={`Delete "${holding.instrument_name}"? If it has transactions it will be deactivated instead.`}
                              action={async () => {
                                const result = await deleteHolding(holding.id);
                                onChanged?.();
                                return result;
                              }}
                            >
                              Delete
                            </ConfirmButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
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
  fmtCurrency,
} from "@/lib/calculations";
import { ASSET_TYPES, type Account, type InvestmentHolding } from "@/lib/types";

type SortKey = "name" | "currentValue" | "invested" | "pnl" | "pnlPercent";

export function HoldingsTable({ holdings, accounts }: { holdings: InvestmentHolding[]; accounts: Account[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("currentValue");
  const [sortDesc, setSortDesc] = useState(true);

  const rows = useMemo(() => {
    const withCalc = holdings.map((h) => ({
      holding: h,
      invested: calculateInvestedAmount(h),
      currentValue: calculateMarketValue(h),
      pnl: calculateUnrealizedPnL(h),
      pnlPercent: calculatePnLPercentage(h),
    }));
    const sorted = [...withCalc].sort((a, b) => {
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
          {rows.map(({ holding, invested, currentValue, pnl, pnlPercent }) => {
            const typeLabel = ASSET_TYPES.find((t) => t.value === holding.asset_type)?.label ?? holding.asset_type;
            return (
              <tr key={holding.id} className={holding.is_active ? "" : "opacity-50"}>
                <td className="px-4 py-3">
                  <div className="font-medium">{holding.instrument_name}</div>
                  <div className="text-[11px] text-muted">
                    {typeLabel} · {Number(holding.quantity).toLocaleString("en-IN")} qty
                    {holding.source === "zerodha" && " · Zerodha"}
                    {!holding.is_active && " · inactive"}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">{fmtCurrency(invested)}</td>
                <td className="px-4 py-3 text-right">
                  {currentValue != null ? (
                    fmtCurrency(currentValue)
                  ) : (
                    <span className="text-muted">No price yet</span>
                  )}
                </td>
                <td className={`px-4 py-3 text-right font-medium ${pnl != null ? (pnl < 0 ? "text-danger" : "text-success") : ""}`}>
                  {pnl != null ? fmtCurrency(pnl) : "—"}
                </td>
                <td className={`px-4 py-3 text-right ${pnlPercent != null ? (pnlPercent < 0 ? "text-danger" : "text-success") : ""}`}>
                  {pnlPercent != null ? `${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%` : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2.5 whitespace-nowrap text-xs">
                    <Modal trigger={<Button size="sm">+ Txn</Button>} title={`Record transaction — ${holding.instrument_name}`}>
                      <InvestmentTransactionForm holding={holding} accounts={accounts} />
                    </Modal>
                    {holding.source === "manual" && (
                      <Modal
                        trigger={<button className="text-muted hover:text-foreground">Edit</button>}
                        title="Edit investment"
                      >
                        <ManualHoldingForm holding={holding} />
                      </Modal>
                    )}
                    {holding.is_active ? (
                      <ConfirmButton
                        className="text-muted hover:text-foreground"
                        confirmMessage={`Deactivate "${holding.instrument_name}"?`}
                        action={() => setHoldingActive(holding.id, false)}
                      >
                        Deactivate
                      </ConfirmButton>
                    ) : (
                      <ConfirmButton
                        className="text-accent hover:brightness-110"
                        confirmMessage={`Reactivate "${holding.instrument_name}"?`}
                        action={() => setHoldingActive(holding.id, true)}
                      >
                        Reactivate
                      </ConfirmButton>
                    )}
                    <ConfirmButton
                      className="text-danger hover:brightness-110"
                      confirmMessage={`Delete "${holding.instrument_name}"? If it has transactions it will be deactivated instead.`}
                      action={() => deleteHolding(holding.id)}
                    >
                      Delete
                    </ConfirmButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

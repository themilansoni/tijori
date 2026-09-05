import { ASSET_TYPES } from "@/lib/types";
import { fmtCurrency, type AssetAllocation } from "@/lib/calculations";

export function AllocationBreakdown({ allocation }: { allocation: AssetAllocation[] }) {
  if (allocation.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-muted">Allocation by Asset Type</h2>
      <div className="space-y-2.5">
        {allocation.map((a) => {
          const label = ASSET_TYPES.find((t) => t.value === a.assetType)?.label ?? a.assetType;
          return (
            <div key={a.assetType}>
              <div className="flex items-center justify-between text-sm">
                <span>{label}</span>
                <span className="text-muted">
                  {fmtCurrency(a.value)} · {a.percent.toFixed(0)}%
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-foreground/8">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(a.percent, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

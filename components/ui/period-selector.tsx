"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { PeriodKey } from "@/lib/types";

const OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
  { key: "custom", label: "Custom" },
];

export function PeriodSelector({ current }: { current: PeriodKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setPeriod(key: PeriodKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", key);
    if (key !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="inline-flex rounded-lg border border-border bg-surface p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => setPeriod(opt.key)}
          className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
            current === opt.key
              ? "bg-accent text-accent-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function CustomRangePicker({ from, to }: { from?: string; to?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-muted">
        From
        <input
          type="date"
          defaultValue={from}
          onChange={(e) => update("from", e.target.value)}
          className="rounded-md border border-border bg-white/[0.03] px-2.5 py-1.5 text-sm text-foreground"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-muted">
        To
        <input
          type="date"
          defaultValue={to}
          onChange={(e) => update("to", e.target.value)}
          className="rounded-md border border-border bg-white/[0.03] px-2.5 py-1.5 text-sm text-foreground"
        />
      </label>
    </div>
  );
}

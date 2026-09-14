"use client";

import { useEffect, useRef, useState } from "react";
import { Field } from "@/components/ui/field";
import { searchNseEquities, type NseEquity } from "@/lib/nse-search";

export function EquitySearchField({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (equity: NseEquity) => void;
}) {
  const [results, setResults] = useState<NseEquity[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    searchNseEquities(value).then((r) => {
      if (!cancelled) setResults(r);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Field
        label="Investment name"
        name="instrument_name"
        placeholder="e.g. Titan Company"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        required
        autoFocus
      />
      {open && results.length > 0 && (
        <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-[10px] border border-border bg-surface shadow-[var(--shadow-md)]">
          {results.map((r) => (
            <button
              key={r.isin}
              type="button"
              onClick={() => {
                onSelect(r);
                setOpen(false);
              }}
              className="block w-full px-3.5 py-2.5 text-left transition hover:bg-surface-2"
            >
              <div className="text-[13.5px] font-medium text-foreground">{r.name}</div>
              <div className="text-[11.5px] text-muted">
                {r.symbol} · {r.isin}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

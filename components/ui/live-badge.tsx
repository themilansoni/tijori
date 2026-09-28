"use client";

import { useEffect, useState } from "react";

function relativeTime(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

/** A pulsing "Live" indicator with a self-updating relative timestamp — re-renders every 15s
 *  purely to keep the "Xs/m ago" text fresh, no network activity of its own. */
export function LiveBadge({ updatedAt, label = "Live" }: { updatedAt: Date | null; label?: string }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      {label}
      {updatedAt && ` · Updated ${relativeTime(updatedAt)}`}
    </div>
  );
}

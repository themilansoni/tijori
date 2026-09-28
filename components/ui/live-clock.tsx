"use client";

import { useEffect, useState } from "react";

/** Ticking greeting + clock, isolated in its own component so its 1s interval only re-renders
 *  this small piece — not the whole dashboard, which would otherwise redo all its calculations
 *  every second for no reason. */
export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <div className="text-[13.5px] text-muted">&nbsp;</div>;

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

  return (
    <div className="text-[13.5px] text-muted">
      {greeting} · <span className="tabular-nums">{timeStr}</span>
    </div>
  );
}

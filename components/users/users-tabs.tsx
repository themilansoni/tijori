"use client";

import { useState } from "react";

export function UsersTabs({
  people,
  roles,
}: {
  people: React.ReactNode;
  roles: React.ReactNode;
}) {
  const [tab, setTab] = useState<"people" | "roles">("people");

  return (
    <div>
      <div className="mt-5 inline-flex rounded-lg border border-border bg-surface p-1">
        {(["people", "roles"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3.5 py-1.5 text-[13px] font-medium transition ${
              tab === t ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {t === "people" ? "People" : "Roles & Rights"}
          </button>
        ))}
      </div>

      <div className="mt-5">{tab === "people" ? people : roles}</div>
    </div>
  );
}

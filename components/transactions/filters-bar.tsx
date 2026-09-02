"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import type { Category } from "@/lib/types";

export type SortKey = "newest" | "oldest" | "highest" | "lowest";

export function FiltersBar({
  categories,
  currentCategory,
  currentSort,
  currentSearch,
}: {
  categories: Category[];
  currentCategory?: string;
  currentSort: SortKey;
  currentSearch?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentSearch ?? "");

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={currentCategory ?? ""}
        onChange={(e) => setParam("category", e.target.value)}
        className="cursor-pointer rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground transition hover:border-white/25 focus:outline-none focus:border-accent"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={currentSort}
        onChange={(e) => setParam("sort", e.target.value)}
        className="cursor-pointer rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground transition hover:border-white/25 focus:outline-none focus:border-accent"
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="highest">Highest amount</option>
        <option value="lowest">Lowest amount</option>
      </select>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setParam("q", search);
        }}
      >
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onBlur={() => setParam("q", search)}
          placeholder="Search description / note…"
          className="w-52 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted/60"
        />
      </form>
    </div>
  );
}

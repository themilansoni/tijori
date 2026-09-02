"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-[14px] transition ${
              active
                ? "bg-white/[0.08] font-medium text-nav-foreground"
                : "text-nav-muted hover:bg-white/[0.05] hover:text-nav-foreground"
            }`}
          >
            <Icon size={18} strokeWidth={1.75} className={active ? "text-accent" : ""} />
            {item.label}
            {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />}
          </Link>
        );
      })}
    </nav>
  );
}

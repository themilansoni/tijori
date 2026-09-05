"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { TijoriLogo } from "@/components/ui/tijori-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarNav } from "./sidebar-nav";

export function MobileNav({
  userEmail,
  logoutForm,
  hiddenHrefs,
}: {
  userEmail?: string;
  logoutForm: React.ReactNode;
  hiddenHrefs?: string[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-5 py-3.5 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="-ml-1.5 rounded-md p-1.5 text-foreground transition hover:bg-surface-2"
          >
            <Menu size={22} strokeWidth={1.75} />
          </button>
          <TijoriLogo height={19} />
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div
            className="absolute inset-0 bg-scrim/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-nav-bg px-5 py-5 text-nav-foreground shadow-[var(--shadow-lg)]">
            <div className="flex items-center justify-between">
              <TijoriLogo height={19} />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1.5 text-nav-muted transition hover:bg-foreground/6 hover:text-nav-foreground"
              >
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>

            <div className="mt-6 flex-1">
              <SidebarNav onNavigate={() => setOpen(false)} hiddenHrefs={hiddenHrefs} />
            </div>

            <div className="border-t border-nav-border pt-4">
              <div className="mb-3">
                <ThemeToggle />
              </div>
              {userEmail && <div className="mb-2 truncate text-[12px] text-nav-muted">{userEmail}</div>}
              {logoutForm}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

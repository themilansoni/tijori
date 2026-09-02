"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { TijoriMark } from "@/components/ui/tijori-mark";
import { SidebarNav } from "./sidebar-nav";

export function MobileNav({ userEmail, logoutForm }: { userEmail?: string; logoutForm: React.ReactNode }) {
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
          <TijoriMark size={26} className="rounded-[7px]" />
          <span className="text-[15px] font-semibold tracking-tight">Tijori</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-1.5 text-foreground transition hover:bg-surface-2"
        >
          <Menu size={22} strokeWidth={1.75} />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-nav-bg px-5 py-5 text-nav-foreground shadow-[var(--shadow-lg)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <TijoriMark size={26} className="rounded-[7px]" />
                <span className="text-[15px] font-semibold tracking-tight">Tijori</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1.5 text-nav-muted transition hover:bg-white/[0.06] hover:text-nav-foreground"
              >
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>

            <div className="mt-6 flex-1">
              <SidebarNav onNavigate={() => setOpen(false)} />
            </div>

            <div className="border-t border-nav-border pt-4">
              {userEmail && <div className="mb-2 truncate text-[12px] text-nav-muted">{userEmail}</div>}
              {logoutForm}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

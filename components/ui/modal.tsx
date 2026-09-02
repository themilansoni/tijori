"use client";

import { useState, useEffect, useRef, createContext, useContext } from "react";

const ModalCtx = createContext<{ close: () => void } | null>(null);

export function useModal() {
  const ctx = useContext(ModalCtx);
  if (!ctx) throw new Error("useModal must be used inside <Modal>");
  return ctx;
}

export function Modal({
  trigger,
  title,
  children,
}: {
  trigger: React.ReactNode;
  title: string;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-ink/55 px-4 py-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className="mx-auto w-full max-w-md rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-[var(--shadow-lg)] outline-none"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button
                onClick={close}
                className="rounded-md p-1 text-muted transition hover:bg-surface-2 hover:text-foreground"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <ModalCtx.Provider value={{ close }}>
              {typeof children === "function" ? children(close) : children}
            </ModalCtx.Provider>
          </div>
        </div>
      )}
    </>
  );
}

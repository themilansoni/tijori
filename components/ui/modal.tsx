"use client";

import { useState, createContext, useContext } from "react";

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

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 px-4 py-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{title}</h2>
              <button
                onClick={close}
                className="text-muted transition hover:text-foreground"
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

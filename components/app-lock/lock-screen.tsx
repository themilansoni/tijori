"use client";

import { useState } from "react";
import { TijoriLogo } from "@/components/ui/tijori-logo";

export function LockScreen({
  pinLength,
  onSubmit,
}: {
  pinLength: number;
  onSubmit: (pin: string) => Promise<boolean>;
}) {
  const [attempt, setAttempt] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  async function handleDigit(d: string) {
    if (checking || attempt.length >= pinLength) return;
    const next = attempt + d;
    setAttempt(next);
    setError(false);

    if (next.length === pinLength) {
      setChecking(true);
      const ok = await onSubmit(next);
      setChecking(false);
      if (!ok) {
        setError(true);
        setAttempt("");
      }
    }
  }

  function handleBackspace() {
    if (checking) return;
    setAttempt((a) => a.slice(0, -1));
    setError(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6">
      <TijoriLogo height={26} className="mb-8" />
      <div className="text-[15px] font-medium text-foreground">Enter your PIN</div>

      <div className="mt-4 flex gap-3">
        {Array.from({ length: pinLength }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 transition ${
              error
                ? "border-danger"
                : i < attempt.length
                ? "border-accent bg-accent"
                : "border-border bg-transparent"
            }`}
          />
        ))}
      </div>
      <p className={`mt-3 h-[18px] text-[12.5px] text-danger ${error ? "" : "opacity-0"}`}>Incorrect PIN, try again.</p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => handleDigit(d)}
            disabled={checking}
            className="h-16 w-16 rounded-full border border-border bg-surface text-xl font-medium text-foreground transition hover:bg-surface-2 active:scale-95 disabled:opacity-50"
          >
            {d}
          </button>
        ))}
        <span />
        <button
          type="button"
          onClick={() => handleDigit("0")}
          disabled={checking}
          className="h-16 w-16 rounded-full border border-border bg-surface text-xl font-medium text-foreground transition hover:bg-surface-2 active:scale-95 disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          disabled={checking}
          aria-label="Backspace"
          className="flex h-16 w-16 items-center justify-center rounded-full text-lg text-muted transition hover:text-foreground disabled:opacity-50"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}

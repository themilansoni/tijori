"use client";

import { useTransition } from "react";

export function ConfirmButton({
  action,
  confirmMessage,
  className = "",
  children,
}: {
  action: () => Promise<unknown>;
  confirmMessage: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() => {
        if (window.confirm(confirmMessage)) {
          startTransition(() => action());
        }
      }}
    >
      {children}
    </button>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Modal, useModal } from "@/components/ui/modal";
import { resetUserPassword } from "@/lib/actions/users";

function ResetPasswordDialog({ userId, name }: { userId: string; name: string }) {
  const { close } = useModal();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  function handleConfirm() {
    setError(undefined);
    startTransition(async () => {
      const result = await resetUserPassword(userId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setTempPassword(result.tempPassword);
    });
  }

  if (tempPassword) {
    return (
      <div>
        <p className="text-sm text-muted">
          New temporary password for <span className="font-medium text-foreground">{name}</span>. They&apos;ll
          be asked to set their own password the next time they sign in.
        </p>
        <div className="mt-3 rounded-[10px] border border-border bg-surface-2 px-4 py-3 font-mono text-[15px] tracking-wide">
          {tempPassword}
        </div>
        <p className="mt-2 text-[12px] text-muted">This won&apos;t be shown again — copy it now.</p>
        <button
          type="button"
          onClick={close}
          className="mt-6 w-full rounded-[10px] bg-accent px-4 py-[13px] text-[14.5px] font-semibold text-accent-foreground transition hover:brightness-95 active:brightness-90"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted">
        Set a new temporary password for <span className="font-medium text-foreground">{name}</span>? They&apos;ll
        need to set their own password the next time they sign in.
      </p>
      {error && <p className="mt-2 text-[12.5px] text-danger">{error}</p>}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={close}
          className="flex-1 rounded-[10px] border border-border px-4 py-[13px] text-[14.5px] font-medium text-muted transition hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={handleConfirm}
          className="flex-1 rounded-[10px] bg-accent px-4 py-[13px] text-[14.5px] font-semibold text-accent-foreground transition hover:brightness-95 active:brightness-90 disabled:opacity-60"
        >
          {pending ? "Resetting…" : "Reset password"}
        </button>
      </div>
    </div>
  );
}

export function ResetPasswordButton({ userId, name }: { userId: string; name: string }) {
  return (
    <Modal
      trigger={
        <button type="button" className="text-muted hover:text-foreground">
          Reset password
        </button>
      }
      title="Reset password"
    >
      <ResetPasswordDialog userId={userId} name={name} />
    </Modal>
  );
}

"use client";

import { useActionState } from "react";
import { changeOwnPassword } from "@/lib/actions/auth";
import { Field, SubmitButton, FormError } from "@/components/ui/field";

export default function ChangePasswordPage() {
  const [state, formAction, pending] = useActionState(changeOwnPassword, undefined);

  return (
    <div>
      <h1 className="text-[26px] font-semibold tracking-tight">Set a new password</h1>
      <p className="mt-1.5 text-[14px] text-muted">
        You&apos;re signed in with a temporary password. Choose one only you know before continuing.
      </p>

      <form className="mt-8" action={formAction}>
        <Field
          label="New password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          required
          autoComplete="new-password"
          minLength={8}
          autoFocus
        />
        <Field
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          placeholder="••••••••"
          required
          autoComplete="new-password"
          minLength={8}
        />
        <FormError message={state?.error} />
        <SubmitButton pending={pending}>Update password</SubmitButton>
      </form>
    </div>
  );
}

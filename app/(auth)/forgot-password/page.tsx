"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";
import { Field, SubmitButton, FormError } from "@/components/ui/field";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, undefined);

  return (
    <div>
      <h1 className="text-[26px] font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-1.5 text-[14px] text-muted">
        Enter your email and we&apos;ll send you a link to set a new one.
      </p>

      {state?.success ? (
        <div className="mt-8 rounded-[10px] border border-success/30 bg-success/8 px-4 py-3.5 text-[13.5px] text-success">
          {state.success}
        </div>
      ) : (
        <form className="mt-8" action={formAction}>
          <Field label="Email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" autoFocus />
          <FormError message={state?.error} />
          <SubmitButton pending={pending}>Send reset link</SubmitButton>
        </form>
      )}

      <p className="mt-7 text-[13.5px] text-muted">
        <Link href="/login" className="font-medium text-accent">
          ← Back to sign in
        </Link>
      </p>
    </div>
  );
}

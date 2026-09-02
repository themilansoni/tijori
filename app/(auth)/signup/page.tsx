"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "@/lib/actions/auth";
import { Field, SubmitButton, FormError } from "@/components/ui/field";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, undefined);

  return (
    <div className="w-[400px] max-w-full rounded-[var(--radius-lg)] border border-border bg-surface px-9 pt-9 pb-8 text-left shadow-[var(--shadow-lg)]">
      <h1 className="text-[22px] font-semibold tracking-tight">Set up your vault</h1>
      <p className="mt-1 mb-0 text-[13.5px] text-muted">Track expenses, income &amp; budgets</p>

      <form action={formAction}>
        <Field label="Email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
        <Field label="Password" name="password" type="password" placeholder="At least 8 characters" required autoComplete="new-password" minLength={8} />
        <Field label="Confirm password" name="confirmPassword" type="password" placeholder="••••••••" required autoComplete="new-password" minLength={8} />
        <FormError message={state?.error} />
        <SubmitButton pending={pending}>Create vault</SubmitButton>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted">
        Already have an account? <Link href="/login" className="font-medium text-accent">Sign in</Link>
      </p>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/lib/actions/auth";
import { Field, SubmitButton, FormError } from "@/components/ui/field";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="w-[400px] max-w-full rounded-[var(--radius-lg)] border border-border bg-surface px-9 pt-9 pb-8 text-left shadow-[var(--shadow-lg)]">
      <h1 className="text-[22px] font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 mb-0 text-[13.5px] text-muted">Sign in to your vault</p>

      <form action={formAction}>
        <Field label="Email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
        <Field label="Password" name="password" type="password" placeholder="••••••••" required autoComplete="current-password" />
        <FormError message={state?.error} />
        <SubmitButton pending={pending}>Sign in</SubmitButton>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted">
        No account? <Link href="/signup" className="font-medium text-accent">Create one</Link>
      </p>
    </div>
  );
}

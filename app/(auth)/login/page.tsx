"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/lib/actions/auth";
import { Field, SubmitButton, FormError } from "@/components/ui/field";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="relative w-[400px] max-w-full rounded-[18px] border border-border bg-surface px-9 pt-[42px] pb-[34px] text-left shadow-[0_40px_90px_rgba(0,0,0,0.55)]">
      <div className="absolute top-0 left-[14%] right-[14%] h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

      <div className="font-mono text-[11px] font-medium tracking-[1.5px] text-accent mb-4">
        // AUTHENTICATE
      </div>
      <h1 className="text-[25px] font-bold tracking-tight">Access your vault</h1>
      <p className="mt-1.5 mb-0 text-[13.5px] text-muted">Sign in to continue</p>

      <form action={formAction}>
        <Field label="Email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
        <Field label="Password" name="password" type="password" placeholder="••••••••" required autoComplete="current-password" />
        <FormError message={state?.error} />
        <SubmitButton pending={pending}>Sign in →</SubmitButton>
      </form>

      <p className="mt-6 text-center font-mono text-[11px] text-muted">
        No account? <Link href="/signup" className="text-accent">Create one</Link>
      </p>
    </div>
  );
}

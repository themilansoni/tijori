"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "@/lib/actions/auth";
import { Field, SubmitButton, FormError } from "@/components/ui/field";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, undefined);

  return (
    <div>
      <h1 className="text-[26px] font-semibold tracking-tight">Set up your vault</h1>
      <p className="mt-1.5 text-[14px] text-muted">Track expenses, income &amp; budgets</p>

      <form className="mt-8" action={formAction}>
        <Field label="Email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
        <Field label="Password" name="password" type="password" placeholder="At least 8 characters" required autoComplete="new-password" minLength={8} />
        <Field label="Confirm password" name="confirmPassword" type="password" placeholder="••••••••" required autoComplete="new-password" minLength={8} />
        <FormError message={state?.error} />
        <SubmitButton pending={pending}>Create vault</SubmitButton>
      </form>

      <p className="mt-7 text-[13.5px] text-muted">
        Already have an account? <Link href="/login" className="font-medium text-accent">Sign in</Link>
      </p>
    </div>
  );
}

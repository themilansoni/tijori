"use client";

import { useActionState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Field, SubmitButton, FormError } from "@/components/ui/field";

type ResetRequestState = { error?: string; success?: string } | undefined;

export default function ForgotPasswordPage() {
  async function requestPasswordReset(
    _prevState: ResetRequestState,
    formData: FormData
  ): Promise<ResetRequestState> {
    const email = String(formData.get("email") ?? "").trim();
    if (!email) return { error: "Email is required." };

    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: true,
      });
    } catch {
      // Deliberately don't reveal whether the email exists — same
      // wording either way, so this can't be used to enumerate accounts.
    }

    return { success: "If an account exists for that email, we've sent a password reset link." };
  }

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

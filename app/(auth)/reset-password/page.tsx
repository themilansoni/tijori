"use client";

import { Suspense, useActionState, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { firebaseAuthErrorMessage } from "@/lib/firebase/errors";
import { Field, SubmitButton, FormError } from "@/components/ui/field";

type Status = "checking" | "ready" | "invalid";
type AuthState = { error?: string } | undefined;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const oobCode = searchParams.get("oobCode");
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    if (!oobCode) {
      setStatus("invalid");
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then(() => setStatus("ready"))
      .catch(() => setStatus("invalid"));
  }, [oobCode]);

  async function updatePassword(_prevState: AuthState, formData: FormData): Promise<AuthState> {
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!password) return { error: "Password is required." };
    if (password.length < 8) return { error: "Password must be at least 8 characters." };
    if (password !== confirmPassword) return { error: "Passwords do not match." };

    try {
      await confirmPasswordReset(auth, oobCode!, password);
    } catch (err) {
      return { error: firebaseAuthErrorMessage(err) };
    }

    router.replace("/login");
    return undefined;
  }

  const [state, formAction, pending] = useActionState(updatePassword, undefined);

  if (status === "checking") {
    return (
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight">Set a new password</h1>
        <p className="mt-1.5 text-[14px] text-muted">Verifying your reset link…</p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight">Link expired</h1>
        <p className="mt-1.5 text-[14px] text-muted">
          This reset link is invalid or has expired — links only work once and expire after a while.
        </p>
        <p className="mt-7 text-[13.5px] text-muted">
          <Link href="/forgot-password" className="font-medium text-accent">
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[26px] font-semibold tracking-tight">Set a new password</h1>
      <p className="mt-1.5 text-[14px] text-muted">Choose a new password for your vault.</p>

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

"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { updatePassword } from "@/lib/actions/auth";
import { Field, SubmitButton, FormError } from "@/components/ui/field";

type Status = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [state, formAction, pending] = useActionState(updatePassword, undefined);

  useEffect(() => {
    const supabase = createClient();

    // The recovery link's tokens land in the URL hash, which the browser
    // client picks up automatically on load and turns into this event.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });

    // Covers the case where the event already fired before this listener
    // attached (a real race on fast connections).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus("ready");
    });

    const timeout = setTimeout(() => {
      setStatus((current) => (current === "checking" ? "invalid" : current));
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

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

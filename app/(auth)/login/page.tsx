"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { firebaseAuthErrorMessage } from "@/lib/firebase/errors";
import { Field, SubmitButton, FormError } from "@/components/ui/field";

type AuthState = { error?: string } | undefined;

export default function LoginPage() {
  const router = useRouter();

  async function login(_prevState: AuthState, formData: FormData): Promise<AuthState> {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      return { error: "Email and password are required." };
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      return { error: firebaseAuthErrorMessage(err) };
    }

    router.replace("/dashboard");
    return undefined;
  }

  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div>
      <h1 className="text-[26px] font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-[14px] text-muted">Sign in to your vault</p>

      <form className="mt-8" action={formAction}>
        <Field label="Email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
        <Field label="Password" name="password" type="password" placeholder="••••••••" required autoComplete="current-password" />
        <p className="mt-2 text-right">
          <Link href="/forgot-password" className="text-[12.5px] text-muted hover:text-accent">
            Forgot password?
          </Link>
        </p>
        <FormError message={state?.error} />
        <SubmitButton pending={pending}>Sign in</SubmitButton>
      </form>

      <p className="mt-7 text-[13.5px] text-muted">
        No account? <Link href="/signup" className="font-medium text-accent">Create one</Link>
      </p>
    </div>
  );
}

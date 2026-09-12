"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { firebaseAuthErrorMessage } from "@/lib/firebase/errors";
import { seedDefaultCategories } from "@/lib/firebase/seed";
import { Field, SubmitButton, FormError } from "@/components/ui/field";

type AuthState = { error?: string } | undefined;

export default function SignupPage() {
  const router = useRouter();

  async function signup(_prevState: AuthState, formData: FormData): Promise<AuthState> {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!email || !password) {
      return { error: "Email and password are required." };
    }
    if (password.length < 8) {
      return { error: "Password must be at least 8 characters." };
    }
    if (password !== confirmPassword) {
      return { error: "Passwords do not match." };
    }

    let uid: string;
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      uid = credential.user.uid;
    } catch (err) {
      return { error: firebaseAuthErrorMessage(err) };
    }

    await seedDefaultCategories(uid);
    router.replace("/dashboard");
    return undefined;
  }

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

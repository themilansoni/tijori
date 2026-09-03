"use client";

import { useState, useTransition } from "react";
import { createUser } from "@/lib/actions/users";
import { Field, SelectField, SubmitButton, FormError } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import type { Role } from "@/lib/types";

export function AddUserForm({ roles }: { roles: Role[] }) {
  const { close } = useModal();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await createUser(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setCreated({ email: result.email, tempPassword: result.tempPassword });
    });
  }

  if (created) {
    return (
      <div>
        <p className="text-sm text-muted">
          Account created for <span className="font-medium text-foreground">{created.email}</span>. Share
          this temporary password with them — it won&apos;t be shown again.
        </p>
        <div className="mt-3 rounded-[10px] border border-border bg-surface-2 px-4 py-3 font-mono text-[15px] tracking-wide">
          {created.tempPassword}
        </div>
        <button
          type="button"
          onClick={close}
          className="mt-6 w-full rounded-[10px] bg-accent px-4 py-[13px] text-[14.5px] font-semibold text-accent-foreground transition hover:brightness-95 active:brightness-90"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form action={handleSubmit}>
      <Field label="Full name" name="full_name" placeholder="e.g. Priya Sharma" autoFocus />
      <Field label="Email" name="email" type="email" placeholder="priya@example.com" required />
      <SelectField label="Role" name="role_id" required defaultValue="">
        <option value="" disabled>
          Select a role
        </option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </SelectField>
      <FormError message={error} />
      <SubmitButton pending={pending}>Create user</SubmitButton>
    </form>
  );
}

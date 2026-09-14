"use client";

import { useState, useTransition } from "react";
import { createHouseholdMember, renameHouseholdMember } from "@/lib/actions/household";
import { Field, SubmitButton, FormError } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import type { HouseholdMember } from "@/lib/types";

export function HouseholdMemberForm({
  member,
  onSuccess,
}: {
  member?: HouseholdMember;
  onSuccess?: () => void;
}) {
  const { close } = useModal();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = member ? await renameHouseholdMember(formData) : await createHouseholdMember(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onSuccess?.();
      close();
    });
  }

  return (
    <form action={handleSubmit}>
      {member && <input type="hidden" name="id" value={member.id} />}

      <Field
        label="Name"
        name="name"
        placeholder="e.g. Me, or your name"
        defaultValue={member?.name}
        required
        autoFocus
      />

      <FormError message={error} />
      <SubmitButton pending={pending}>{member ? "Save changes" : "Add member"}</SubmitButton>
    </form>
  );
}

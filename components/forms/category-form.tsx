"use client";

import { useState, useTransition } from "react";
import { createCategory, updateCategory } from "@/lib/actions/categories";
import { Field, SelectField, SubmitButton, FormError } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import type { Category } from "@/lib/types";

export function CategoryForm({
  category,
  defaultType = "expense",
}: {
  category?: Category;
  defaultType?: "expense" | "income";
}) {
  const { close } = useModal();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = category ? await updateCategory(formData) : await createCategory(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      close();
    });
  }

  return (
    <form action={handleSubmit}>
      {category && <input type="hidden" name="id" value={category.id} />}

      <Field
        label="Category name"
        name="name"
        placeholder="e.g. Subscriptions"
        defaultValue={category?.name}
        required
        autoFocus
      />

      {!category && (
        <SelectField label="Type" name="type" defaultValue={defaultType}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </SelectField>
      )}

      <FormError message={error} />
      <SubmitButton pending={pending}>{category ? "Save changes" : "Add category"}</SubmitButton>
    </form>
  );
}

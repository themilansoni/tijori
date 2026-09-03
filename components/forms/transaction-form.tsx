"use client";

import { useState, useTransition } from "react";
import { createTransaction, updateTransaction } from "@/lib/actions/transactions";
import { createCategory } from "@/lib/actions/categories";
import { Field, SelectField, TextareaField, SubmitButton, FormError } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import { PAYMENT_METHODS, type Account, type Category, type Transaction } from "@/lib/types";

const ADD_NEW_SENTINEL = "__add_new__";

export function TransactionForm({
  type,
  categories: initialCategories,
  accounts,
  transaction,
  defaultDate,
  keepOpenOnAdd,
}: {
  type: "expense" | "income";
  categories: Category[];
  accounts: Account[];
  transaction?: Transaction;
  defaultDate?: string;
  keepOpenOnAdd?: boolean;
}) {
  const { close } = useModal();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [resetKey, setResetKey] = useState(0);

  const [categories, setCategories] = useState(initialCategories);
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? "");

  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState<string | undefined>();
  const [categoryPending, startCategoryTransition] = useTransition();

  function handleCategoryChange(value: string) {
    if (value === ADD_NEW_SENTINEL) {
      setAddingCategory(true);
      setCategoryError(undefined);
      return;
    }
    setCategoryId(value);
  }

  function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      setCategoryError("Category name is required.");
      return;
    }
    setCategoryError(undefined);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("type", type);

    startCategoryTransition(async () => {
      const result = await createCategory(formData);
      if ("error" in result) {
        setCategoryError(result.error);
        return;
      }
      setCategories((prev) => [...prev, result.category].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryId(result.category.id);
      setAddingCategory(false);
      setNewCategoryName("");
    });
  }

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = transaction
        ? await updateTransaction(formData)
        : await createTransaction(type, formData);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      if (transaction || !keepOpenOnAdd) {
        close();
      } else {
        setCategoryId("");
        setResetKey((k) => k + 1);
      }
    });
  }

  const today = defaultDate ?? new Date().toISOString().slice(0, 10);
  const accountLabel = type === "income" ? "Received into" : "Paid from (optional)";

  return (
    <form key={resetKey} action={handleSubmit}>
      {transaction && <input type="hidden" name="id" value={transaction.id} />}

      <Field
        label="Amount (₹)"
        name="amount"
        type="number"
        step="0.01"
        min="0.01"
        placeholder="450"
        defaultValue={transaction?.amount}
        required
        autoFocus
      />

      <SelectField
        label="Category"
        name="category_id"
        value={categoryId}
        onChange={(e) => handleCategoryChange(e.target.value)}
        required
      >
        <option value="" disabled>
          Select category
        </option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
        <option value={ADD_NEW_SENTINEL} style={{ color: "var(--accent)" }}>
          + Add New Category
        </option>
      </SelectField>

      {addingCategory && (
        <div className="mt-2 rounded-[10px] border border-accent/35 bg-surface-2 p-3">
          <div className="text-[11.5px] font-medium tracking-[0.2px] text-muted">
            Add new category
          </div>
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder={type === "income" ? "e.g. Bonus" : "e.g. Gym"}
            autoFocus
            className="mt-2 w-full rounded-[9px] border border-border bg-surface px-[13px] py-2.5 text-[14px] text-foreground placeholder:text-muted/60 transition focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.16)]"
          />
          {categoryError && <p className="mt-2 text-[12px] text-danger">{categoryError}</p>}
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setAddingCategory(false);
                setNewCategoryName("");
                setCategoryError(undefined);
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={categoryPending}
              onClick={handleAddCategory}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground transition hover:brightness-105 disabled:opacity-60"
            >
              {categoryPending ? "Adding…" : "Add Category"}
            </button>
          </div>
        </div>
      )}

      <Field
        label="Date"
        name="transaction_date"
        type="date"
        defaultValue={transaction?.transaction_date ?? today}
        required
      />

      <SelectField
        label={accountLabel}
        name="account_id"
        defaultValue={transaction?.account_id ?? ""}
      >
        <option value="">{accounts.length ? "Select account" : "No accounts yet"}</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </SelectField>

      {type === "expense" && (
        <SelectField
          label="Payment method (optional)"
          name="payment_method"
          defaultValue={transaction?.payment_method ?? ""}
        >
          <option value="">Not specified</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </SelectField>
      )}

      <Field
        label="Description (optional)"
        name="description"
        placeholder={type === "income" ? "September Salary" : "Lunch with friends"}
        defaultValue={transaction?.description ?? ""}
      />

      <TextareaField
        label="Note (optional)"
        name="note"
        rows={2}
        placeholder="Anything else worth remembering"
        defaultValue={transaction?.note ?? ""}
      />

      <FormError message={error} />
      <SubmitButton pending={pending}>
        {transaction ? "Save changes" : type === "income" ? "Save income" : "Save expense"}
      </SubmitButton>
    </form>
  );
}

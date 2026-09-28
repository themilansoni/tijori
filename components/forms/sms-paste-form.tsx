"use client";

import { useState } from "react";
import { createTransaction } from "@/lib/actions/transactions";
import { parseTransactionSms } from "@/lib/sms-parser";
import { SelectField, TextareaField, FormError } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import { fmtCurrency } from "@/lib/calculations";
import type { Category } from "@/lib/types";

export function SmsPasteForm({
  expenseCategories,
  incomeCategories,
  onSuccess,
}: {
  expenseCategories: Category[];
  incomeCategories: Category[];
  onSuccess?: () => void;
}) {
  const { close } = useModal();
  const [text, setText] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const parsed = parseTransactionSms(text);
  const categories = parsed?.type === "income" ? incomeCategories : expenseCategories;

  function handleTextChange(value: string) {
    setText(value);
    setCategoryId(""); // a re-parse can flip expense<->income, which changes the valid category list
    setError(undefined);
  }

  async function handleSave() {
    if (!parsed) return;
    if (!categoryId) {
      setError("Pick a category.");
      return;
    }
    setError(undefined);
    setPending(true);

    const formData = new FormData();
    formData.set("amount", String(parsed.amount));
    formData.set("category_id", categoryId);
    formData.set("transaction_date", new Date().toISOString().slice(0, 10));
    formData.set("description", parsed.merchant ?? "");

    const result = await createTransaction(parsed.type, formData);
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onSuccess?.();
    close();
  }

  return (
    <div>
      <TextareaField
        label="Paste the bank/UPI SMS or notification text"
        name="sms_text"
        rows={4}
        placeholder="e.g. Rs.500.00 debited from a/c XX1234 to VPA swiggy@ybl on 15-01-26..."
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        autoFocus
      />
      <p className="mt-1.5 text-[12px] text-muted">
        Copy the transaction SMS (or the notification text) from your phone and paste it here —
        it's parsed entirely on your device, nothing is sent anywhere.
      </p>

      {text.trim() && (
        parsed ? (
          <div className="mt-4 rounded-lg border border-success/30 bg-success/5 p-3.5">
            <div className="text-[13.5px] font-semibold text-success">
              Detected {parsed.type === "expense" ? "an expense" : "income"} of {fmtCurrency(parsed.amount)}
              {parsed.merchant && ` · ${parsed.merchant}`}
            </div>
            <div className="mt-3">
              <SelectField
                label="Category"
                name="category_id"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
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
              </SelectField>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-[13px] text-danger">
            Couldn't find a clear transaction in that text — add it manually instead.
          </p>
        )
      )}

      <FormError message={error} />
      {parsed && (
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="mt-5 w-full rounded-[10px] bg-accent px-4 py-[13px] text-[14.5px] font-semibold text-accent-foreground transition hover:brightness-95 active:brightness-90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? "Saving…" : `Save ${parsed.type}`}
        </button>
      )}
    </div>
  );
}

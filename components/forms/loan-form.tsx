"use client";

import { useState, useTransition } from "react";
import { createLoan, updateLoan } from "@/lib/actions/loans";
import { createHouseholdMember } from "@/lib/actions/household";
import { Field, SelectField, SubmitButton, FormError } from "@/components/ui/field";
import { useModal } from "@/components/ui/modal";
import type { HouseholdMember, Loan } from "@/lib/types";

const ADD_BORROWER_SENTINEL = "__add_borrower__";

export function LoanForm({
  loan,
  members: initialMembers = [],
  onSuccess,
}: {
  loan?: Loan;
  members?: HouseholdMember[];
  onSuccess?: () => void;
}) {
  const { close } = useModal();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  const [members, setMembers] = useState(initialMembers);
  const [ownerId, setOwnerId] = useState(loan?.owner_id ?? "");
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [memberError, setMemberError] = useState<string | undefined>();
  const [memberPending, startMemberTransition] = useTransition();

  function handleOwnerChange(value: string) {
    if (value === ADD_BORROWER_SENTINEL) {
      setAddingMember(true);
      setMemberError(undefined);
      return;
    }
    setOwnerId(value);
  }

  function handleAddMember() {
    const name = newMemberName.trim();
    if (!name) {
      setMemberError("Name is required.");
      return;
    }
    setMemberError(undefined);

    const formData = new FormData();
    formData.set("name", name);

    startMemberTransition(async () => {
      const result = await createHouseholdMember(formData);
      if ("error" in result) {
        setMemberError(result.error);
        return;
      }
      setMembers((prev) => [...prev, result.member]);
      setOwnerId(result.member.id);
      setAddingMember(false);
      setNewMemberName("");
    });
  }

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = loan ? await updateLoan(formData) : await createLoan(formData);
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
      {loan && <input type="hidden" name="id" value={loan.id} />}

      <Field
        label="Loan name"
        name="name"
        placeholder="e.g. HDFC Home Loan"
        defaultValue={loan?.name}
        required
        autoFocus
      />

      <SelectField
        label="Borrower (optional)"
        name="owner_id"
        value={ownerId}
        onChange={(e) => handleOwnerChange(e.target.value)}
      >
        <option value="">Unassigned</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
        <option value={ADD_BORROWER_SENTINEL} style={{ color: "var(--accent)" }}>
          + Add borrower
        </option>
      </SelectField>

      {addingMember && (
        <div className="mt-2 rounded-[10px] border border-accent/35 bg-surface-2 p-3">
          <div className="text-[11.5px] font-medium tracking-[0.2px] text-muted">Add borrower</div>
          <input
            type="text"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            placeholder="e.g. Me, or your name"
            autoFocus
            className="mt-2 w-full rounded-[9px] border border-border bg-surface px-[13px] py-2.5 text-[14px] text-foreground placeholder:text-muted/60 transition focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.16)]"
          />
          {memberError && <p className="mt-2 text-[12px] text-danger">{memberError}</p>}
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setAddingMember(false);
                setNewMemberName("");
                setMemberError(undefined);
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={memberPending}
              onClick={handleAddMember}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground transition hover:brightness-105 disabled:opacity-60"
            >
              {memberPending ? "Adding…" : "Add Borrower"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 [&>label]:!mt-0">
        <Field
          label="Outstanding amount (₹)"
          name="outstanding_amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="1200000"
          defaultValue={loan?.outstanding_amount}
          required
        />
        <Field
          label="Principal amount (₹, optional)"
          name="principal_amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="1500000"
          defaultValue={loan?.principal_amount ?? ""}
        />
      </div>
      <p className="mt-1.5 text-[12px] text-muted">
        Update the outstanding amount yourself any time — linking an expense to this loan brings it down
        automatically too.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 [&>label]:!mt-0">
        <Field
          label="EMI per month (₹)"
          name="emi_amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="25000"
          defaultValue={loan?.emi_amount}
          required
        />
        <Field
          label="Interest rate (%, optional)"
          name="interest_rate"
          type="number"
          step="0.01"
          min="0"
          placeholder="8.5"
          defaultValue={loan?.interest_rate ?? ""}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 [&>label]:!mt-0">
        <Field
          label="Tenure (months, optional)"
          name="tenure_months"
          type="number"
          step="1"
          min="1"
          placeholder="240"
          defaultValue={loan?.tenure_months ?? ""}
        />
        <Field
          label="EMIs paid so far"
          name="emis_paid"
          type="number"
          step="1"
          min="0"
          placeholder="0"
          defaultValue={loan?.emis_paid ?? 0}
        />
      </div>
      <p className="mt-1.5 text-[12px] text-muted">
        Add tenure to see how many EMIs are left. EMIs paid ticks up on its own when you link an expense to
        this loan — set it by hand for EMIs paid before you started tracking here.
      </p>

      <Field
        label="Next EMI due date (optional)"
        name="next_due_date"
        type="date"
        defaultValue={loan?.next_due_date ?? ""}
      />

      <FormError message={error} />
      <SubmitButton pending={pending}>{loan ? "Save changes" : "Add loan"}</SubmitButton>
    </form>
  );
}

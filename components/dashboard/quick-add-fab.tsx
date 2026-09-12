"use client";

import { useEffect, useState } from "react";
import { Plus, X, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { TransactionForm } from "@/components/forms/transaction-form";
import type { Account, Category } from "@/lib/types";

export function QuickAddFab({
  expenseCategories,
  incomeCategories,
  accounts,
  canAddExpense,
  canAddIncome,
  onSuccess,
}: {
  expenseCategories: Category[];
  incomeCategories: Category[];
  accounts: Account[];
  canAddExpense: boolean;
  canAddIncome: boolean;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!canAddExpense && !canAddIncome) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 lg:bottom-8 lg:right-8">
        {open && (
          <div className="flex flex-col items-end gap-2.5">
            {canAddIncome && (
              <div className="flex items-center gap-2.5">
                <span className="rounded-full bg-scrim px-3 py-1.5 text-[12.5px] font-medium text-white shadow-[var(--shadow-md)]">
                  Add income
                </span>
                <Modal
                  trigger={
                    <button
                      aria-label="Add income"
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-success text-white shadow-[var(--shadow-lg)] transition hover:brightness-105 active:scale-95"
                    >
                      <ArrowUpRight size={20} strokeWidth={2} />
                    </button>
                  }
                  title="Add income"
                >
                  <TransactionForm
                    type="income"
                    categories={incomeCategories}
                    accounts={accounts}
                    keepOpenOnAdd
                    onSuccess={onSuccess}
                  />
                </Modal>
              </div>
            )}

            {canAddExpense && (
              <div className="flex items-center gap-2.5">
                <span className="rounded-full bg-scrim px-3 py-1.5 text-[12.5px] font-medium text-white shadow-[var(--shadow-md)]">
                  Add expense
                </span>
                <Modal
                  trigger={
                    <button
                      aria-label="Add expense"
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[var(--shadow-lg)] transition hover:brightness-95 active:scale-95"
                    >
                      <ArrowDownRight size={20} strokeWidth={2} />
                    </button>
                  }
                  title="Add expense"
                >
                  <TransactionForm
                    type="expense"
                    categories={expenseCategories}
                    accounts={accounts}
                    keepOpenOnAdd
                    onSuccess={onSuccess}
                  />
                </Modal>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close quick add" : "Quick add"}
          aria-expanded={open}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[var(--shadow-lg)] transition hover:brightness-95 active:scale-95"
        >
          {open ? <X size={24} strokeWidth={2} /> : <Plus size={24} strokeWidth={2} />}
        </button>
      </div>
    </>
  );
}

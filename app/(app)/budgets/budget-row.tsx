"use client";

import { Modal } from "@/components/ui/modal";
import { BudgetForm } from "@/components/forms/budget-form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { setBudgetActive, deleteBudget } from "@/lib/actions/budgets";
import { fmtCurrency, type BudgetStatus } from "@/lib/calculations";
import type { Category } from "@/lib/types";

export function BudgetRow({
  status,
  categories,
}: {
  status: BudgetStatus;
  categories: Category[];
}) {
  const { budget, category, spent, remaining, usedPercent, isOverBudget, overBy } = status;
  const pct = Math.min(usedPercent, 100);

  return (
    <div className={`rounded-xl border p-4 ${isOverBudget ? "border-danger/40" : "border-border"} bg-surface`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{category.name}</div>
          <div className="mt-0.5 text-xs text-muted">
            {fmtCurrency(budget.amount)} / {budget.period}
            {!budget.is_active && " · inactive"}
          </div>
        </div>
        <div className="text-right">
          <div className={`font-bold ${isOverBudget ? "text-danger" : "text-foreground"}`}>
            {fmtCurrency(spent)} spent
          </div>
          <div className={`text-xs ${isOverBudget ? "text-danger" : "text-muted"}`}>
            {isOverBudget ? `${fmtCurrency(overBy)} over budget` : `${fmtCurrency(remaining)} remaining`}
          </div>
        </div>
      </div>

      <div className="mt-3 h-2 rounded-full bg-white/5">
        <div
          className={`h-full rounded-full ${isOverBudget ? "bg-danger" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-muted">
        <span>{usedPercent.toFixed(0)}% used</span>
        {isOverBudget && <span className="font-semibold text-danger">OVER BUDGET</span>}
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs">
        <Modal
          trigger={<button className="text-muted hover:text-foreground">Edit</button>}
          title="Edit budget"
        >
          <BudgetForm categories={categories} budget={budget} />
        </Modal>
        {budget.is_active ? (
          <ConfirmButton
            className="text-muted hover:text-foreground"
            confirmMessage={`Deactivate the ${category.name} budget?`}
            action={() => setBudgetActive(budget.id, false)}
          >
            Deactivate
          </ConfirmButton>
        ) : (
          <ConfirmButton
            className="text-accent hover:brightness-110"
            confirmMessage={`Reactivate the ${category.name} budget?`}
            action={() => setBudgetActive(budget.id, true)}
          >
            Reactivate
          </ConfirmButton>
        )}
        <ConfirmButton
          className="text-danger hover:brightness-110"
          confirmMessage={`Delete the ${category.name} budget?`}
          action={() => deleteBudget(budget.id)}
        >
          Delete
        </ConfirmButton>
      </div>
    </div>
  );
}

"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { InvestmentForm } from "@/components/forms/investment-form";
import { InvestmentContributionForm } from "@/components/forms/investment-contribution-form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { setInvestmentActive, deleteInvestment } from "@/lib/actions/investments";
import { fmtCurrency } from "@/lib/calculations";
import { INVESTMENT_TYPES, type Account, type Investment } from "@/lib/types";

export function InvestmentRow({
  investment,
  netInvested,
  accounts,
}: {
  investment: Investment;
  netInvested: number;
  accounts: Account[];
}) {
  const typeLabel = INVESTMENT_TYPES.find((t) => t.value === investment.type)?.label ?? investment.type;

  return (
    <div className={`rounded-xl border p-4 ${investment.is_active ? "border-border" : "border-border opacity-60"} bg-surface`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{investment.name}</div>
          <div className="mt-0.5 text-xs text-muted">
            {typeLabel}
            {!investment.is_active && " · inactive"}
          </div>
        </div>
        <div className="text-right font-bold">{fmtCurrency(netInvested)}</div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <Modal trigger={<Button size="sm">+ Add money</Button>} title={`Add money — ${investment.name}`}>
          <InvestmentContributionForm investment={investment} accounts={accounts} />
        </Modal>
        <Modal
          trigger={<button className="text-muted hover:text-foreground">Edit</button>}
          title="Edit investment"
        >
          <InvestmentForm investment={investment} />
        </Modal>
        {investment.is_active ? (
          <ConfirmButton
            className="text-muted hover:text-foreground"
            confirmMessage={`Deactivate "${investment.name}"?`}
            action={() => setInvestmentActive(investment.id, false)}
          >
            Deactivate
          </ConfirmButton>
        ) : (
          <ConfirmButton
            className="text-accent hover:brightness-110"
            confirmMessage={`Reactivate "${investment.name}"?`}
            action={() => setInvestmentActive(investment.id, true)}
          >
            Reactivate
          </ConfirmButton>
        )}
        <ConfirmButton
          className="text-danger hover:brightness-110"
          confirmMessage={`Delete "${investment.name}"? If it has contributions it will be deactivated instead.`}
          action={() => deleteInvestment(investment.id)}
        >
          Delete
        </ConfirmButton>
      </div>
    </div>
  );
}

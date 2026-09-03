"use client";

import { format, parseISO } from "date-fns";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { deleteInvestmentContribution } from "@/lib/actions/investments";
import { fmtCurrency } from "@/lib/calculations";
import type { InvestmentTransaction } from "@/lib/types";

export function ContributionRow({
  tx,
  investmentName,
}: {
  tx: InvestmentTransaction;
  investmentName: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <div>
        <div className="font-medium">{investmentName}</div>
        <div className="text-[11px] text-muted">{format(parseISO(tx.transaction_date), "dd MMM yyyy")}</div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`font-semibold ${tx.type === "invest" ? "text-success" : "text-danger"}`}>
          {tx.type === "invest" ? "+" : "−"}
          {fmtCurrency(tx.amount)}
        </span>
        <ConfirmButton
          className="text-xs text-muted hover:text-foreground"
          confirmMessage="Remove this contribution?"
          action={() => deleteInvestmentContribution(tx.id)}
        >
          Delete
        </ConfirmButton>
      </div>
    </div>
  );
}

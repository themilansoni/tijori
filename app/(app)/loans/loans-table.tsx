"use client";

import { format, parseISO } from "date-fns";
import { Modal } from "@/components/ui/modal";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { LoanForm } from "@/components/forms/loan-form";
import { setLoanActive, deleteLoan } from "@/lib/actions/loans";
import { calculateLoanPendingEmis, calculateLoanPaidAmount, fmtCurrency } from "@/lib/calculations";
import type { HouseholdMember, Loan } from "@/lib/types";

export function LoansTable({
  loans,
  members = [],
  onChanged,
}: {
  loans: Loan[];
  members?: HouseholdMember[];
  onChanged?: () => void;
}) {
  const memberById = new Map(members.map((m) => [m.id, m]));

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11.5px] font-medium uppercase tracking-wide text-muted">
            <th className="px-4 py-2.5">Loan</th>
            <th className="px-4 py-2.5 text-right">Outstanding</th>
            <th className="px-4 py-2.5 text-right">EMI / month</th>
            <th className="px-4 py-2.5 text-right">Pending EMIs</th>
            <th className="px-4 py-2.5">Next due</th>
            <th className="px-4 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {loans.map((loan) => {
            const pendingEmis = calculateLoanPendingEmis(loan);
            const paidAmount = calculateLoanPaidAmount(loan);
            return (
              <tr key={loan.id} className={loan.is_active ? "" : "opacity-50"}>
                <td className="px-4 py-3">
                  <div className="font-medium">{loan.name}</div>
                  <div className="text-[11px] text-muted">
                    {loan.interest_rate != null ? `${loan.interest_rate}% p.a.` : "No rate set"}
                    {loan.owner_id && memberById.has(loan.owner_id) && ` · ${memberById.get(loan.owner_id)!.name}`}
                    {paidAmount != null && ` · ${fmtCurrency(paidAmount)} paid off`}
                    {!loan.is_active && " · inactive"}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-medium">{fmtCurrency(loan.outstanding_amount)}</td>
                <td className="px-4 py-3 text-right">{fmtCurrency(loan.emi_amount)}</td>
                <td className="px-4 py-3 text-right">
                  {pendingEmis != null ? `${pendingEmis} of ${loan.tenure_months}` : "—"}
                </td>
                <td className="px-4 py-3 text-muted">
                  {loan.next_due_date ? format(parseISO(loan.next_due_date), "dd MMM yyyy") : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2.5 whitespace-nowrap text-xs">
                    <Modal
                      trigger={<button className="text-muted hover:text-foreground">Edit</button>}
                      title="Edit loan"
                    >
                      <LoanForm loan={loan} members={members} onSuccess={onChanged} />
                    </Modal>
                    {loan.is_active ? (
                      <ConfirmButton
                        className="text-muted hover:text-foreground"
                        confirmMessage={`Deactivate "${loan.name}"?`}
                        action={async () => {
                          const result = await setLoanActive(loan.id, false);
                          onChanged?.();
                          return result;
                        }}
                      >
                        Deactivate
                      </ConfirmButton>
                    ) : (
                      <ConfirmButton
                        className="text-accent hover:brightness-110"
                        confirmMessage={`Reactivate "${loan.name}"?`}
                        action={async () => {
                          const result = await setLoanActive(loan.id, true);
                          onChanged?.();
                          return result;
                        }}
                      >
                        Reactivate
                      </ConfirmButton>
                    )}
                    <ConfirmButton
                      className="text-danger hover:brightness-110"
                      confirmMessage={`Delete "${loan.name}"? If it has linked expenses it will be deactivated instead.`}
                      action={async () => {
                        const result = await deleteLoan(loan.id);
                        onChanged?.();
                        return result;
                      }}
                    >
                      Delete
                    </ConfirmButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

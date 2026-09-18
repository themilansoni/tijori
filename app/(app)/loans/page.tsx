"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { mapDocs } from "@/lib/firebase/collection-helpers";
import { useAuth } from "@/lib/auth-context";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { LoanForm } from "@/components/forms/loan-form";
import { LoansTable } from "./loans-table";
import { calculateLoanTotals, fmtCurrency } from "@/lib/calculations";
import type { HouseholdMember, Loan } from "@/lib/types";

export default function LoansPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const uid = user.uid;
    const [loanSnap, memberSnap] = await Promise.all([
      getDocs(collection(db, "users", uid, "loans")),
      getDocs(collection(db, "users", uid, "householdMembers")),
    ]);
    setLoans(mapDocs<Loan>(loanSnap).sort((a, b) => a.created_at.localeCompare(b.created_at)));
    setMembers(mapDocs<HouseholdMember>(memberSnap).sort((a, b) => a.created_at.localeCompare(b.created_at)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading || loading) return null;

  const totals = calculateLoanTotals(loans);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Loans</h1>
        <Modal trigger={<Button>+ Add loan</Button>} title="Add loan">
          <LoanForm members={members} onSuccess={load} />
        </Modal>
      </div>
      <p className="mt-2 text-muted">
        Track every loan's outstanding balance, EMI, and interest rate — link an expense to a loan and its
        EMI comes off the balance automatically.
      </p>

      {loans.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard label="Total Outstanding" value={fmtCurrency(totals.totalOutstanding)} tone="danger" />
          <StatCard label="Total Monthly EMI" value={fmtCurrency(totals.totalMonthlyEmi)} />
          <StatCard label="Active Loans" value={String(totals.activeCount)} />
        </div>
      )}

      <div className="mt-6">
        {loans.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-border p-12 text-center">
            <p className="mt-4 font-medium text-foreground">No loans yet</p>
            <p className="mt-1 text-[13.5px] text-muted">Add a home loan, car loan, or any other EMI you're paying off.</p>
            <div className="mt-4">
              <Modal trigger={<Button>+ Add loan</Button>} title="Add loan">
                <LoanForm members={members} onSuccess={load} />
              </Modal>
            </div>
          </div>
        ) : (
          <LoansTable loans={loans} members={members} onChanged={load} />
        )}
      </div>
    </div>
  );
}

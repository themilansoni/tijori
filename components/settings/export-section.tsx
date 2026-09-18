"use client";

import { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { mapDocs } from "@/lib/firebase/collection-helpers";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { toCsv, downloadFile, todayStamp } from "@/lib/export";
import {
  calculateInvestedAmount,
  calculateMarketValue,
  calculateUnrealizedPnL,
  calculateLoanPendingEmis,
} from "@/lib/calculations";
import { ASSET_TYPES } from "@/lib/types";
import type { Account, Category, HouseholdMember, InvestmentHolding, Loan, Transaction } from "@/lib/types";

const BACKUP_COLLECTIONS = [
  "transactions",
  "categories",
  "accounts",
  "budgets",
  "investmentHoldings",
  "investmentTransactions",
  "loans",
  "householdMembers",
  "recurringRules",
  "netWorthSnapshots",
  "fireProfile",
] as const;

type PendingAction = "backup" | "transactions" | "investments" | "loans" | null;

export function ExportSection() {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState<string | undefined>();

  async function run(action: Exclude<PendingAction, null>, fn: () => Promise<void>) {
    if (!user) return;
    setError(undefined);
    setPending(action);
    try {
      await fn();
    } catch {
      setError("Something went wrong building that file — try again.");
    } finally {
      setPending(null);
    }
  }

  function handleBackup() {
    run("backup", async () => {
      const uid = user!.uid;
      const snaps = await Promise.all(
        BACKUP_COLLECTIONS.map((c) => getDocs(collection(db, "users", uid, c)))
      );
      const data: Record<string, unknown[]> = {};
      BACKUP_COLLECTIONS.forEach((c, i) => {
        data[c] = snaps[i].docs.map((d) => ({ id: d.id, ...d.data() }));
      });
      const json = JSON.stringify({ exported_at: new Date().toISOString(), ...data }, null, 2);
      downloadFile(`tijori-backup-${todayStamp()}.json`, json, "application/json");
    });
  }

  function handleTransactionsCsv() {
    run("transactions", async () => {
      const uid = user!.uid;
      const [txSnap, catSnap, accSnap, loanSnap, memberSnap] = await Promise.all([
        getDocs(collection(db, "users", uid, "transactions")),
        getDocs(collection(db, "users", uid, "categories")),
        getDocs(collection(db, "users", uid, "accounts")),
        getDocs(collection(db, "users", uid, "loans")),
        getDocs(collection(db, "users", uid, "householdMembers")),
      ]);
      const catById = new Map(mapDocs<Category>(catSnap).map((c) => [c.id, c]));
      const accById = new Map(mapDocs<Account>(accSnap).map((a) => [a.id, a]));
      const loanById = new Map(mapDocs<Loan>(loanSnap).map((l) => [l.id, l]));
      const memberById = new Map(mapDocs<HouseholdMember>(memberSnap).map((m) => [m.id, m]));

      const rows = mapDocs<Transaction>(txSnap)
        .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date))
        .map((t) => ({
          date: t.transaction_date,
          type: t.type,
          category: catById.get(t.category_id)?.name ?? "",
          amount: t.amount,
          description: t.description ?? "",
          account: t.account_id ? accById.get(t.account_id)?.name ?? "" : "",
          payment_method: t.payment_method ?? "",
          loan: t.loan_id ? loanById.get(t.loan_id)?.name ?? "" : "",
          person: t.owner_id ? memberById.get(t.owner_id)?.name ?? "" : "",
          note: t.note ?? "",
        }));

      const csv = toCsv(rows, [
        { key: "date", label: "Date" },
        { key: "type", label: "Type" },
        { key: "category", label: "Category" },
        { key: "amount", label: "Amount" },
        { key: "description", label: "Description" },
        { key: "account", label: "Account" },
        { key: "payment_method", label: "Payment Method" },
        { key: "loan", label: "Loan" },
        { key: "person", label: "Person" },
        { key: "note", label: "Note" },
      ]);
      downloadFile(`tijori-transactions-${todayStamp()}.csv`, csv, "text/csv");
    });
  }

  function handleInvestmentsCsv() {
    run("investments", async () => {
      const uid = user!.uid;
      const [holdingSnap, memberSnap] = await Promise.all([
        getDocs(collection(db, "users", uid, "investmentHoldings")),
        getDocs(collection(db, "users", uid, "householdMembers")),
      ]);
      const memberById = new Map(mapDocs<HouseholdMember>(memberSnap).map((m) => [m.id, m]));

      const rows = mapDocs<InvestmentHolding>(holdingSnap)
        .sort((a, b) => a.instrument_name.localeCompare(b.instrument_name))
        .map((h) => {
          const invested = calculateInvestedAmount(h);
          const current = calculateMarketValue(h);
          const pnl = calculateUnrealizedPnL(h);
          return {
            name: h.instrument_name,
            type: ASSET_TYPES.find((t) => t.value === h.asset_type)?.label ?? h.asset_type,
            symbol: h.symbol ?? "",
            quantity: h.quantity,
            invested,
            current_value: current ?? "",
            pnl: pnl ?? "",
            person: h.owner_id ? memberById.get(h.owner_id)?.name ?? "" : "",
            active: h.is_active ? "yes" : "no",
          };
        });

      const csv = toCsv(rows, [
        { key: "name", label: "Name" },
        { key: "type", label: "Type" },
        { key: "symbol", label: "Symbol" },
        { key: "quantity", label: "Quantity" },
        { key: "invested", label: "Invested" },
        { key: "current_value", label: "Current Value" },
        { key: "pnl", label: "P&L" },
        { key: "person", label: "Person" },
        { key: "active", label: "Active" },
      ]);
      downloadFile(`tijori-investments-${todayStamp()}.csv`, csv, "text/csv");
    });
  }

  function handleLoansCsv() {
    run("loans", async () => {
      const uid = user!.uid;
      const loanSnap = await getDocs(collection(db, "users", uid, "loans"));
      const rows = mapDocs<Loan>(loanSnap)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((l) => ({
          name: l.name,
          interest_rate: l.interest_rate ?? "",
          principal: l.principal_amount ?? "",
          outstanding: l.outstanding_amount,
          emi: l.emi_amount,
          tenure_months: l.tenure_months ?? "",
          emis_paid: l.emis_paid,
          pending_emis: calculateLoanPendingEmis(l) ?? "",
          next_due_date: l.next_due_date ?? "",
          active: l.is_active ? "yes" : "no",
        }));

      const csv = toCsv(rows, [
        { key: "name", label: "Name" },
        { key: "interest_rate", label: "Interest Rate %" },
        { key: "principal", label: "Principal" },
        { key: "outstanding", label: "Outstanding" },
        { key: "emi", label: "EMI" },
        { key: "tenure_months", label: "Tenure (months)" },
        { key: "emis_paid", label: "EMIs Paid" },
        { key: "pending_emis", label: "Pending EMIs" },
        { key: "next_due_date", label: "Next Due Date" },
        { key: "active", label: "Active" },
      ]);
      downloadFile(`tijori-loans-${todayStamp()}.csv`, csv, "text/csv");
    });
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-muted">Data &amp; backup</h2>
      <p className="mt-1.5 text-[13px] text-muted">
        Everything stays on your device — these build the file locally and download it, nothing is
        sent anywhere.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={handleBackup} disabled={pending !== null}>
          {pending === "backup" ? "Building…" : "Full backup (JSON)"}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleTransactionsCsv} disabled={pending !== null}>
          {pending === "transactions" ? "Building…" : "Transactions (CSV)"}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleInvestmentsCsv} disabled={pending !== null}>
          {pending === "investments" ? "Building…" : "Investments (CSV)"}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleLoansCsv} disabled={pending !== null}>
          {pending === "loans" ? "Building…" : "Loans (CSV)"}
        </Button>
      </div>
      {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
    </section>
  );
}

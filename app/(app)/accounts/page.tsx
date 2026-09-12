"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { mapDocs } from "@/lib/firebase/collection-helpers";
import { useAuth } from "@/lib/auth-context";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { AccountForm } from "@/components/forms/account-form";
import { AccountRow } from "./account-row";
import { accountBalance, isCashAccount, totalCreditCardDues, fmtCurrency } from "@/lib/calculations";
import type { Account, Transaction } from "@/lib/types";

export default function AccountsPage() {
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const uid = user.uid;
    const [accSnap, txSnap] = await Promise.all([
      getDocs(collection(db, "users", uid, "accounts")),
      getDocs(collection(db, "users", uid, "transactions")),
    ]);
    setAccounts(mapDocs<Account>(accSnap).sort((a, b) => a.name.localeCompare(b.name)));
    setTransactions(mapDocs<Transaction>(txSnap));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading || loading) return null;

  const active = accounts.filter((a) => a.is_active);
  const inactive = accounts.filter((a) => !a.is_active);

  const balances = new Map(accounts.map((a) => [a.id, accountBalance(a, transactions)]));
  const netBalance = active
    .filter(isCashAccount)
    .reduce((sum, a) => sum + (balances.get(a.id) ?? 0), 0);
  const creditCardDues = totalCreditCardDues(active, transactions);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <Modal trigger={<Button>+ Add Account</Button>} title="Add account">
          <AccountForm onSuccess={load} />
        </Modal>
      </div>
      <p className="mt-2 text-muted">
        Balances are computed from opening balance plus income minus expenses linked to each
        account — never a stored/cached number.
      </p>

      {active.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:inline-grid sm:auto-cols-max sm:grid-flow-col">
          <StatCard label="Net Balance" value={fmtCurrency(netBalance)} tone={netBalance < 0 ? "danger" : "success"} />
          {creditCardDues > 0 && (
            <StatCard label="Credit Card Dues" value={fmtCurrency(creditCardDues)} tone="danger" />
          )}
        </div>
      )}

      <div className="mt-6">
        {accounts.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-border p-12 text-center">
            <p className="mt-4 font-medium text-foreground">No accounts yet</p>
            <p className="mt-1 text-[13.5px] text-muted">
              Add a cash, bank, or card account to track where your money is.
            </p>
            <div className="mt-4">
              <Modal trigger={<Button>+ Add Account</Button>} title="Add account">
                <AccountForm onSuccess={load} />
              </Modal>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {active.map((a) => (
              <AccountRow key={a.id} account={a} balance={balances.get(a.id) ?? 0} onChanged={load} />
            ))}
            {inactive.map((a) => (
              <AccountRow key={a.id} account={a} balance={balances.get(a.id) ?? 0} onChanged={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

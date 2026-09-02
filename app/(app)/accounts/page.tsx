import { createClient } from "@/lib/supabase/server";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { AccountForm } from "@/components/forms/account-form";
import { AccountRow } from "./account-row";
import { accountBalance, fmtCurrency } from "@/lib/calculations";
import type { Account, Transaction } from "@/lib/types";

export default async function AccountsPage() {
  const supabase = await createClient();

  const [{ data: accountsRaw }, { data: txRaw }] = await Promise.all([
    supabase.from("accounts").select("*").order("name"),
    supabase.from("transactions").select("*").not("account_id", "is", null),
  ]);

  const accounts = (accountsRaw ?? []) as Account[];
  const transactions = (txRaw ?? []) as Transaction[];

  const active = accounts.filter((a) => a.is_active);
  const inactive = accounts.filter((a) => !a.is_active);

  const balances = new Map(accounts.map((a) => [a.id, accountBalance(a, transactions)]));
  const netBalance = active.reduce((sum, a) => sum + (balances.get(a.id) ?? 0), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <Modal trigger={<Button>+ Add Account</Button>} title="Add account">
          <AccountForm />
        </Modal>
      </div>
      <p className="mt-2 text-muted">
        Balances are computed from opening balance plus income minus expenses linked to each
        account — never a stored/cached number.
      </p>

      {active.length > 0 && (
        <div className="mt-5">
          <StatCard label="Net Balance" value={fmtCurrency(netBalance)} tone={netBalance < 0 ? "danger" : "accent"} />
        </div>
      )}

      <div className="mt-6">
        {accounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-muted">No accounts yet.</p>
            <p className="mt-1 text-sm text-muted">
              Add a cash, bank, or card account to track where your money is.
            </p>
            <div className="mt-3">
              <Modal trigger={<Button>+ Add Account</Button>} title="Add account">
                <AccountForm />
              </Modal>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {active.map((a) => (
              <AccountRow key={a.id} account={a} balance={balances.get(a.id) ?? 0} />
            ))}
            {inactive.map((a) => (
              <AccountRow key={a.id} account={a} balance={balances.get(a.id) ?? 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { Modal } from "@/components/ui/modal";
import { AccountForm } from "@/components/forms/account-form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { setAccountActive, deleteAccount } from "@/lib/actions/accounts";
import { fmtCurrency } from "@/lib/calculations";
import { ACCOUNT_TYPES, type Account } from "@/lib/types";

export function AccountRow({ account, balance }: { account: Account; balance: number }) {
  const typeLabel = ACCOUNT_TYPES.find((t) => t.value === account.type)?.label ?? account.type;

  return (
    <div className={`rounded-xl border p-4 ${account.is_active ? "border-border" : "border-border opacity-60"} bg-surface`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{account.name}</div>
          <div className="mt-0.5 text-xs text-muted">
            {typeLabel}
            {!account.is_active && " · inactive"}
          </div>
        </div>
        <div className={`text-right font-bold ${balance < 0 ? "text-danger" : ""}`}>
          {fmtCurrency(balance)}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs">
        <Modal
          trigger={<button className="text-muted hover:text-foreground">Edit</button>}
          title="Edit account"
        >
          <AccountForm account={account} />
        </Modal>
        {account.is_active ? (
          <ConfirmButton
            className="text-muted hover:text-foreground"
            confirmMessage={`Deactivate "${account.name}"?`}
            action={() => setAccountActive(account.id, false)}
          >
            Deactivate
          </ConfirmButton>
        ) : (
          <ConfirmButton
            className="text-accent hover:brightness-110"
            confirmMessage={`Reactivate "${account.name}"?`}
            action={() => setAccountActive(account.id, true)}
          >
            Reactivate
          </ConfirmButton>
        )}
        <ConfirmButton
          className="text-danger hover:brightness-110"
          confirmMessage={`Delete "${account.name}"? If it has transactions it will be deactivated instead.`}
          action={() => deleteAccount(account.id)}
        >
          Delete
        </ConfirmButton>
      </div>
    </div>
  );
}

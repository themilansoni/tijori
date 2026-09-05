"use client";

import { useState, useTransition } from "react";
import { createRole, deleteRole, setRolePermission } from "@/lib/actions/roles";
import { ConfirmButton } from "@/components/ui/confirm-button";
import type { PermAction, Permission, Role } from "@/lib/types";

const ACTIONS: PermAction[] = ["view", "create", "edit", "delete", "sync", "connect"];

const MODULE_ORDER = [
  "dashboard",
  "expenses",
  "income",
  "budgets",
  "categories",
  "accounts",
  "investments",
  "users",
  "roles",
  "settings",
  "reports",
];

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  expenses: "Expenses",
  income: "Income",
  budgets: "Budgets",
  categories: "Categories",
  accounts: "Accounts",
  investments: "Investments",
  users: "Users",
  roles: "Roles",
  settings: "Settings",
  reports: "Reports",
};

export function RolesPanel({
  roles,
  permissions,
  grantedByRole,
}: {
  roles: Role[];
  permissions: Permission[];
  grantedByRole: Record<string, string[]>;
}) {
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id ?? "");
  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const granted = new Set(grantedByRole[selectedRoleId] ?? []);

  const permByModuleAction = new Map<string, Permission>();
  for (const p of permissions) permByModuleAction.set(`${p.module}:${p.action}`, p);
  const modules = MODULE_ORDER.filter((m) => permissions.some((p) => p.module === m));

  return (
    <div>
      <p className="text-sm text-muted">
        Changes apply immediately for new sign-ins, but a signed-in user&apos;s permissions are cached in
        their session for up to an hour.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {roles.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRoleId(r.id)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
              r.id === selectedRoleId
                ? "bg-accent text-accent-foreground"
                : "border border-border text-muted hover:text-foreground"
            }`}
          >
            {r.name}
          </button>
        ))}
        <NewRoleButton />
      </div>

      {selectedRole && (
        <>
          <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11.5px] font-medium uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5">Module</th>
                  {ACTIONS.map((a) => (
                    <th key={a} className="px-4 py-2.5 text-center capitalize">
                      {a}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {modules.map((m) => (
                  <tr key={m}>
                    <td className="px-4 py-2.5 font-medium">{MODULE_LABELS[m] ?? m}</td>
                    {ACTIONS.map((a) => {
                      const perm = permByModuleAction.get(`${m}:${a}`);
                      return (
                        <td key={a} className="px-4 py-2.5 text-center">
                          {perm ? (
                            <PermCheckbox
                              key={`${selectedRoleId}:${perm.id}`}
                              roleId={selectedRoleId}
                              permissionId={perm.id}
                              checked={granted.has(perm.id)}
                            />
                          ) : (
                            <span className="text-border-strong">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!selectedRole.is_system && (
            <div className="mt-4">
              <ConfirmButton
                className="text-xs text-danger hover:brightness-110"
                confirmMessage={`Delete role "${selectedRole.name}"? Users with this role must be reassigned first.`}
                action={async () => {
                  const result = await deleteRole(selectedRole.id);
                  if ("error" in result && result.error) window.alert(result.error);
                  else setSelectedRoleId(roles[0]?.id ?? "");
                }}
              >
                Delete this role
              </ConfirmButton>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PermCheckbox({
  roleId,
  permissionId,
  checked,
}: {
  roleId: string;
  permissionId: string;
  checked: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <input
      type="checkbox"
      defaultChecked={checked}
      disabled={pending}
      onChange={(e) => {
        const grant = e.target.checked;
        startTransition(async () => {
          await setRolePermission(roleId, permissionId, grant);
        });
      }}
      className="h-4 w-4 cursor-pointer accent-[var(--color-accent)]"
    />
  );
}

function NewRoleButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-dashed border-border-strong px-3.5 py-1.5 text-[13px] font-medium text-muted transition hover:text-foreground"
      >
        + New role
      </button>
    );
  }

  return (
    <form
      className="flex items-center gap-2"
      action={(formData) => {
        setError(undefined);
        startTransition(async () => {
          const result = await createRole(formData);
          if ("error" in result) {
            setError(result.error);
            return;
          }
          setOpen(false);
        });
      }}
    >
      <input
        name="name"
        autoFocus
        placeholder="Role name"
        required
        className="rounded-full border border-border bg-surface-2 px-3.5 py-1.5 text-[13px] text-foreground focus:outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-accent-foreground disabled:opacity-60"
      >
        Add
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-[13px] text-muted hover:text-foreground">
        Cancel
      </button>
      {error && <span className="text-[12px] text-danger">{error}</span>}
    </form>
  );
}

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { can } from "@/lib/authorize";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AddUserForm } from "@/components/users/add-user-form";
import { UserRow } from "@/components/users/user-row";
import { RolesPanel } from "@/components/users/roles-panel";
import { UsersTabs } from "@/components/users/users-tabs";
import type { Permission, Profile, Role } from "@/lib/types";

export default async function UsersPage() {
  const supabase = await createClient();

  if (!(await can("users", "view", supabase))) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted">
        You don&apos;t have permission to view this page.
      </div>
    );
  }

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const [{ data: profilesRaw }, { data: rolesRaw }, { data: permissionsRaw }, { data: rolePermsRaw }, canCreate] =
    await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("roles").select("*").order("created_at"),
      supabase.from("permissions").select("*").order("module"),
      supabase.from("role_permissions").select("role_id, permission_id"),
      can("users", "create", supabase),
    ]);

  const profiles = (profilesRaw ?? []) as Profile[];
  const roles = (rolesRaw ?? []) as Role[];
  const permissions = (permissionsRaw ?? []) as Permission[];

  const grantedByRole: Record<string, string[]> = {};
  for (const rp of rolePermsRaw ?? []) {
    (grantedByRole[rp.role_id] ??= []).push(rp.permission_id);
  }

  const admin = createAdminClient();
  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 200 });
  const emailById = new Map((listed?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        {canCreate && (
          <Modal trigger={<Button>+ Add user</Button>} title="Add user">
            <AddUserForm roles={roles} />
          </Modal>
        )}
      </div>
      <p className="mt-2 text-muted">
        Manage who has access to Tijori and what they&apos;re allowed to do. Deactivating keeps a user&apos;s
        history intact — accounts are never deleted.
      </p>

      <UsersTabs
        people={
          profiles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
              No users found.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {profiles.map((p) => (
                <UserRow
                  key={p.id}
                  profile={p}
                  email={emailById.get(p.id) ?? p.full_name ?? p.id}
                  roles={roles}
                  isSelf={p.id === currentUser?.id}
                />
              ))}
            </div>
          )
        }
        roles={<RolesPanel roles={roles} permissions={permissions} grantedByRole={grantedByRole} />}
      />
    </div>
  );
}

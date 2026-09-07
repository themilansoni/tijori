"use client";

import { useState, useTransition } from "react";
import { updateUserProfile, setUserActive } from "@/lib/actions/users";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ResetPasswordButton } from "@/components/users/reset-password-button";
import type { Profile, Role } from "@/lib/types";

export function UserRow({
  profile,
  email,
  roles,
  isSelf,
}: {
  profile: Profile;
  email: string;
  roles: Role[];
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleRoleChange(roleId: string) {
    setError(undefined);
    const formData = new FormData();
    formData.set("id", profile.id);
    formData.set("full_name", profile.full_name ?? email);
    formData.set("role_id", roleId);
    startTransition(async () => {
      const result = await updateUserProfile(formData);
      if ("error" in result && result.error) setError(result.error);
    });
  }

  return (
    <div className={`rounded-xl border p-4 ${profile.status === "active" ? "border-border" : "border-border opacity-60"} bg-surface`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold">
            {profile.full_name || email}
            {isSelf && <span className="ml-1.5 text-xs font-normal text-muted">(you)</span>}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {email}
            {profile.status === "inactive" && " · inactive"}
          </div>
        </div>

        <select
          value={profile.role_id ?? ""}
          disabled={pending}
          onChange={(e) => handleRoleChange(e.target.value)}
          className="cursor-pointer rounded-[9px] border border-border bg-surface-2 px-3 py-1.5 text-[13px] text-foreground transition hover:border-border-strong focus:outline-none focus:border-accent"
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-2 text-[12.5px] text-danger">{error}</p>}

      <div className="mt-3 flex items-center gap-3 text-xs">
        <ResetPasswordButton userId={profile.id} name={profile.full_name || email} />
        {!isSelf &&
          (profile.status === "active" ? (
            <ConfirmButton
              className="text-muted hover:text-foreground"
              confirmMessage={`Deactivate "${profile.full_name || email}"? They won't be able to sign in.`}
              action={() => setUserActive(profile.id, false)}
            >
              Deactivate
            </ConfirmButton>
          ) : (
            <ConfirmButton
              className="text-accent hover:brightness-110"
              confirmMessage={`Reactivate "${profile.full_name || email}"?`}
              action={() => setUserActive(profile.id, true)}
            >
              Reactivate
            </ConfirmButton>
          ))}
      </div>
    </div>
  );
}

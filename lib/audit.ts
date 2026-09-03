import { createClient } from "@/lib/supabase/server";

export async function logAudit(params: {
  action: string;
  targetType?: string;
  targetId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("audit_logs").insert({
    actor_user_id: user.id,
    action: params.action,
    target_type: params.targetType ?? null,
    target_id: params.targetId ?? null,
    summary: params.summary,
    metadata: params.metadata ?? null,
  });
}

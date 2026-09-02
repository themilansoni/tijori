export function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "accent" | "success" | "danger";
}) {
  const valueColor =
    tone === "accent"
      ? "text-accent"
      : tone === "success"
      ? "text-success"
      : tone === "danger"
      ? "text-danger"
      : "text-foreground";

  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface px-5 py-4 shadow-[var(--shadow-sm)]">
      <div className="text-[11.5px] font-medium uppercase tracking-[0.5px] text-muted">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold tracking-tight ${valueColor}`}>{value}</div>
      {sub && <div className="mt-1 text-[12.5px] text-muted">{sub}</div>}
    </div>
  );
}

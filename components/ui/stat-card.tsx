export function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "accent" | "danger";
}) {
  const valueColor =
    tone === "accent" ? "text-accent" : tone === "danger" ? "text-danger" : "text-foreground";

  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3.5">
      <div className="font-mono text-[10.5px] font-medium uppercase tracking-[0.5px] text-muted">
        {label}
      </div>
      <div className={`mt-1.5 text-xl font-bold ${valueColor}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

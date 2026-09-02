export function Field({
  label,
  ...props
}: React.ComponentProps<"input"> & { label: string }) {
  return (
    <label className="block mt-[18px] first:mt-0">
      <span className="block font-mono text-[10.5px] font-medium tracking-[1px] uppercase text-muted">
        {label}
      </span>
      <input
        {...props}
        className="mt-2 w-full rounded-[9px] border border-border bg-white/[0.03] px-[13px] py-3 text-[14px] text-foreground placeholder:text-[#55575f] transition focus:outline-none focus:bg-white/[0.045] focus:border-accent focus:shadow-[0_0_0_3px_rgba(43,255,176,0.14)]"
      />
    </label>
  );
}

export function SelectField({
  label,
  children,
  ...props
}: React.ComponentProps<"select"> & { label: string }) {
  return (
    <label className="block mt-[18px] first:mt-0">
      <span className="block font-mono text-[10.5px] font-medium tracking-[1px] uppercase text-muted">
        {label}
      </span>
      <select
        {...props}
        className="mt-2 w-full rounded-[9px] border border-border bg-white/[0.03] px-[13px] py-3 text-[14px] text-foreground transition focus:outline-none focus:bg-white/[0.045] focus:border-accent focus:shadow-[0_0_0_3px_rgba(43,255,176,0.14)]"
      >
        {children}
      </select>
    </label>
  );
}

export function TextareaField({
  label,
  ...props
}: React.ComponentProps<"textarea"> & { label: string }) {
  return (
    <label className="block mt-[18px] first:mt-0">
      <span className="block font-mono text-[10.5px] font-medium tracking-[1px] uppercase text-muted">
        {label}
      </span>
      <textarea
        {...props}
        className="mt-2 w-full rounded-[9px] border border-border bg-white/[0.03] px-[13px] py-3 text-[14px] text-foreground placeholder:text-[#55575f] transition focus:outline-none focus:bg-white/[0.045] focus:border-accent focus:shadow-[0_0_0_3px_rgba(43,255,176,0.14)]"
      />
    </label>
  );
}

export function SubmitButton({
  children,
  pending,
}: {
  children: React.ReactNode;
  pending?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-7 w-full rounded-[10px] bg-accent px-4 py-[13px] text-[14.5px] font-bold text-accent-foreground transition hover:shadow-[0_0_28px_rgba(43,255,176,0.45)] hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-3 font-mono text-[11.5px] text-danger">{message}</p>
  );
}

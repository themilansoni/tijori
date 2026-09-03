export function Field({
  label,
  ...props
}: React.ComponentProps<"input"> & { label: string }) {
  return (
    <label className="block mt-5 first:mt-0">
      <span className="block text-[12.5px] font-medium tracking-[0.2px] text-muted">
        {label}
      </span>
      <input
        {...props}
        className="mt-1.5 w-full rounded-[10px] border border-border bg-surface-2 px-[14px] py-3 text-[14.5px] text-foreground placeholder:text-muted/60 transition focus:outline-none focus:bg-surface focus:border-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.16)]"
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
    <label className="block mt-5 first:mt-0">
      <span className="block text-[12.5px] font-medium tracking-[0.2px] text-muted">
        {label}
      </span>
      <select
        {...props}
        className="mt-1.5 w-full cursor-pointer rounded-[10px] border border-border bg-surface-2 px-[14px] py-3 text-[14.5px] text-foreground transition hover:border-border-strong focus:outline-none focus:bg-surface focus:border-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.16)]"
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
    <label className="block mt-5 first:mt-0">
      <span className="block text-[12.5px] font-medium tracking-[0.2px] text-muted">
        {label}
      </span>
      <textarea
        {...props}
        className="mt-1.5 w-full rounded-[10px] border border-border bg-surface-2 px-[14px] py-3 text-[14.5px] text-foreground placeholder:text-muted/60 transition focus:outline-none focus:bg-surface focus:border-accent focus:shadow-[0_0_0_3px_rgba(79,70,229,0.16)]"
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
      className="mt-7 w-full rounded-[10px] bg-accent px-4 py-[13px] text-[14.5px] font-semibold text-accent-foreground transition hover:brightness-95 active:brightness-90 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-3 text-[12.5px] text-danger">{message}</p>;
}

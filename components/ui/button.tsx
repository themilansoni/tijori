import Link from "next/link";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed";

const variants = {
  primary: "bg-accent text-accent-foreground hover:brightness-105 hover:shadow-[0_0_20px_rgba(43,255,176,0.35)]",
  ghost: "border border-border text-muted hover:text-foreground hover:border-white/20",
  danger: "border border-danger/40 text-danger hover:bg-danger/10",
};

const sizes = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <button
      {...props}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    />
  );
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className = "",
  href,
  children,
}: {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </Link>
  );
}

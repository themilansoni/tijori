import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/actions/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/expenses", label: "Expenses" },
  { href: "/income", label: "Income" },
  { href: "/budgets", label: "Budgets" },
  { href: "/settings", label: "Settings" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_2px_rgba(43,255,176,0.7)]" />
            <span className="font-mono text-[13px] font-medium tracking-[3px] text-muted">
              TIJORI
            </span>
          </div>

          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm text-muted transition hover:bg-surface hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <span className="hidden sm:block font-mono text-[11px] text-muted">
              {user?.email}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md border border-border px-3 py-1.5 text-[13px] text-muted transition hover:text-foreground hover:border-white/20"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

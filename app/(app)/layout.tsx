import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/actions/auth";
import { can } from "@/lib/authorize";
import { TijoriMark } from "@/components/ui/tijori-mark";
import { SidebarNav } from "@/components/nav/sidebar-nav";
import { MobileNav } from "@/components/nav/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";

function LogoutForm() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="flex w-full items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 text-[14px] text-nav-muted transition hover:bg-foreground/5 hover:text-nav-foreground"
      >
        <LogOut size={17} strokeWidth={1.75} />
        Logout
      </button>
    </form>
  );
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canViewUsers = await can("users", "view");
  const hiddenHrefs = canViewUsers ? [] : ["/users"];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground lg:flex-row">
      <aside className="hidden w-64 shrink-0 flex-col bg-nav-bg px-4 py-6 text-nav-foreground lg:sticky lg:top-0 lg:flex lg:h-screen lg:border-r lg:border-nav-border">
        <div className="flex items-center gap-2.5 px-2">
          <TijoriMark size={28} className="rounded-[8px]" />
          <span className="text-[16px] font-semibold tracking-tight">Tijori</span>
        </div>

        <div className="mt-8 flex-1">
          <SidebarNav hiddenHrefs={hiddenHrefs} />
        </div>

        <div className="border-t border-nav-border pt-3">
          <div className="mb-2 px-1">
            <ThemeToggle />
          </div>
          {user?.email && (
            <div className="mb-1.5 truncate px-3.5 text-[12px] text-nav-muted">{user.email}</div>
          )}
          <LogoutForm />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <MobileNav userEmail={user?.email} logoutForm={<LogoutForm />} hiddenHrefs={hiddenHrefs} />
        <main className="mx-auto max-w-4xl px-5 py-7 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}

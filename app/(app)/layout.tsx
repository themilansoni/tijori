"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth-context";
import { TijoriLogo } from "@/components/ui/tijori-logo";
import { SidebarNav } from "@/components/nav/sidebar-nav";
import { MobileNav } from "@/components/nav/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";

function LogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await signOut(auth);
        router.replace("/login");
      }}
      className="flex w-full items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 text-[14px] text-nav-muted transition hover:bg-foreground/5 hover:text-nav-foreground"
    >
      <LogOut size={17} strokeWidth={1.75} />
      Logout
    </button>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground lg:flex-row">
      <aside className="hidden w-64 shrink-0 flex-col bg-nav-bg px-4 py-6 text-nav-foreground lg:sticky lg:top-0 lg:flex lg:h-screen lg:border-r lg:border-nav-border">
        <div className="px-2">
          <TijoriLogo height={22} />
        </div>

        <div className="mt-8 flex-1">
          <SidebarNav />
        </div>

        <div className="border-t border-nav-border pt-3">
          <div className="mb-2 px-1">
            <ThemeToggle />
          </div>
          {user.email && (
            <div className="mb-1.5 truncate px-3.5 text-[12px] text-nav-muted">{user.email}</div>
          )}
          <LogoutButton />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <MobileNav userEmail={user.email ?? undefined} logoutForm={<LogoutButton />} />
        <main className="mx-auto max-w-4xl px-5 py-7 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}

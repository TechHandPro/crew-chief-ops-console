import { FileText, HardHat, KeyRound, LayoutDashboard, LogOut, Ticket } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { signOutAction } from "@/app/sign-in/actions";
import { getConfig } from "@/lib/config";

import { ConnectionBadge, ConnectionBadgeSkeleton } from "./connection-badge";
import { NavLink } from "./nav-link";

const NAV: Array<{ href: Route; label: string; icon: ReactNode }> = [
  { href: "/", label: "Overview", icon: <LayoutDashboard className="size-4" aria-hidden /> },
  { href: "/tickets", label: "Tickets", icon: <Ticket className="size-4" aria-hidden /> },
  { href: "/documents", label: "Documents", icon: <FileText className="size-4" aria-hidden /> },
  { href: "/vault", label: "Vault", icon: <KeyRound className="size-4" aria-hidden /> },
];

export function AppShell({ children, showSignOut }: { children: ReactNode; showSignOut: boolean }) {
  const { brandName, brandTagline } = getConfig();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-border bg-bg-subtle/60 lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex h-full flex-col gap-6 px-4 py-4 lg:px-4 lg:py-6">
          <Link href="/" className="flex items-center gap-2.5 px-1">
            <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-fg shadow-sm">
              <HardHat className="size-4.5" aria-hidden />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-tight text-fg">{brandName}</span>
              <span className="block text-[11px] text-fg-muted">{brandTagline}</span>
            </span>
          </Link>

          <nav aria-label="Primary" className="flex gap-1 overflow-x-auto lg:flex-col">
            {NAV.map((item) => (
              <NavLink key={item.href} href={item.href} icon={item.icon}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden flex-1 lg:block" />

          <div className="hidden space-y-2 lg:block">
            <Suspense fallback={<ConnectionBadgeSkeleton />}>
              <ConnectionBadge />
            </Suspense>
            {showSignOut ? (
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-muted transition hover:bg-bg-elevated hover:text-fg"
                >
                  <LogOut className="size-4" aria-hidden />
                  Sign out
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </aside>

      <main className="min-w-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}

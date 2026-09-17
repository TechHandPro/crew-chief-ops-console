"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function NavLink({ href, icon, children }: { href: Route; icon: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
        active ? "bg-bg-elevated text-fg shadow-card" : "text-fg-muted hover:bg-bg-elevated/70 hover:text-fg",
      )}
    >
      <span className={cn("text-fg-faint transition group-hover:text-fg-muted", active && "text-accent")}>{icon}</span>
      {children}
    </Link>
  );
}

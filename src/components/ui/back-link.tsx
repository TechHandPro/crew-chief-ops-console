import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

export function BackLink({ href, children }: { href: Route; children: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm text-fg-muted transition hover:text-fg">
      <ArrowLeft className="size-4" aria-hidden />
      {children}
    </Link>
  );
}

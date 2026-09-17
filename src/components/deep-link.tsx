import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * A link out of the console into the system of record. Always opens in a
 * new tab with no referrer or opener, since the target is a separate,
 * authenticated application.
 */
export function DeepLink({
  href,
  label,
  variant = "button",
  className,
}: {
  href: string | null;
  label: string;
  variant?: "button" | "inline";
  className?: string;
}) {
  if (!href) return null;

  if (variant === "inline") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer external"
        className={cn("inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline", className)}
      >
        {label}
        <ArrowUpRight className="size-3.5" aria-hidden />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer external"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg shadow-sm transition hover:brightness-110 active:brightness-95",
        className,
      )}
    >
      {label}
      <ArrowUpRight className="size-4" aria-hidden />
    </a>
  );
}

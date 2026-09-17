import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared list-row chrome. On narrow viewports the leading mark and timestamp
 * sit on one line and the body stacks beneath; from `sm` it is a three-column
 * row. Nothing here sets a table-like min-width.
 */
export function RecordRow({
  href,
  leading,
  trailing,
  children,
}: {
  /** App-router path. Typed as string so `/tickets/${id}` interpolations typecheck. Omit for static rows. */
  href?: string;
  leading: ReactNode;
  trailing: ReactNode;
  children: ReactNode;
}) {
  const chrome = href
    ? "group flex min-w-0 flex-col gap-2 px-4 py-3.5 transition hover:bg-bg-subtle/60 sm:flex-row sm:items-start sm:gap-4 sm:px-5"
    : "flex min-w-0 flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-start sm:gap-4 sm:px-5";

  const body = (
    <>
      <span className="flex items-start justify-between gap-3 sm:contents">
        <span className="shrink-0 sm:order-1">{leading}</span>
        <span className="shrink-0 sm:order-3">{trailing}</span>
      </span>
      <span className="min-w-0 flex-1 sm:order-2">{children}</span>
    </>
  );

  return (
    <li className="min-w-0">
      {href ? (
        <Link href={href as Route} className={chrome}>
          {body}
        </Link>
      ) : (
        <div className={chrome}>{body}</div>
      )}
    </li>
  );
}

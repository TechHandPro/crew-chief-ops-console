import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1.5 text-xs font-medium tracking-wide text-fg-muted uppercase">{eyebrow}</div> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-fg text-balance">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

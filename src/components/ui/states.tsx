import { AlertTriangle, Inbox, KeyRound, PlugZap, ShieldAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { SystemOfRecordError } from "@/lib/sor";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="mb-1 grid size-10 place-items-center rounded-full bg-bg-subtle text-fg-muted">
        <Icon className="size-5" aria-hidden />
      </div>
      <p className="text-sm font-medium text-fg">{title}</p>
      {description ? <p className="max-w-sm text-sm text-fg-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/**
 * Provider-neutral copy. The adapter's own message (shown beneath) names the
 * concrete system and any environment variable an operator should check.
 */
const ERROR_COPY: Record<SystemOfRecordError["kind"], { icon: LucideIcon; title: string; hint: string }> = {
  unreachable: {
    icon: PlugZap,
    title: "Can't reach the system of record",
    hint: "The MCP endpoint did not answer. Check the configured endpoint URL, network egress from this host, and that the MCP service is running.",
  },
  unauthorized: {
    icon: KeyRound,
    title: "The system of record rejected our API key",
    hint: "The endpoint returned 401. Rotate or re-issue the API key configured for this console and restart it.",
  },
  forbidden: {
    icon: ShieldAlert,
    title: "The API key is missing a permission",
    hint: "Grant the read scopes this console needs on the existing key (see the adapter's README section) without rotating it.",
  },
  bad_response: {
    icon: AlertTriangle,
    title: "Unexpected response from the system of record",
    hint: "The payload did not match the shape this console expects. The read was discarded rather than rendered partially.",
  },
  upstream: {
    icon: AlertTriangle,
    title: "The system of record reported an error",
    hint: "The tool call completed but the system of record returned a failure. Its message is shown below.",
  },
};

export function ErrorState({ error }: { error: unknown }) {
  const known = error instanceof SystemOfRecordError ? ERROR_COPY[error.kind] : null;
  const Icon = known?.icon ?? AlertTriangle;
  const message = error instanceof Error ? error.message : String(error);

  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="mb-1 grid size-10 place-items-center rounded-full bg-danger-soft text-danger">
        <Icon className="size-5" aria-hidden />
      </div>
      <p className="text-sm font-medium text-fg">{known?.title ?? "Something went wrong while reading"}</p>
      <p className="max-w-md text-sm text-fg-muted">{known?.hint ?? "The read failed. Try again in a moment."}</p>
      <pre className="mt-2 max-w-full overflow-x-auto rounded-md border border-border bg-bg-subtle px-3 py-2 text-left font-mono text-xs text-fg-muted">
        {message}
      </pre>
    </div>
  );
}

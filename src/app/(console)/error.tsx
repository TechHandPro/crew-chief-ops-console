"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export default function ConsoleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[ops-console] route error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="grid place-items-center py-24">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-danger-soft text-danger">
          <AlertTriangle className="size-5" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold text-fg">This page failed to render</h1>
        <p className="mt-1 text-sm text-fg-muted">
          The error has been logged on the server{error.digest ? ` (digest ${error.digest})` : ""}. Nothing was
          written to the system of record.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm font-medium text-fg shadow-sm hover:bg-bg-subtle"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

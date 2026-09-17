import { SearchX } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid place-items-center py-24">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-bg-subtle text-fg-muted">
          <SearchX className="size-5" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold text-fg">Not found</h1>
        <p className="mt-1 text-sm text-fg-muted">
          That record does not exist in the connected system of record, or the connected key cannot see it.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm font-medium text-fg shadow-sm hover:bg-bg-subtle"
        >
          Back to overview
        </Link>
      </div>
    </div>
  );
}

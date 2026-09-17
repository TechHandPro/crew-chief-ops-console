"use client";

import { LockKeyhole } from "lucide-react";
import { useActionState } from "react";

import { signInAction, type SignInFormState } from "./actions";

const initialState: SignInFormState = { error: null };

export function SignInForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-fg">Operator access token</span>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-faint" aria-hidden />
          <input
            name="token"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            spellCheck={false}
            className="w-full rounded-lg border border-border bg-bg-elevated py-2.5 pr-3 pl-9 font-mono text-sm text-fg shadow-sm outline-none placeholder:text-fg-faint focus:border-ring"
            placeholder="Paste the token shared by your ops lead"
          />
        </div>
      </label>

      {state.error ? (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-accent-fg shadow-sm transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Checking…" : "Open the console"}
      </button>
    </form>
  );
}

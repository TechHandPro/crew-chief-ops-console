import { HardHat } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAccessState } from "@/lib/auth/access";
import { getConfig } from "@/lib/config";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const state = await getAccessState();
  if (state.mode === "anonymous" || state.session) {
    redirect("/");
  }

  const params = await searchParams;
  const rawNext = typeof params.next === "string" ? params.next : "/";
  const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const { brandName, brandTagline } = getConfig();

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-fg shadow-sm">
            <HardHat className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-fg">{brandName}</h1>
            <p className="text-sm text-fg-muted">{brandTagline}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-bg-elevated p-5 shadow-card">
          <SignInForm nextPath={nextPath} />
        </div>

        <p className="mt-4 text-center text-xs text-fg-faint">
          Sessions are signed, HttpOnly cookies. Nothing in this console can create, edit, or reveal.
        </p>
      </div>
    </main>
  );
}

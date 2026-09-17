"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { signInWithAccessToken, signOut } from "@/lib/auth/access";

export interface SignInFormState {
  error: string | null;
}

/** Only same-origin relative paths are accepted as a post-sign-in target. */
function safeNextPath(raw: FormDataEntryValue | null): Route {
  if (typeof raw !== "string") return "/";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/";
  return raw as Route;
}

export async function signInAction(_previous: SignInFormState, formData: FormData): Promise<SignInFormState> {
  const token = formData.get("token");
  if (typeof token !== "string" || token.trim().length === 0) {
    return { error: "Enter the operator access token." };
  }

  const result = await signInWithAccessToken(token);
  if (!result.ok) {
    switch (result.reason) {
      case "rate_limited":
        return { error: "Too many attempts. Wait 15 minutes and try again." };
      case "not_configured":
        return { error: "This console is not configured for token sign-in." };
      case "invalid":
        return { error: "That token was not accepted." };
      default: {
        const exhaustive: never = result.reason;
        return { error: `Unexpected sign-in failure: ${String(exhaustive)}` };
      }
    }
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/sign-in");
}

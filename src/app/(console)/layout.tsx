import { AppShell } from "@/components/shell/app-shell";
import { getAccessState, requireAccess } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: LayoutProps<"/">) {
  await requireAccess();
  const access = await getAccessState();

  return <AppShell showSignOut={access.mode === "token"}>{children}</AppShell>;
}

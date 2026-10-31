import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PrivateWorkspace } from "@/components/private-workspace";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireUser } from "@/lib/auth/require-user";
import { SessionError } from "@/lib/auth/session-policy";

export const dynamic = "force-dynamic";

/**
 * Auth gate for every workspace route (/dashboard, /add, /history,
 * /compare, /settings). The proxy guards these paths too; this layout is
 * the second line of defense (Server Functions and direct handler calls
 * can bypass the proxy matcher).
 *
 * The route-group layout stays mounted across client navigations, so the
 * WorkspaceShell inside PrivateWorkspace keeps its state while the URL
 * moves between the five routes. The routed `children` are placeholder
 * pages (the shell renders the view content from its own state), so they
 * are intentionally not mounted here.
 */
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  void children;
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof SessionError && error.status === 401)
      redirect("/");
    redirect("/?error=unavailable");
  }
  const defaultSidebarOpen =
    (await cookies()).get("sidebar_state")?.value !== "false";
  return (
    <PrivateWorkspace key={user.id} userId={user.id}>
        <WorkspaceShell
          defaultSidebarOpen={defaultSidebarOpen}
          authEnabled={process.env.GOOGLE_AUTH_ENABLED === "true"}
          userEmail={user.email ?? ""}
          userName={user.name ?? ""}
          userImage={user.image ?? ""}
        />
    </PrivateWorkspace>
  );
}

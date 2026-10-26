import { redirect } from "next/navigation";
import { Landing } from "@/components/landing";
import { requireUser } from "@/lib/auth/require-user";

export const dynamic = "force-dynamic";

/**
 * Public landing page. The proxy leaves "/" ungated; this page sends
 * signed-in visitors straight to the workspace, so the landing is never
 * shown again after sign-in. Anonymous visitors (and sessions that can't
 * be verified right now) get the public landing with the sign-in entry.
 */
export default async function LandingPage() {
  let signedIn = false;
  try {
    await requireUser();
    signedIn = true;
  } catch {
    // 401 → anonymous; anything else → auth unavailable. Both see the
    // public landing rather than an error page.
  }
  if (signedIn) redirect("/dashboard");
  return <Landing signInHref="/sign-in" />;
}

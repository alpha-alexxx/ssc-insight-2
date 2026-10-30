import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Landing } from "@/components/landing";
import { requireUser } from "@/lib/auth/require-user";

export const dynamic = "force-dynamic";

/**
 * The landing's own metadata. The root layout carries the generic site title;
 * this page is the one surface that should describe the product in a search
 * result, so it overrides both title and description.
 *
 * Deliberately a static export rather than `generateMetadata`: this route
 * already awaits `requireUser()`, and a metadata function would either
 * duplicate that round trip or block the document head behind it.
 */
export const metadata: Metadata = {
  title: "SSC Insight — SSC CGL Tier 2 mock tracker",
  description:
    "Log full, sectional and subject mocks. See the trend across 390 marks, the gap to your target, and the next test on a 50-day plan.",
  openGraph: {
    title: "SSC Insight — SSC CGL Tier 2 mock tracker",
    description:
      "A private mock tracker for SSC CGL Tier 2: four analytical scopes over one saved attempt, a 50-day study plan, and a portable JSON backup.",
    type: "website",
  },
};

/**
 * Public landing page — the only sign-in surface. The proxy leaves "/"
 * ungated; this page sends signed-in visitors straight to the workspace, so
 * the landing is never shown again after sign-in. Anonymous visitors (and
 * sessions that can't be verified right now) get the public landing with the
 * Google sign-in affordance.
 *
 * `?error=` carries a failed OAuth round trip (`oauth`, or a provider code
 * such as `access_denied`), an auth outage (`unavailable`), or an ended
 * session (`session`); the client raises a toast from it and then strips the
 * param. Next hands a repeated key back as an array — better-auth appends its
 * own `error=` — so collapse it to the first value here.
 */
export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const { error: rawError } = await searchParams;
  const error = Array.isArray(rawError) ? rawError[0] : rawError;
  let signedIn = false;
  try {
    await requireUser();
    signedIn = true;
  } catch {
    // 401 → anonymous; anything else → auth unavailable. Both see the
    // public landing rather than an error page.
  }
  if (signedIn) redirect("/dashboard");
  return (
    <Landing
      authEnabled={process.env.GOOGLE_AUTH_ENABLED === "true"}
      errorCode={error}
    />
  );
}

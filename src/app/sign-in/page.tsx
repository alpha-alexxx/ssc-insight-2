import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInLanding } from "@/components/sign-in-landing";
import { requireUser } from "@/lib/auth/require-user";
import { SessionError } from "@/lib/auth/session-policy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SSC Insight · Make every mock count",
  description:
    "A private SSC CGL Tier 2 mock tracker for full, subject, and sectional performance.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  let signedIn = false;
  let unavailable = query.error === "unavailable";

  try {
    await requireUser();
    signedIn = true;
  } catch (error) {
    if (!(error instanceof SessionError) || error.status !== 401)
      unavailable = true;
  }

  // Keep the redirect outside the session try/catch: redirect() throws by design.
  if (signedIn) redirect("/");

  return (
    <SignInLanding
      googleEnabled={process.env.GOOGLE_AUTH_ENABLED === "true"}
      authUnavailable={unavailable}
    />
  );
}

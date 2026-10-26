import { redirect } from "next/navigation";
import { SignInCard } from "@/components/sign-in-card";
import { requireUser } from "@/lib/auth/require-user";
import { SessionError } from "@/lib/auth/session-policy";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: oauthError } = await searchParams;
  let signedIn = false;
  let unavailable = false;
  try {
    await requireUser();
    signedIn = true;
  } catch (error) {
    unavailable = !(error instanceof SessionError && error.status === 401);
  }
  if (signedIn) redirect("/dashboard");
  return (
    <>
      {unavailable && (
        <p
          role="alert"
          className="mx-auto max-w-lg px-5 pt-6 text-sm text-danger"
        >
          Sign-in is temporarily unavailable. Please retry shortly.
        </p>
      )}
      {oauthError === "oauth" && (
        <p
          role="alert"
          className="mx-auto max-w-lg px-5 pt-6 text-sm text-danger"
        >
          Google sign-in didn&apos;t complete. Please try again.
        </p>
      )}
      <SignInCard authEnabled={process.env.GOOGLE_AUTH_ENABLED === "true"} />
    </>
  );
}

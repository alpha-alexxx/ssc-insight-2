import { redirect } from "next/navigation";
import { AuthControl } from "@/components/auth-control";
import { requireUser } from "@/lib/auth/require-user";
import { SessionError } from "@/lib/auth/session-policy";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  let signedIn = false;
  let unavailable = false;
  try {
    await requireUser();
    signedIn = true;
  } catch (error) {
    unavailable = !(error instanceof SessionError && error.status === 401);
  }
  if (signedIn) redirect("/");
  return (
    <main className="mx-auto max-w-lg px-5 py-20">
      <h1 className="font-serif text-4xl mb-4">Your preparation. Your space.</h1>
      <p className="muted mb-8">
        Sign in with Google to access your private mocks, progress, and
        settings.
      </p>
      {unavailable && (
        <p role="alert" className="mb-6 text-sm text-danger">
          Sign-in is temporarily unavailable. Please retry shortly.
        </p>
      )}
      <AuthControl enabled={process.env.GOOGLE_AUTH_ENABLED === "true"} />
    </main>
  );
}

import Link from "next/link";
import { AuthControl } from "@/components/auth-control";

export default function SignInPage() {
  return (
    <main className="mx-auto max-w-lg px-5 py-20">
      <h1 className="text-4xl mb-4">Sign in, if you like.</h1>
      <p className="muted mb-8">
        Google sign-in is optional. Everyone shares the same mocks and settings,
        including guests.
      </p>
      <AuthControl enabled={process.env.GOOGLE_AUTH_ENABLED === "true"} />
      <Link href="/" className="mt-8 inline-block underline underline-offset-4">
        Continue to the dashboard as a guest
      </Link>
    </main>
  );
}

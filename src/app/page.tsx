import { redirect } from "next/navigation";
import { PrivateWorkspace } from "@/components/private-workspace";
import { requireUser } from "@/lib/auth/require-user";
import { SessionError } from "@/lib/auth/session-policy";

export const dynamic = "force-dynamic";

export default async function Page() {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof SessionError && error.status === 401)
      redirect("/sign-in");
    redirect("/sign-in?error=unavailable");
  }
  return <PrivateWorkspace key={user.id} userId={user.id} />;
}

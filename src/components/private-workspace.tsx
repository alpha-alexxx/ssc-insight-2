"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Dashboard } from "./dashboard";
import { Button } from "./ui/button";

export function PrivateWorkspace({ userId }: { userId: string }) {
  const router = useRouter();
  const { data: session, isPending, error, refetch } = authClient.useSession();
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const inFlight = useRef(false);
  const check = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setChecking(true);
    try {
      const result = await authClient.getSession({
        query: { disableCookieCache: true },
        fetchOptions: { cache: "no-store" },
      });
      if (result.error) {
        setBlocked(true);
        return;
      }
      if (!result.data?.user) {
        setBlocked(true);
        router.replace("/sign-in");
        return;
      }
      if (result.data.user.id !== userId) {
        setBlocked(true);
        router.refresh();
        return;
      }
      setBlocked(false);
      refetch();
    } catch {
      setBlocked(true);
    } finally {
      inFlight.current = false;
      setChecking(false);
    }
  }, [userId, router, refetch]);

  useEffect(() => {
    const invalidate = () => {
      setBlocked(true);
      router.replace("/sign-in");
      router.refresh();
    };
    const unavailable = () => setBlocked(true);
    const visible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const pageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void check();
    };
    window.addEventListener("ssc:session-ended", invalidate);
    window.addEventListener("ssc:auth-unavailable", unavailable);
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", pageShow);
    document.addEventListener("visibilitychange", visible);
    const timer = window.setInterval(check, 60000);
    return () => {
      window.removeEventListener("ssc:session-ended", invalidate);
      window.removeEventListener("ssc:auth-unavailable", unavailable);
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", pageShow);
      document.removeEventListener("visibilitychange", visible);
      window.clearInterval(timer);
    };
  }, [check, router]);

  const sessionUserId = session?.user?.id;
  useEffect(() => {
    if (isPending || error) return;
    if (!sessionUserId) {
      router.replace("/sign-in");
      router.refresh();
    } else if (sessionUserId !== userId) router.refresh();
  }, [sessionUserId, isPending, error, userId, router]);

  // Returning no Dashboard unmounts every private form/result/filter selection.
  if (blocked || error)
    return (
      <main className="mx-auto max-w-lg px-5 py-20">
        <h1 className="font-serif text-3xl mb-4">Verify your session</h1>
        <p role="alert" className="muted mb-6">
          Your data is hidden until sign-in can be verified.
        </p>
        <Button onClick={check} disabled={checking}>
          Retry
        </Button>
      </main>
    );
  if (isPending || !session?.user || session.user.id !== userId)
    return (
      <p role="status" className="p-8 muted">
        Checking your session…
      </p>
    );
  return (
    <>
      <div hidden={checking}>
        <Dashboard
          key={userId}
          authEnabled
          userEmail={session.user.email ?? ""}
        />
      </div>
      {checking && (
        <p role="status" className="p-8 muted">
          Checking your session…
        </p>
      )}
    </>
  );
}

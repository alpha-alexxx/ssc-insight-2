"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "./ui/button";

/** Props for {@link PrivateWorkspace}. */
export interface PrivateWorkspaceProps {
  userId: string;
  children: ReactNode;
}

/**
 * Session guard around the whole (workspace) route group. Renders its
 * children (the workspace shell) only while the signed-in session is
 * verified — re-checked on focus, visibility, pageshow and every 60s.
 */
export function PrivateWorkspace({ userId, children }: PrivateWorkspaceProps) {
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
        router.replace("/?error=session");
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
      router.replace("/?error=session");
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
    const timer = window.setInterval(check, 60_000);
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
      router.replace("/?error=session");
      router.refresh();
    } else if (sessionUserId !== userId) {
      router.refresh();
    }
  }, [sessionUserId, isPending, error, userId, router]);

  // ---------------------------------------------------------------------------
  // Guard screens. Both replace the dashboard entirely, unmounting every
  // private form / result / filter selection — a closed cover.
  // ---------------------------------------------------------------------------

  if (blocked || error) {
    return <GuardNotice tone="blocked" checking={checking} onRetry={check} />;
  }

  if (isPending || !session?.user || session.user.id !== userId) {
    return <GuardNotice tone="checking" />;
  }

  // `visibility: hidden` (rather than the `hidden` attribute) still removes
  // content from the a11y tree and tab order — same guarantee — but keeps
  // layout stable while the 60s re-verification runs, so the dashboard no
  // longer reflows every minute.
  return (
    <>
      <div
        style={checking ? { visibility: "hidden" } : undefined}
        aria-hidden={checking || undefined}
      >
        {children}
      </div>
      {checking && <ReverifyMark />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Guard UI — masthead + dotted-leader ledger. No panel chrome, no terminal.
// The page itself is the sheet; the accent rule is the "laser."
// ---------------------------------------------------------------------------

type GuardTone = "checking" | "blocked";
type RowState = "ok" | "run" | "fail";

interface GuardRow {
  state: RowState;
  label: string;
  value: string;
}

interface GuardNoticeProps {
  tone: GuardTone;
  checking?: boolean;
  onRetry?: () => void;
}

function GuardNotice({ tone, checking = false, onRetry }: GuardNoticeProps) {
  const blocked = tone === "blocked";

  const statusLabel = blocked ? "Access denied" : "Verifying";
  const headline = blocked
    ? "This session could not be verified."
    : "Confirming access to your workspace.";
  const body = blocked
    ? "Your data stays hidden until sign-in can be confirmed."
    : "One moment while we confirm your access. Nothing on this page loads until then.";

  const rows: GuardRow[] = blocked
    ? [
        { state: "ok", label: "Transport encryption", value: "Verified" },
        { state: "fail", label: "Token signature", value: "Failed" },
        { state: "fail", label: "Session binding", value: "Failed" },
      ]
    : [
        { state: "ok", label: "Transport encryption", value: "Verified" },
        { state: "ok", label: "Token signature", value: "Verified" },
        { state: "run", label: "Session lookup", value: "Verifying…" },
      ];

  return (
    <main
      aria-busy={!blocked}
      className="relative min-h-dvh w-full bg-canvas px-5 py-12 md:py-20"
    >
      <div
        aria-hidden
        className="landing-grid-lines pointer-events-none absolute inset-0 opacity-40"
      />
      <GuardStyles />

      <article className="relative mx-auto w-full max-w-2xl">
        {/* Masthead — wordmark + tone tag, then a rule that draws. */}
        <header>
          <div className="flex items-baseline justify-between border-b border-ink pb-3">
            <span className="wordmark">SSC Insight</span>
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                blocked ? "text-danger" : "text-accent"
              }`}
            >
              <span
                aria-hidden
                className={
                  blocked
                    ? "size-1.5 rounded-full bg-danger"
                    : "guard-pip size-1.5 rounded-full bg-accent"
                }
              />
              {statusLabel}
            </span>
          </div>
          <div
            aria-hidden
            className={`guard-rule h-[2px] ${blocked ? "bg-danger" : "bg-accent"}`}
          />
        </header>

        {/* Body */}
        <section className="pt-10 md:pt-14">
          <h1 className="page-title text-balance">{headline}</h1>
          <p
            role={blocked ? "alert" : "status"}
            className="mt-4 max-w-prose text-sm leading-relaxed text-muted"
          >
            {body}
          </p>

          <ol
            aria-label="Session checks"
            className="mt-10 border-t border-rule-soft"
          >
            {rows.map((row, i) => (
              <GuardLedgerRow key={i} row={row} index={i} />
            ))}
          </ol>

          <footer className="mt-8 flex items-center justify-between gap-4 border-t border-rule-soft pt-5">
            <p className="text-[11px] leading-relaxed text-muted">
              Re-verified on focus, on return, and every 60 seconds.
            </p>
            {blocked && onRetry && (
              <Button onClick={onRetry} disabled={checking}>
                {checking ? "Retrying…" : "Retry"}
              </Button>
            )}
          </footer>
        </section>
      </article>
    </main>
  );
}

/**
 * A single ledger row — numbered, hairline-ruled, dotted leader to a
 * state in small caps. The leader is the classic table-of-contents line.
 */
function GuardLedgerRow({ row, index }: { row: GuardRow; index: number }) {
  const tone =
    row.state === "ok"
      ? "text-positive"
      : row.state === "fail"
        ? "text-danger"
        : "text-accent";

  return (
    <li className="flex items-baseline gap-3 border-b border-rule-soft py-3 last:border-b-0">
      <span className="w-6 shrink-0 tabular-nums text-[11px] font-medium text-muted">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="shrink-0 text-sm text-ink">{row.label}</span>
      <span
        aria-hidden
        className="min-w-4 flex-1 -translate-y-[0.15em] border-b border-dotted border-rule-soft"
      />
      <span
        className={`shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] ${tone}`}
      >
        {row.value}
      </span>
    </li>
  );
}

/**
 * Quiet status chip that lands while the 60s re-verification runs. Sits
 * in the top-right corner of the screen, above the restored dashboard.
 */
function ReverifyMark() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-4 z-50 inline-flex items-center gap-2 rounded-full border border-rule-soft bg-paper/95 px-3 py-1.5 text-[11px] font-medium text-muted shadow-pop backdrop-blur-sm"
    >
      <span aria-hidden className="relative flex size-1.5">
        <span className="absolute inline-flex size-full rounded-full bg-accent opacity-40 motion-safe:animate-ping" />
        <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
      </span>
      <span>Verifying…</span>
    </div>
  );
}

/**
 * Scoped keyframes for the two guard-only motions — the masthead rule that
 * draws, and the pulsing pip. Wrapped in `prefers-reduced-motion:
 * no-preference` so the reduced-motion state is fully static and legible.
 */
function GuardStyles() {
  return (
    <style>{`
      @keyframes guard-rule {
        from { transform: scaleX(0); }
        to   { transform: scaleX(1); }
      }
      @keyframes guard-pip {
        0%, 100% { opacity: 1;   transform: scale(1);    }
        50%      { opacity: 0.4; transform: scale(0.85); }
      }
      @media (prefers-reduced-motion: no-preference) {
        .guard-rule {
          transform-origin: left center;
          animation: guard-rule 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .guard-pip {
          animation: guard-pip 1.6s ease-in-out infinite;
        }
      }
    `}</style>
  );
}

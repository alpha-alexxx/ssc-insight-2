"use client";

import { useEffect, useRef, useState } from "react";
import { BrandIdentity } from "@/components/brand-identity";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { cn } from "@/lib/utils";

const LINKS = [
  ["#product", "Product"],
  ["#workflow", "Workflow"],
  ["#exams", "Exams"],
  ["#privacy", "Privacy"],
  ["#questions", "Questions"],
] as const;

export function GazetteMasthead({ authEnabled }: { authEnabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const available = document.documentElement.scrollHeight - innerHeight;
      setScrolled(scrollY > 20);
      setProgress(available > 0 ? Math.min(1, scrollY / available) : 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    const focusable = Array.from(
      dialog?.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])') ?? [],
    );
    focusable[0]?.focus();
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [open]);

  return (
    <header className={cn("gazette-nav", scrolled && "gazette-nav-scrolled")}>
      <div className="gazette-nav-inner">
        <a href="#top" className="gazette-brand-link">
          <BrandIdentity />
        </a>
        <nav aria-label="Landing sections" className="gazette-desktop-nav">
          <ul>{LINKS.map(([href, label]) => <li key={href}><a href={href}>{label}</a></li>)}</ul>
        </nav>
        <div className="gazette-nav-actions">
          <GoogleSignInButton
            enabled={authEnabled}
            label="Open workspace"
            compactLabel="Sign in"
            size="sm"
            className="gazette-sign-in"
          />
          <button
            ref={triggerRef}
            type="button"
            className="gazette-menu-button"
            aria-label="Open navigation"
            aria-expanded={open}
            aria-controls="gazette-mobile-navigation"
            onClick={() => setOpen(true)}
          >
            <span aria-hidden="true"><i /><i /><i /></span>
          </button>
          {open ? (
            <div className="gazette-mobile-dialog">
              <button className="gazette-menu-overlay" type="button" aria-label="Close navigation" onClick={() => setOpen(false)} />
              <div
                ref={dialogRef}
                id="gazette-mobile-navigation"
                role="dialog"
                aria-modal="true"
                aria-labelledby="gazette-menu-title"
                aria-describedby="gazette-menu-description"
                className="gazette-menu-sheet"
              >
                <div className="gazette-menu-content">
                  <button className="gazette-menu-close" type="button" aria-label="Close navigation" onClick={() => setOpen(false)}><span aria-hidden="true">×</span></button>
                  <h2 id="gazette-menu-title"><BrandIdentity /></h2>
                  <p id="gazette-menu-description">A private record of mock results, evidence, and dated preparation.</p>
                  <nav aria-label="Landing sections">
                    <ul>{LINKS.map(([href, label]) => (
                      <li key={href}><a href={href} onClick={() => setOpen(false)}>{label}</a></li>
                    ))}</ul>
                  </nav>
                  <p className="gazette-menu-note">Built for SSC results. Private by account. Portable by design.</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <span className="gazette-read-progress" aria-hidden="true" style={{ transform: `scaleX(${progress})` }} />
    </header>
  );
}

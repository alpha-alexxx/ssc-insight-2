"use client";
import { useEffect, useState } from "react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const NAV: { href: string; label: string }[] = [
  { href: "#workspace", label: "How it works" },
  { href: "#system", label: "Preparation system" },
  { href: "#privacy", label: "Trust" },
  { href: "#start", label: "Start" },
];

/**
 * The landing masthead.
 *
 * Client-side because it owns two pieces of UI state: the scroll-triggered
 * hairline (so the bar reads as floating over content once you leave the
 * hero) and the mobile navigation sheet. Everything else — wordmark, nav
 * labels, the sign-in button — is ordinary markup.
 *
 * The scroll listener is passive and only ever flips a boolean, so it does
 * not re-render on every frame; the progress rule is a transform driven by
 * the same scroll position at no layout cost.
 */
export function Masthead({ authEnabled }: { authEnabled: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState("#workspace");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let frame = 0;
    function read() {
      frame = 0;
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      setScrolled(window.scrollY > 8);
      setProgress(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0);
      const checkpoint = window.scrollY + window.innerHeight * 0.35;
      const current = [...NAV].reverse().find((item) => {
        const section = document.querySelector<HTMLElement>(item.href);
        const top = section
          ? section.getBoundingClientRect().top + window.scrollY
          : Number.POSITIVE_INFINITY;
        return top <= checkpoint;
      });
      setActive(current?.href ?? "#workspace");
    }
    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(read);
    }
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-canvas/85 backdrop-blur transition-colors duration-200",
        scrolled ? "border-rule-soft" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <a
          href="#top"
          className="landing-wordmark text-[23px] text-ink md:text-2xl"
          aria-label="SSC Insight — back to top"
        >
          ssc<span className="text-accent">insight</span>
          <span className="text-accent">.</span>
        </a>

        <nav aria-label="Landing sections" className="hidden md:block">
          <ul className="flex items-center gap-7">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  aria-current={active === item.href ? "location" : undefined}
                  className={cn(
                    "relative py-2 text-[0.8125rem] transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:bg-accent after:transition-transform",
                    active === item.href
                      ? "text-ink after:scale-x-100"
                      : "text-muted after:scale-x-0 hover:text-ink hover:after:scale-x-100",
                  )}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1 sm:gap-3">
          <GoogleSignInButton
            enabled={authEnabled}
            variant="outline"
            size="sm"
            label="Sign in with Google"
            compactLabel="Sign in"
            ariaLabel="Sign in with Google"
          />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <button
              type="button"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="-mr-1 grid size-9 place-items-center text-muted transition-colors hover:text-ink md:hidden"
            >
              <span aria-hidden="true" className="flex w-4 flex-col gap-[3px]">
                <span className="h-px w-full bg-current" />
                <span className="h-px w-full bg-current" />
                <span className="h-px w-full bg-current" />
              </span>
            </button>
            <SheetContent side="right" className="w-[86vw] sm:max-w-[380px]">
              <div className="flex h-full flex-col p-6">
                <SheetTitle className="landing-wordmark text-2xl text-ink">
                  ssc<span className="text-accent">insight</span>
                  <span className="text-accent">.</span>
                </SheetTitle>
                <SheetDescription className="mt-1 text-xs text-muted">
                  A private mock tracker and preparation system.
                </SheetDescription>

                <nav aria-label="Landing sections" className="mt-8">
                  <ul className="flex flex-col">
                    {NAV.map((item) => (
                      <li key={item.href} className="border-b border-rule-soft">
                        <SheetClose asChild>
                          <a
                            href={item.href}
                            className="block py-3.5 font-serif text-lg tracking-[-0.02em] text-ink"
                          >
                            {item.label}
                          </a>
                        </SheetClose>
                      </li>
                    ))}
                    <li className="border-b border-rule-soft">
                      <SheetClose asChild>
                        <a
                          href="#faq"
                          className="block py-3.5 font-serif text-lg tracking-[-0.02em] text-ink"
                        >
                          Questions
                        </a>
                      </SheetClose>
                    </li>
                  </ul>
                </nav>

                <p className="mt-auto pt-6 text-xs leading-relaxed text-muted">
                  Built-in SSC exam patterns, custom exams, one private
                  workspace, and a portable JSON backup whenever you want out.
                </p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Reading progress: a 2px rule the width of the page. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden"
      >
        <div
          className="h-full origin-left bg-accent transition-transform duration-150 ease-out"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </header>
  );
}

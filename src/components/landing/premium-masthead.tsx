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

const LINKS = [
  ["#product", "Product"],
  ["#workflow", "Workflow"],
  ["#exams", "Exams"],
  ["#privacy", "Privacy"],
  ["#questions", "Questions"],
] as const;

export function PremiumMasthead({ authEnabled }: { authEnabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const available = document.documentElement.scrollHeight - innerHeight;
      setScrolled(scrollY > 16);
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

  return (
    <header
      className={cn(
        "premium-nav sticky top-0 z-50 border-b transition-[background-color,box-shadow] duration-300",
        scrolled
          ? "border-black/5 bg-white/90 shadow-[0_12px_36px_-28px_rgba(25,20,22,.38)] backdrop-blur-xl"
          : "border-transparent bg-white/70",
      )}
    >
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
        <a href="#top" className="flex items-center gap-2.5" aria-label="SSC Insight — top">
          <span className="grid size-8 place-items-center rounded-[10px] bg-[#ff4f38] text-sm font-bold text-white shadow-[0_8px_24px_-10px_rgba(255,79,56,.8)]">
            S
          </span>
          <span className="text-[0.95rem] font-bold tracking-[-0.03em] text-[#171315]">
            SSC Insight
          </span>
        </a>

        <nav aria-label="Landing sections" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {LINKS.map(([href, label]) => (
              <li key={href}>
                <a
                  href={href}
                  className="text-[0.78rem] font-medium text-[#716a6d] transition-colors hover:text-[#171315] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4f38]"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <GoogleSignInButton
            enabled={authEnabled}
            variant="outline"
            size="sm"
            label="Open workspace"
            compactLabel="Sign in"
            ariaLabel="Sign in with Google to open your workspace"
            className="rounded-[10px] border-black/10 bg-white text-[#171315] shadow-sm hover:bg-[#fff6f4]"
          />
          <Sheet open={open} onOpenChange={setOpen}>
            <button
              type="button"
              aria-label="Open navigation"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className="grid size-10 place-items-center rounded-[10px] border border-black/10 bg-white text-[#171315] lg:hidden"
            >
              <span aria-hidden="true" className="flex w-4 flex-col gap-1">
                <span className="h-px bg-current" />
                <span className="h-px bg-current" />
                <span className="h-px bg-current" />
              </span>
            </button>
            <SheetContent side="right" className="w-[88vw] max-w-[400px] bg-white">
              <div className="flex h-full flex-col p-7">
                <SheetTitle className="flex items-center gap-2.5 font-sans text-base font-bold">
                  <span className="grid size-8 place-items-center rounded-[10px] bg-[#ff4f38] text-sm text-white">S</span>
                  SSC Insight
                </SheetTitle>
                <SheetDescription className="mt-3 text-sm leading-relaxed text-[#716a6d]">
                  A private preparation workspace for SSC exams.
                </SheetDescription>
                <nav aria-label="Landing sections" className="mt-10">
                  <ul>
                    {LINKS.map(([href, label]) => (
                      <li key={href} className="border-b border-black/8">
                        <SheetClose asChild>
                          <a href={href} className="block py-4 text-xl font-semibold tracking-[-0.03em] text-[#171315]">
                            {label}
                          </a>
                        </SheetClose>
                      </li>
                    ))}
                  </ul>
                </nav>
                <p className="mt-auto text-xs leading-relaxed text-[#716a6d]">
                  Built-in exam patterns, custom exams, and a portable JSON backup.
                </p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[#ff4f38]"
        style={{ transform: `scaleX(${progress})` }}
      />
    </header>
  );
}

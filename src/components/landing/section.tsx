import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The landing page's editorial grammar.
 *
 * Every section after the hero opens the same way: a numbered margin rule
 * (the printed-ledger spine), a small-caps eyebrow, a serif headline, one
 * hairline, and an optional lede. The variety on this page comes from the
 * composition beneath the head — a layered hero, a tabbed specimen, a fan
 * diagram, a plan grid, a comparison ledger — never from restyling the head.
 *
 * These are server components on purpose: nothing here needs interactivity,
 * so nothing here ships JavaScript.
 */

export function Section({
  id,
  number,
  children,
  className,
  bordered = true,
}: {
  id?: string;
  /** The printed section number, e.g. "03". Renders the margin spine. */
  number?: string;
  children: ReactNode;
  className?: string;
  /** A hairline closing the section, matching the head's rule. */
  bordered?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn("landing-section", bordered && "border-b border-rule-soft", className)}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {number ? (
          <div className="landing-spine">
            <p className="landing-spine-no" aria-hidden="true">
              {number}
            </p>
            <div className="min-w-0">{children}</div>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export function SectionHead({
  eyebrow,
  title,
  lede,
  align = "left",
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <header
      className={cn(
        "border-b border-rule-soft pb-8",
        align === "center" && "text-center",
        className,
      )}
    >
      <p className="section-label">{eyebrow}</p>
      <h2 className="mt-3 max-w-3xl font-serif text-[clamp(1.75rem,3.4vw,2.75rem)] font-[450] leading-[1.1] tracking-[-0.03em] text-balance">
        {title}
      </h2>
      {lede ? (
        <p
          className={cn(
            "mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-muted",
            align === "center" && "mx-auto",
          )}
        >
          {lede}
        </p>
      ) : null}
    </header>
  );
}

/**
 * The inverted band. Only the plate's own five custom properties are read
 * here — semantic tokens are deliberately untouched, which is what lets a
 * paper mockup sit on the plate and still look exactly like the workspace.
 */
export function Plate({
  id,
  label,
  children,
  className,
  dim = false,
}: {
  id?: string;
  /** The plate's dateline, e.g. "Plate I · The workspace". */
  label?: string;
  children: ReactNode;
  className?: string;
  /** A secondary plate: no top rule, so it reads as continuous with the one above. */
  dim?: boolean;
}) {
  return (
    <div
      id={id}
      className={cn(
        "plate landing-section",
        dim && "border-t-0",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {label ? (
          <p className="plate-label mb-6 flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-[var(--plate-rule)]" />
            {label}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}

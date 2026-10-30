import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The specimen frame: a browser window around a product mockup.
 *
 * Window controls are 6px squares, not circles — the project's Frame Rule
 * reserves round shapes for status dots and the answer ring. The mockup
 * inside is `aria-hidden`; the caption beside the frame is the real content,
 * so a screen reader hears one honest sentence instead of four hundred
 * decorative labels. Because of that, no fact may live only inside a mockup.
 */
export function BrowserFrame({
  url,
  children,
  className,
}: {
  url: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("specimen", className)}>
      <div className="specimen-bar">
        <span className="specimen-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className="specimen-url">{url}</span>
      </div>
      <div aria-hidden="true" className="mock">
        {children}
      </div>
    </div>
  );
}

/** Caption + the "illustrative sample data" badge that every mockup carries. */
export function MockupCaption({
  children,
  badge = "Illustrative sample data",
}: {
  children: ReactNode;
  badge?: string;
}) {
  return (
    <figcaption className="specimen-caption">
      <span>{children}</span>
      <span className="specimen-badge">{badge}</span>
    </figcaption>
  );
}

import { cn } from "@/lib/utils";

export function BrandIdentity({
  variant = "full",
  tone = "ink",
  className,
  copyClassName,
}: {
  variant?: "full" | "mark";
  tone?: "ink" | "paper";
  className?: string;
  copyClassName?: string;
}) {
  return (
    <span
      className={cn("brand-identity", `brand-identity-${tone}`, className)}
      aria-label="SSC Insight"
    >
      <span className="brand-record-mark" aria-hidden="true">
        <span>SI</span>
      </span>
      {variant === "full" ? (
        <span className={cn("brand-identity-copy", copyClassName)} aria-hidden="true">
          <strong>SSC Insight</strong>
          <small>Private preparation record</small>
        </span>
      ) : null}
    </span>
  );
}

import { PremiumLanding } from "./premium-landing";

/**
 * The public landing page — the only sign-in surface, and the first thing an
 * anonymous visitor sees.
 *
 * Structure: a server-rendered five-act story with named client islands for
 * the masthead, hero art, decorative constellation, pinned assembly, scope
 * diagram, FAQ, and error announcer. Copy and coded product mockups stay
 * readable before hydration and without JavaScript.
 *
 * The trust plate inverts the surface to charcoal. Only the plate's own
 * custom properties change there; semantic tokens are untouched, which is
 * what lets a paper mockup sit on a plate and still look exactly like the
 * workspace.
 */
export function Landing({
  authEnabled,
  errorCode,
}: {
  authEnabled: boolean;
  errorCode?: string;
}) {
  return <PremiumLanding authEnabled={authEnabled} errorCode={errorCode} />;
}

import { GazetteLanding } from "./gazette-landing";

/**
 * The public landing page — the only sign-in surface, and the first thing an
 * anonymous visitor sees.
 *
 * Structure: a server-rendered Merit Gazette with client islands for the
 * masthead and pinned Capture/Read/Plan/Improve sequence. Product truth and
 * coded scenes remain readable before hydration and without JavaScript.
 */
export function Landing({
  authEnabled,
  errorCode,
}: {
  authEnabled: boolean;
  errorCode?: string;
}) {
  return <GazetteLanding authEnabled={authEnabled} errorCode={errorCode} />;
}

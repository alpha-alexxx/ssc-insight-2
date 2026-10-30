import { Hero } from "./hero";
import { LandingError } from "./landing-error";
import { LedgerFacts } from "./ledger-facts";
import { Masthead } from "./masthead";
import { LANDING_PLAN } from "./plan-data";
import {
  AiSection,
  CompareSection,
  FaqSection,
  FinalCta,
  LandingFooter,
  PlanSection,
  PrivacySection,
  ScopesSection,
} from "./sections";
import { Plate } from "./section";
import { Showcase } from "./showcase";

/**
 * The public landing page — the only sign-in surface, and the first thing an
 * anonymous visitor sees.
 *
 * Structure: a server-rendered page with a handful of named client islands
 * (masthead, hero art, showcase tabs, the scope diagram, the FAQ accordion,
 * the reveal wrappers, the error announcer). Everything else — copy, section
 * heads, mockup markup, the fact strip, the plan grid — is static HTML, so the
 * page is fully readable before hydration and without JavaScript.
 *
 * The two plates invert the surface to charcoal. Only the plate's own
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
  return (
    <div id="top" className="min-h-screen overflow-x-clip bg-canvas text-ink">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <LandingError errorCode={errorCode} />
      <Masthead authEnabled={authEnabled} />

      <main id="main-content">
        <Hero authEnabled={authEnabled} />
        <LedgerFacts plan={LANDING_PLAN} />

        <Plate id="workspace" label="Plate I · The workspace">
          <div className="pb-20 pt-14 sm:pb-24">
            <Showcase plan={LANDING_PLAN} />
          </div>
        </Plate>

        <ScopesSection />
        <PlanSection plan={LANDING_PLAN} />
        <CompareSection />

        <Plate label="Plate II · Yours alone">
          <AiSection />
          <PrivacySection />
        </Plate>

        <FaqSection />
        <FinalCta authEnabled={authEnabled} />
      </main>

      <LandingFooter />
    </div>
  );
}

import { Assembly } from "./assembly";
import { Hero } from "./hero";
import { LandingError } from "./landing-error";
import { Masthead } from "./masthead";
import { LANDING_PLAN } from "./plan-data";
import { PreparationStory } from "./preparation-story";
import {
  AiSection,
  FaqSection,
  FinalCta,
  LandingFooter,
  PrivacySection,
} from "./sections";
import { Plate } from "./section";

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
  return (
    <div
      id="top"
      className="landing-light landing-stage min-h-screen overflow-x-clip text-ink"
    >
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <LandingError errorCode={errorCode} />
      <div className="landing-site-frame">
        <Masthead authEnabled={authEnabled} />

        <main id="main-content">
          <Hero authEnabled={authEnabled} />
          <Assembly plan={LANDING_PLAN} />
          <PreparationStory plan={LANDING_PLAN} />

          <Plate label="Trust · Yours alone">
            <AiSection />
            <PrivacySection />
          </Plate>

          <FaqSection />
          <FinalCta authEnabled={authEnabled} />
        </main>

        <LandingFooter />
      </div>
    </div>
  );
}

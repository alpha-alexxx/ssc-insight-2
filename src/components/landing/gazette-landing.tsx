import Image from "next/image";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { BrandIdentity } from "@/components/brand-identity";
import { Faq } from "./faq";
import { GazetteJourney } from "./gazette-journey";
import { GazetteMasthead } from "./gazette-masthead";
import { LandingError } from "./landing-error";

const EXAMS = ["CGL", "CHSL", "MTS", "CPO", "GD Constable", "Stenographer", "Selection Post", "Custom"];

export function GazetteLanding({ authEnabled, errorCode }: { authEnabled: boolean; errorCode?: string }) {
  return (
    <div id="top" className="gazette-site">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <LandingError errorCode={errorCode} />
      <GazetteMasthead authEnabled={authEnabled} />
      <main id="main-content">
        <section className="gazette-hero" aria-labelledby="gazette-title">
          <div className="gazette-hero-copy">
            <h1 id="gazette-title">One result.<br /><em>A clearer next move.</em></h1>
            <p>Record the paper you actually sat. Read the pattern at the right scope. Put the response on a date.</p>
            <div className="gazette-hero-actions">
              <GoogleSignInButton enabled={authEnabled} label="Open your private record" compactLabel="Open workspace" className="gazette-primary-action" />
              <a href="#product">Read the result <span aria-hidden="true">↓</span></a>
            </div>
          </div>
          <figure className="gazette-aspirant">
            <Image src="/brand/merit-gazette-aspirant.png" alt="An SSC aspirant reviewing notes at her study desk." width={1448} height={1086} priority sizes="(max-width: 900px) 92vw, 48vw" />
            <figcaption>Preparation is personal. The evidence should be useful.</figcaption>
          </figure>
          <div id="product" className="gazette-result" aria-label="Illustrative SSC CGL Tier 2 result">
            <header><strong>Illustrative result · SSC CGL · Tier 2</strong><span>Mock · 02 Nov 2026</span></header>
            <div className="gazette-result-summary"><div><span>Score</span><strong>279<small>/390</small></strong></div><div><span>Accuracy</span><strong>75.5%</strong></div></div>
            <div className="gazette-result-table" role="table" aria-label="Illustrative subject result">
              <div role="row" className="is-head"><span role="columnheader">Section</span><span role="columnheader">Attempted</span><span role="columnheader">Correct</span><span role="columnheader">Score</span></div>
              {[["Quantitative Aptitude", "29 / 30", "24", "72 / 90"], ["Reasoning & General Intelligence", "28 / 30", "22", "66 / 90"], ["English Language", "42 / 45", "29", "87 / 135"], ["General Awareness", "25 / 25", "18", "54 / 75"]].map((row, index) => <div role="row" key={row[0]} className={index === 3 ? "is-alert" : ""}>{row.map((cell) => <span role="cell" key={cell}>{cell}</span>)}</div>)}
            </div>
          </div>
          <div className="gazette-route" aria-label="Illustrative result-to-action route">
            <div><span>Recorded</span><small>02 Nov</small></div><i aria-hidden="true" /><div><span>GA costs 18 marks</span><small>Largest recoverable loss</small></div><i aria-hidden="true" /><div><span>Revise GA errors</span><small>08 Nov · 25 questions</small></div>
          </div>
        </section>

        <GazetteJourney />

        <section className="gazette-scope-section">
          <div className="gazette-section-heading"><h2>One record. Four legitimate readings.</h2><p>The analytical grain changes. The saved attempt does not multiply.</p></div>
          <div className="gazette-scope-ledger">
            {[['Full mocks', 'The complete paper', 'Trend whole-paper score, percentage, accuracy, time and target movement.'], ['Subject wise', 'Every subject result', 'Combine subjects from full, sectional and standalone subject mocks.'], ['Sectional wise', 'The paper’s real sections', 'Read explicit sectionals and derived CGL sections without borrowing percentile.'], ['All mocks', 'Every saved attempt once', 'Compare different paper sizes by percentage and keep raw marks labelled.']].map(([title, subtitle, body]) => <article key={title}><h3>{title}</h3><strong>{subtitle}</strong><p>{body}</p><a href="#questions">Read the rule <span aria-hidden="true">→</span></a></article>)}
          </div>
        </section>

        <section id="exams" className="gazette-exam-register">
          <div className="gazette-section-heading"><h2>Every paper keeps its own rules.</h2><p>Question counts, maximum marks, marking schemes, duration and sectional structure come from the selected tier and stay frozen on saved results.</p></div>
          <div className="gazette-exam-list">{EXAMS.map((exam, index) => <div key={exam}><span>{String(index + 1).padStart(2, '0')}</span><strong>{exam}</strong><small>{exam === 'Custom' ? 'Your pattern' : 'Built-in pattern'}</small></div>)}</div>
        </section>

        <section id="privacy" className="gazette-privacy">
          <div><h2>Your account is the boundary.</h2><p>Every read and write is scoped to the verified user. There is no guest workspace, shared account surface or administrator view.</p><ul><li>Google sign-in</li><li>AES-256-GCM key storage</li><li>Portable JSON backup</li></ul></div>
          <div className="gazette-privacy-ledger">
            <div><h3>Your backup carries</h3>{["Attempts and subject results", "Notes, rank and percentile", "Planner work and targets", "Per-subject timing"].map(x => <p key={x}><span>Included</span>{x}</p>)}</div>
            <div><h3>It never carries</h3>{["Email address or user ID", "Sign-in credentials", "Your AI provider key", "Another account’s data"].map(x => <p key={x}><span>Excluded</span>{x}</p>)}</div>
            <aside><strong>Optional AI remains read-only.</strong><p>It can interpret recent aggregates and propose next actions. It cannot create, edit or schedule a mock.</p></aside>
          </div>
        </section>

        <section id="questions" className="gazette-questions">
          <div className="gazette-section-heading"><h2>The details belong in the open.</h2><p>Accounts, scoring, AI, scheduling and leaving with your data.</p></div>
          <div className="gazette-faq"><Faq /></div>
        </section>

        <section className="gazette-close">
          <p>Your next useful action may already be in the last result.</p>
          <h2>Give the evidence a place to work.</h2>
          <GoogleSignInButton enabled={authEnabled} label="Open SSC Insight" className="gazette-primary-action" />
        </section>
      </main>
      <footer className="gazette-footer"><BrandIdentity /><p>Private SSC preparation workspace · Dates in India Standard Time</p><p>Not affiliated with the Staff Selection Commission.</p></footer>
    </div>
  );
}

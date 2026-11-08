import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Faq } from "./faq";
import { LandingError } from "./landing-error";
import { PremiumJourney } from "./premium-journey";
import { PremiumMasthead } from "./premium-masthead";
import { PremiumShowcase } from "./premium-showcase";

const EXAMS = ["CGL", "CHSL", "MTS", "CPO", "GD", "Stenographer", "Selection Post", "Custom"];

function ScoreIllustration() {
  return (
    <div aria-hidden="true" className="premium-illustration relative h-64 overflow-hidden rounded-[28px] bg-[#171315] p-6 text-white">
      <div className="absolute -right-16 -top-16 size-56 rounded-full bg-[#ff4f38] opacity-80 blur-3xl" />
      <p className="relative text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">Attempt 08 · Full mock</p>
      <div className="relative mt-7 flex items-end justify-between"><b className="text-6xl tracking-[-0.07em]">279</b><span className="mb-2 rounded-full bg-white/10 px-3 py-1 text-xs">of 390</span></div>
      <div className="relative mt-6 h-16"><svg viewBox="0 0 500 90" className="h-full w-full"><path d="M0 78 C70 84 80 48 135 60 S230 75 280 38 S365 58 410 22 S468 18 500 6" fill="none" stroke="#ff705c" strokeWidth="5" strokeLinecap="round"/></svg></div>
      <div className="relative mt-4 grid grid-cols-3 gap-2 text-[10px] text-white/55"><span>Accuracy <b className="block text-sm text-white">75.5%</b></span><span>Percentile <b className="block text-sm text-white">82.4</b></span><span>Time <b className="block text-sm text-white">2:04</b></span></div>
    </div>
  );
}

function AnalysisIllustration() {
  return (
    <div aria-hidden="true" className="premium-illustration relative h-64 overflow-hidden rounded-[28px] border border-black/6 bg-[#fff7f5] p-6">
      <div className="absolute -left-12 top-0 size-44 rounded-full bg-[#ffafcf] opacity-60 blur-3xl" />
      <p className="relative premium-kicker">Four views · one record</p>
      <div className="relative mt-6 grid grid-cols-2 gap-3">
        {[["Full mocks","6"],["Subject wise","28"],["Sectional","13"],["All mocks","8"]].map(([label,value],index)=><div key={label} className={`rounded-2xl border border-white/80 p-4 shadow-sm backdrop-blur ${index===3?"bg-[#ff4f38] text-white":"bg-white/80 text-[#171315]"}`}><p className={`text-[9px] ${index===3?"text-white/65":"text-[#8c8588]"}`}>{label}</p><b className="mt-2 block text-2xl tracking-[-0.04em]">{value}</b><span className={`mt-3 block h-1 rounded-full ${index===3?"bg-white/25":"bg-[#f0edef]"}`}><i className={`block h-full rounded-full ${index===3?"w-4/5 bg-white":"w-2/3 bg-[#ff4f38]"}`}/></span></div>)}
      </div>
    </div>
  );
}

function PlanIllustration() {
  return (
    <div aria-hidden="true" className="premium-illustration relative h-64 overflow-hidden rounded-[28px] border border-black/6 bg-white p-6">
      <div className="flex items-center justify-between"><div><p className="premium-kicker">November 2026</p><b className="mt-1 block text-xl tracking-[-0.04em]">Your next seven days</b></div><span className="rounded-xl bg-[#171315] px-3 py-2 text-[10px] text-white">Today · 08</span></div>
      <div className="mt-6 grid grid-cols-7 gap-2 text-center">{["M","T","W","T","F","S","S"].map((day,index)=><div key={`${day}-${index}`}><p className="text-[8px] font-semibold text-[#aaa3a6]">{day}</p><span className={`mt-2 grid aspect-square place-items-center rounded-xl text-xs font-semibold ${index===6?"bg-[#ff4f38] text-white":"bg-[#f7f5f6] text-[#4f484b]"}`}>{index+2}</span><i className={`mx-auto mt-2 block size-1.5 rounded-full ${index===1||index===3||index===6?"bg-[#ff4f38]":"bg-transparent"}`}/></div>)}</div>
      <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#f7f5f6] px-4 py-3"><span className="grid size-8 place-items-center rounded-xl bg-[#fff0ed] text-xs text-[#ff4f38]">✓</span><p className="text-xs font-semibold">Revise General Awareness errors</p><span className="ml-auto text-[9px] text-[#8c8588]">Today</span></div>
    </div>
  );
}

function FeatureCard({ number, title, body, children }: { number: string; title: string; body: string; children: React.ReactNode }) {
  return (
    <article className="premium-reveal group">
      {children}
      <div className="mt-6 flex items-start gap-5">
        <span className="text-xs font-bold text-[#ff4f38]">{number}</span>
        <div><h3 className="text-xl font-bold tracking-[-0.04em] text-[#171315]">{title}</h3><p className="mt-2 text-sm leading-relaxed text-[#716a6d]">{body}</p></div>
      </div>
    </article>
  );
}

export function PremiumLanding({ authEnabled, errorCode }: { authEnabled: boolean; errorCode?: string }) {
  return (
    <div id="top" className="showcase-v2 min-h-screen overflow-x-clip bg-white font-sans text-[#171315]">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <LandingError errorCode={errorCode} />
      <PremiumMasthead authEnabled={authEnabled} />

      <main id="main-content">
        <section className="premium-hero relative isolate overflow-hidden pb-16 pt-14 sm:pb-24 sm:pt-20">
          <div aria-hidden="true" className="premium-aurora absolute inset-x-0 top-0 h-[52rem]" />
          <div aria-hidden="true" className="premium-grid absolute inset-x-0 top-0 h-[48rem] opacity-45" />
          <div className="relative mx-auto max-w-5xl px-5 text-center sm:px-8">
            <p className="premium-hero-in premium-kicker mx-auto w-fit rounded-full border border-[#ff4f38]/15 bg-white/70 px-4 py-2 shadow-sm backdrop-blur">Your private preparation intelligence</p>
            <h1 className="premium-hero-in premium-hero-delay mx-auto mt-8 max-w-[12ch] text-[clamp(3.1rem,8vw,7.7rem)] font-bold leading-[0.87] tracking-[-0.075em] text-balance">
              Your mock data finally tells you <span className="text-[#ff4f38]">what to do next.</span>
            </h1>
            <p className="premium-hero-in premium-hero-delay-2 mx-auto mt-7 max-w-2xl text-base leading-relaxed text-[#716a6d] sm:text-lg">Capture every SSC result, read the pattern without double-counting, and turn the evidence into dated preparation.</p>
            <div className="premium-hero-in premium-hero-delay-3 mt-8 flex flex-wrap justify-center gap-3">
              <GoogleSignInButton enabled={authEnabled} label="Open your workspace" className="h-auto rounded-xl bg-[#ff4f38] px-6 py-3.5 text-sm text-white shadow-[0_16px_35px_-16px_rgba(255,79,56,.8)] hover:bg-[#e63d27]" />
              <a href="#product" className="inline-flex items-center rounded-xl border border-black/10 bg-white px-6 py-3.5 text-sm font-semibold shadow-sm transition-transform hover:-translate-y-0.5">See how it works <span aria-hidden="true" className="ml-2">↓</span></a>
            </div>
          </div>
          <PremiumShowcase />
          <div className="premium-proof relative mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-y-6 px-5 sm:grid-cols-4 sm:px-8">
            {[["7+","built-in exams"],["4","analytical views"],["50","day plan included"],["JSON","portable backup"]].map(([value,label])=><div key={label} className="text-center"><b className="text-2xl tracking-[-0.05em]">{value}</b><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8c8588]">{label}</p></div>)}
          </div>
        </section>

        <section id="product" className="scroll-mt-20 px-5 py-24 sm:px-8 sm:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="premium-reveal max-w-4xl"><p className="premium-kicker">Intuitive by design</p><h2 className="mt-5 text-[clamp(2.7rem,6vw,6rem)] font-bold leading-[0.92] tracking-[-0.065em]">A system you can understand in one scroll.</h2><p className="mt-6 max-w-2xl text-base leading-relaxed text-[#716a6d]">The real workspace structure, rebuilt here as a premium product story: capture the result, read it at the right scope, and schedule the response.</p></div>
            <div className="mt-16 grid gap-12 lg:grid-cols-3">
              <FeatureCard number="01" title="Record the real paper" body="Exam, tier, scoring, timing and subject detail stay attached to the attempt."><ScoreIllustration /></FeatureCard>
              <FeatureCard number="02" title="Read without distortion" body="One saved result becomes four useful views and is never counted twice."><AnalysisIllustration /></FeatureCard>
              <FeatureCard number="03" title="Plan the response" body="Tests, revision, tasks and evidence meet on the same dated surface."><PlanIllustration /></FeatureCard>
            </div>
          </div>
        </section>

        <PremiumJourney />

        <section id="exams" className="premium-exams relative scroll-mt-20 overflow-hidden px-5 py-28 sm:px-8 sm:py-40">
          <div aria-hidden="true" className="absolute left-1/2 top-1/2 size-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ff4f38]/10" />
          <div aria-hidden="true" className="absolute left-1/2 top-1/2 size-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ff4f38]/10" />
          <div className="relative mx-auto max-w-5xl text-center">
            <p className="premium-kicker">Exam-aware by default</p>
            <h2 className="mx-auto mt-5 max-w-[12ch] text-[clamp(2.8rem,6vw,6rem)] font-bold leading-[0.92] tracking-[-0.065em]">One workspace. Every pattern keeps its meaning.</h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#716a6d]">Question counts, maximum marks, marking schemes, duration and sectional structure come from the selected exam tier and stay frozen on saved results.</p>
            <div className="mx-auto mt-14 flex max-w-4xl flex-wrap justify-center gap-3">{EXAMS.map((exam,index)=><span key={exam} className={`premium-orbit-chip rounded-full border px-5 py-3 text-sm font-semibold shadow-sm ${index===0?"border-[#ff4f38] bg-[#ff4f38] text-white":"border-black/8 bg-white text-[#4f484b]"}`} style={{animationDelay:`${index*90}ms`}}>{exam}</span>)}</div>
          </div>
        </section>

        <section id="privacy" className="scroll-mt-20 bg-[#171315] px-5 py-24 text-white sm:px-8 sm:py-32">
          <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
            <div className="premium-reveal"><p className="premium-kicker !text-[#ff806f]">Private by construction</p><h2 className="mt-5 text-[clamp(2.8rem,6vw,5.8rem)] font-bold leading-[0.92] tracking-[-0.065em]">Your account is the boundary.</h2><p className="mt-6 max-w-xl text-base leading-relaxed text-white/58">Every read and write is scoped to the verified user. There is no guest workspace, shared account surface or administrator view.</p><div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold"><span className="rounded-full bg-white/8 px-4 py-2">Google sign-in</span><span className="rounded-full bg-white/8 px-4 py-2">AES-256-GCM key storage</span><span className="rounded-full bg-white/8 px-4 py-2">Portable backup</span></div></div>
            <div className="premium-reveal grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] bg-white p-6 text-[#171315]"><p className="premium-kicker">Your backup includes</p><ul className="mt-6 space-y-3 text-sm text-[#716a6d]">{["Attempts and subject results","Notes, rank and percentile","Planner work and target settings","Per-subject timing"].map(x=><li key={x} className="flex gap-3"><span className="text-[#ff4f38]">+</span>{x}</li>)}</ul></div>
              <div className="rounded-[28px] border border-white/12 bg-white/5 p-6"><p className="premium-kicker !text-white/45">Never included</p><ul className="mt-6 space-y-3 text-sm text-white/58">{["Email address or user ID","Sign-in credentials","Your AI provider key","Another account's data"].map(x=><li key={x} className="flex gap-3"><span className="text-[#ff806f]">−</span>{x}</li>)}</ul></div>
              <div className="sm:col-span-2 rounded-[28px] bg-gradient-to-r from-[#ff4f38] to-[#ff739f] p-6"><p className="text-sm font-bold">Optional AI stays read-only.</p><p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">It can interpret recent aggregates and propose next actions. It cannot create, edit or schedule a mock, and the ordinary workspace works without it.</p></div>
            </div>
          </div>
        </section>

        <section id="questions" className="scroll-mt-20 px-5 py-24 sm:px-8 sm:py-32">
          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.7fr_1.3fr]">
            <div className="premium-reveal"><p className="premium-kicker">Questions, answered</p><h2 className="mt-5 text-[clamp(2.7rem,5vw,5rem)] font-bold leading-[0.93] tracking-[-0.06em]">Know the details before you sign in.</h2><p className="mt-6 text-sm leading-relaxed text-[#716a6d]">Accounts, scoring, AI and leaving with your data.</p></div>
            <div className="premium-faq premium-reveal"><Faq /></div>
          </div>
        </section>

        <section className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="premium-cta relative overflow-hidden rounded-[32px] border border-[#ff4f38]/10 px-5 py-28 text-center sm:px-8 sm:py-36">
            <div aria-hidden="true" className="premium-aurora absolute inset-0 opacity-80" />
            <div className="relative mx-auto max-w-4xl"><p className="premium-kicker">Begin with one result</p><h2 className="mt-6 text-[clamp(3rem,7vw,7rem)] font-bold leading-[0.88] tracking-[-0.075em]">Your next move is already in the data.</h2><p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-[#716a6d]">Sign in, choose the exam and tier, and record the mock you already took.</p><div className="mt-9 flex justify-center"><GoogleSignInButton enabled={authEnabled} label="Open SSC Insight" className="h-auto rounded-xl bg-[#ff4f38] px-7 py-4 text-sm text-white shadow-[0_16px_35px_-16px_rgba(255,79,56,.8)] hover:bg-[#e63d27]" /></div></div>
          </div>
        </section>
      </main>

      <footer className="px-5 py-12 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 border-t border-black/8 pt-8 text-xs text-[#8c8588] sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2 font-semibold text-[#171315]"><span className="grid size-6 place-items-center rounded-lg bg-[#ff4f38] text-[10px] text-white">S</span>SSC Insight</p><p>Private SSC preparation workspace · Dates in India Standard Time</p><p>Not affiliated with the Staff Selection Commission.</p></div>
      </footer>
    </div>
  );
}

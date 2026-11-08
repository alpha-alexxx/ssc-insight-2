"use client";
import { Accordion } from "radix-ui";

/**
 * Questions, answered with the shipped behaviour rather than marketing.
 *
 * Radix supplies the a11y contract (button headers, `aria-expanded`,
 * `aria-controls`, arrow-key movement). The height animation reads
 * `--radix-accordion-content-height`, which is the only way to animate an
 * unknown content height without measuring it in JS — and the reason the
 * project does not need `tw-animate-css`.
 */

export const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "Do I need a Google account?",
    answer:
      "Yes. Google sign-in is the only way in, and it is what keeps each workspace private. There is no guest mode, no shared account and no administrator view.",
  },
  {
    question: "Does it handle sectional and subject mocks?",
    answer:
      "Full mocks, single-subject mocks, and sectionals (Quant + Reasoning, or English + General Awareness). Computer Knowledge is optional on a full mock: its 60 marks are scored separately from the 390, and its time still counts in your total.",
  },
  {
    question: "What if I attempt a mock on a different day than scheduled?",
    answer:
      "The attempt date is what the tracker records, and history, filters and every chart use it. Logging an attempt never moves or completes a plan task, so the schedule stays exactly where it was.",
  },
  {
    question: "Can I move my data to another Google account?",
    answer:
      "Export a JSON backup, sign in with the other account, and import it. The file carries no email, user ID or credentials. Merge keeps what is already there and skips exact duplicates; replace asks for a fresh safety backup and a confirmation naming the account before it deletes anything.",
  },
  {
    question: "Do I have to configure the AI?",
    answer:
      "No. The coach is optional and stays hidden until a provider is configured. You can enter your own key in Settings or in the panel itself; it is encrypted before storage, shown back only as its last four characters, and excluded from backups. Every table, chart, comparison and plan day works without it.",
  },
  {
    question: "How does CGL Tier 2 scoring work?",
    answer:
      "Three marks for a correct answer, one lost for an incorrect one, and nothing for a question left blank. A full mock is out of 390 — Quant 30, Reasoning 30, English 45 and General Awareness 25 questions — and a subject or sectional mock is out of three times its own question count.",
  },
];

export function Faq() {
  return (
    <Accordion.Root type="single" collapsible className="mt-10">
      {FAQ_ITEMS.map((item) => (
        <Accordion.Item key={item.question} value={item.question} className="faq-item">
          <Accordion.Header>
            <Accordion.Trigger className="faq-trigger">
              <span>{item.question}</span>
              <span className="faq-mark" aria-hidden="true" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="faq-content">
            <div className="faq-answer">{item.answer}</div>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

import { dayTypeLabel } from "../src/lib/plan/view-model.ts";

const types = [
  "PAID MOCK DAY",
  "LIVE MOCK DAY (live window: Sat–Mon)",
  "SUNDAY · WEEKLY REVISION (Rev-2)",
  "FINAL REVISION PHASE (Rev-3)",
  "LIVE MOCK 1 – held 17–19 Oct: attempt now if missed, else re-analyse",
  "LIVE MOCK 2 – LAST DAY OF WINDOW (Sat 24 – Mon 26 Oct)",
  "LIVE MOCK 9 + FINAL REVISION (Rev-3)",
  "SUNDAY · Rev-2 (Weekly) + Rev-3 (Final)",
];
for (const t of types) {
  console.log(JSON.stringify(t), "->", JSON.stringify(dayTypeLabel(t)));
}

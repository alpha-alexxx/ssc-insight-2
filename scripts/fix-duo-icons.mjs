import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * @duo-icons/react ships its compiled SVGs with the kebab-case attribute
 * "fill-rule", which React 19's dev-mode DOM validation flags on every
 * render ("Invalid DOM property `fill-rule`. Did you mean `fillRule`?").
 * The attribute WORKS in the DOM; only the console warning is at issue.
 * Rewriting the prop to camelCase inside the installed package fixes the
 * warning at the source. Runs on every `npm install` via postinstall and
 * is idempotent, so a library update re-patches automatically. If a future
 * version ships camelCase props (or extra kebab-case attributes), extend
 * the REPLACEMENTS map accordingly.
 */

const REPLACEMENTS = [
  ['"fill-rule"', '"fillRule"'],
];

const targets = [
  "dist/index.js",
  "dist/index.umd.cjs",
];

const packageDir = join(process.cwd(), "node_modules", "@duo-icons", "react");
let patched = 0;

for (const target of targets) {
  const file = join(packageDir, target);
  if (!existsSync(file)) continue;
  const before = readFileSync(file, "utf8");
  let after = before;
  for (const [from, to] of REPLACEMENTS) after = after.split(from).join(to);
  if (after !== before) {
    writeFileSync(file, after);
    patched++;
    console.log(`fix-duo-icons: patched ${target}`);
  }
}

console.log(
  patched === 0
    ? "fix-duo-icons: nothing to patch (already clean or layout changed)"
    : `fix-duo-icons: ${patched} file(s) patched`,
);

import WebSocket from "ws";

// Focused check for the dashboard "Today's Plan" day navigator:
// geometry, disabled edges, the conditional Today button, and Tab reachability.
// Usage: node tools/daynav-check.mjs [--width 1440]

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};
const width = Number(argOf("width", "1440"));
const height = Number(argOf("height", width < 768 ? "844" : "1000"));

const targets = await fetch("http://127.0.0.1:9222/json/list").then((r) => r.json());
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("No CDP page target");

const ws = new WebSocket(target.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 256 * 1024 * 1024 });
let nextId = 0;
const pending = new Map();
function send(method, params = {}) {
  const id = ++nextId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
ws.on("message", (raw) => {
  const message = JSON.parse(String(raw));
  if (!message.id) return;
  const item = pending.get(message.id);
  if (!item) return;
  pending.delete(message.id);
  if (message.error) item.reject(new Error(JSON.stringify(message.error)));
  else item.resolve(message.result);
});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await new Promise((resolve, reject) => {
  ws.on("open", resolve);
  ws.on("error", reject);
});
await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
await send("Page.navigate", { url: "http://localhost:3000/dashboard" });
await sleep(20000);

const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return result.result.value;
};

const report = { width };

const read = `(function(){
  const nav = document.querySelector('.day-nav');
  if (!nav) return null;
  const date = nav.querySelector('.day-nav-date');
  const meta = nav.querySelector('.day-nav-meta');
  const steps = [...nav.querySelectorAll('.day-nav-step')];
  const r = nav.getBoundingClientRect();
  const heading = document.querySelector('#today-plan-heading');
  const hr = heading.closest('.section-head').getBoundingClientRect();
  const cs = getComputedStyle(date);
  return {
    date: date.textContent.trim(),
    meta: meta.textContent.trim(),
    metaClipped: meta.scrollWidth > meta.clientWidth + 1,
    dateFont: cs.fontFamily.split(',')[0] + ' ' + cs.fontSize + ' / ' + cs.fontWeight,
    navBox: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    headBox: { h: Math.round(hr.height) },
    sameRowAsHeading: Math.abs(r.y + r.height / 2 - (hr.y + hr.height / 2)) < 24,
    stepSizes: steps.map((s) => Math.round(s.getBoundingClientRect().width) + 'x' + Math.round(s.getBoundingClientRect().height)),
    disabled: steps.map((s) => s.disabled),
    todayButton: (function(){
      const b = [...document.querySelectorAll('button')].find((el) => el.textContent.trim() === 'Today');
      if (!b) return 'absent';
      const cs = getComputedStyle(b);
      return cs.visibility === 'visible' && !b.disabled ? 'usable' : 'hidden';
    })(),
    headingSize: getComputedStyle(heading).fontSize,
  };
})()`;

report.initial = await evaluate(read);

// Step back one day: the Today button must appear, date must change.
await evaluate(`document.querySelector('[aria-label="Previous day"]').click()`);
await sleep(1200);
report.afterPrev = await evaluate(read);

// Return to today.
await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Today')?.click()`);
await sleep(1200);
report.afterToday = await evaluate(read);

// Tab must reach both step buttons with a visible ring (real key events, so
// :focus-visible applies — a synthetic .focus() would report no outline).
await evaluate(`document.querySelector('#main-content')?.scrollIntoView({ block: 'start' });`);
await sleep(300);
for (let i = 0; i < 80; i += 1) {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  await sleep(70);
  const hit = await evaluate(`(function(){
    const a = document.activeElement;
    if (!a || !a.classList.contains('day-nav-step')) return null;
    const cs = getComputedStyle(a);
    return { label: a.getAttribute('aria-label'), outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor };
  })()`);
  if (hit) {
    report.focusRing = hit;
    break;
  }
}

// Stepping must not move the arrows: the row keeps its position because the
// Today button reserves its space at all times.
const before = await evaluate(`document.querySelector('[aria-label="Previous day"]').getBoundingClientRect().x`);
await evaluate(`document.querySelector('[aria-label="Previous day"]').click()`);
await sleep(1000);
const after = await evaluate(`document.querySelector('[aria-label="Previous day"]').getBoundingClientRect().x`);
report.arrowStable = { before: Math.round(before), after: Math.round(after), shift: Math.round(after - before) };

console.log(JSON.stringify(report, null, 2));
ws.close();

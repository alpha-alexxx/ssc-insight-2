import WebSocket from "ws";

/**
 * Post-change UI checks against a running dev server + headless Chrome on CDP.
 *
 *   npm run dev                                   # in another shell
 *   chrome --headless=new --remote-debugging-port=9222 --user-data-dir=%TEMP%\dsh-cdp-profile about:blank
 *   node tools/ui-check.mjs [--url http://localhost:3000/dashboard] [--width 1440]
 *
 * Reports console errors, horizontal overflow, reduced-motion transition
 * durations, and keyboard focus rings for the metric strip. Read-only: it never
 * clicks a control that writes data. Pairs with `tools/shot.mjs` (screenshots).
 */

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};
const url = argOf("url", "http://localhost:3000/dashboard");
const width = Number(argOf("width", "1440"));
const height = Number(argOf("height", "1000"));
const settle = Number(argOf("settle", "15000"));

const targets = await fetch("http://127.0.0.1:9222/json/list").then((r) => r.json());
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("No CDP page target on http://127.0.0.1:9222");

const ws = new WebSocket(target.webSocketDebuggerUrl, {
  perMessageDeflate: false,
  maxPayload: 256 * 1024 * 1024,
});
let nextId = 0;
const pending = new Map();
const problems = [];

function send(method, params = {}) {
  const id = ++nextId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

ws.on("message", (raw) => {
  const message = JSON.parse(String(raw));
  if (message.id) {
    const item = pending.get(message.id);
    if (!item) return;
    pending.delete(message.id);
    if (message.error) item.reject(new Error(JSON.stringify(message.error)));
    else item.resolve(message.result);
    return;
  }
  if (message.method === "Runtime.exceptionThrown") {
    const detail = message.params.exceptionDetails;
    problems.push({ kind: "exception", text: (detail?.exception?.description ?? detail?.text ?? "").slice(0, 300) });
  }
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    problems.push({ kind: "console", text: message.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 300) });
  }
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await new Promise((resolve, reject) => {
  ws.on("open", resolve);
  ws.on("error", reject);
});
await send("Runtime.enable");
await send("Page.enable");

const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};

const withMedia = (features) => send("Emulation.setEmulatedMedia", { features });

await withMedia([{ name: "prefers-color-scheme", value: "light" }]);
await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
await send("Page.navigate", { url });
await sleep(settle);

const report = { url, width };

// 1) Layout: nothing may extend past the viewport unless a scroll container
// (a table twin, a horizontal strip) is clipping it deliberately.
report.overflow = await evaluate(`(function(){
  const vw = document.documentElement.clientWidth;
  const clipped = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
    }
    return false;
  };
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > vw + 1 || r.left < -1) {
      if (clipped(el)) continue;
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 50),
        left: Math.round(r.left),
        right: Math.round(r.right),
      });
    }
  }
  return {
    vw,
    scrollW: document.documentElement.scrollWidth,
    pageScrolls: document.documentElement.scrollWidth > vw + 1,
    count: offenders.length,
    offenders: offenders.slice(0, 6),
  };
})()`);

// 2) Motion: reduced motion must remove every transition on the strip.
report.reducedMotion = await (async () => {
  await withMedia([
    { name: "prefers-color-scheme", value: "light" },
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  await sleep(500);
  const value = await evaluate(`(function(){
    const pick = (sel, prop) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el)[prop] : null;
    };
    return {
      matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
      cell: pick('.metric-cell', 'transitionDuration'),
      rule: pick('.metric-rule > span', 'transitionDuration'),
      go: pick('.metric-cell .metric-go', 'opacity'),
    };
  })()`);
  await withMedia([{ name: "prefers-color-scheme", value: "light" }]);
  await sleep(400);
  return value;
})();

// 3) Keyboard: the first strip cell must show an inset accent ring.
report.focus = await (async () => {
  await evaluate(`document.querySelector('#main-content')?.scrollIntoView({ block: 'start' }); document.body.focus();`);
  for (let i = 0; i < 60; i += 1) {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
    await sleep(90);
    const state = await evaluate(`(function(){
      const a = document.activeElement;
      if (!a || !a.closest('.metric-strip')) return null;
      const cs = getComputedStyle(a);
      return {
        text: (a.innerText || '').replace(/\\n/g, ' / ').slice(0, 60),
        outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor,
        chevron: a.querySelector('.metric-go') ? getComputedStyle(a.querySelector('.metric-go')).opacity : null,
      };
    })()`);
    if (state) return state;
  }
  return "metric strip was never reached by Tab";
})();

report.problems = problems.slice(0, 10);
console.log(JSON.stringify(report, null, 2));

const failed =
  report.overflow.pageScrolls ||
  report.overflow.count > 0 ||
  problems.length > 0 ||
  typeof report.focus === "string";
ws.close();
process.exit(failed ? 1 : 0);

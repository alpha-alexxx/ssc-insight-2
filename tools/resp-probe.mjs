import WebSocket from "ws";

/**
 * Responsive acceptance probe. Prints the computed geometry that the
 * responsive pass is judged on, per width, so "it looks fine" is never the
 * only evidence.
 *
 *   node tools/resp-probe.mjs --widths 320,375,768,1024,1280,1440
 *   node tools/resp-probe.mjs --url http://127.0.0.1:3100/settings --widths 375
 *
 * Read-only. Requires a page target on CDP :9222 and the app running.
 */

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const url = arg("url", "http://127.0.0.1:3100/dashboard");
const widths = arg("widths", "320,375,430,768,834,1024,1280,1440")
  .split(",")
  .map(Number);
const wait = Number(arg("wait", "4500"));

const targets = await fetch("http://127.0.0.1:9222/json/list").then((r) =>
  r.json(),
);
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("No CDP page target on :9222");

const ws = new WebSocket(target.webSocketDebuggerUrl, {
  perMessageDeflate: false,
  maxPayload: 256 * 1024 * 1024,
});
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
await new Promise((resolve, reject) => {
  ws.on("open", resolve);
  ws.on("error", reject);
});
await send("Runtime.enable");
await send("Page.enable");
// Touch emulation so (pointer: coarse) rules are exercised the way a phone
// sees them; the harness runs on desktop hardware.
await send("Emulation.setTouchEmulationEnabled", {
  enabled: true,
  maxTouchPoints: 5,
});

const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};

const probe = `(() => {
  const px = (el, prop) => (el ? getComputedStyle(el)[prop] : null);
  const strip = document.querySelector('.metric-strip');
  const cell = document.querySelector('.metric-cell');
  const value = document.querySelector('.metric-value');
  const titles = [...document.querySelectorAll('.panel-title')];
  const btn = document.querySelector('[data-slot="button"]');
  const field = document.querySelector('input:not([type=checkbox]), select, textarea');
  const seg = document.querySelector('.segment');
  const out = {
    vw: document.documentElement.clientWidth,
    stripCols: strip ? getComputedStyle(strip).gridTemplateColumns : null,
    cellW: cell ? Math.round(cell.getBoundingClientRect().width) : null,
    cellPad: cell ? getComputedStyle(cell).padding : null,
    metricSize: value ? getComputedStyle(value).fontSize : null,
    panelTitle: titles.length ? getComputedStyle(titles[0]).fontSize : null,
    wsTitle: px(document.querySelector('.workspace-title'), 'fontSize'),
    btnH: btn ? Math.round(btn.getBoundingClientRect().height) : null,
    fieldSize: field ? getComputedStyle(field).fontSize : null,
    segH: seg ? Math.round(seg.getBoundingClientRect().height) : null,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    pageScrolls: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
  return JSON.stringify(out);
})()`;

for (const width of widths) {
  const height = width < 700 ? 844 : 900;
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: width < 700 ? 2 : 1,
    mobile: width < 700,
  });
  await send("Page.navigate", { url });
  await new Promise((resolve) => setTimeout(resolve, wait));
  const value = await evaluate(probe);
  console.log(`${String(width).padStart(4)}: ${value}`);
}
ws.close();

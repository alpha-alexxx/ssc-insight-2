import WebSocket from "ws";
import { writeFileSync, mkdirSync } from "node:fs";

// Multi-route, multi-viewport screenshot + console/network log harness.
// Usage: node tools/shot.mjs --out .impeccable/refine --routes /dashboard,/history --widths 1440,390 --dark 1
// Env: CDP_BASE (default http://localhost:3000)

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
}
const outDir = arg("out", ".impeccable/refine");
const routes = (arg("routes", "/dashboard")).split(",");
const widths = (arg("widths", "1440")).split(",").map(Number);
const dark = arg("dark", "0") === "1";
const base = process.env.CDP_BASE ?? "http://localhost:3000";
const waitMs = Number(arg("wait", "7000"));

const targets = await fetch("http://127.0.0.1:9222/json/list").then((r) => r.json());
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("No CDP page target");
const ws = new WebSocket(target.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 256 * 1024 * 1024 });
let nextId = 0;
const pending = new Map();
const logs = [];

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
  if (message.method === "Runtime.consoleAPICalled") {
    const type = message.params.type;
    if (["error", "warning", "assert"].includes(type)) {
      logs.push({ type, text: message.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 400) });
    }
  }
  if (message.method === "Runtime.exceptionThrown") {
    logs.push({
      type: "exception",
      text: (message.params.exceptionDetails?.exception?.description ?? message.params.exceptionDetails?.text ?? "").slice(0, 400),
    });
  }
  if (message.method === "Network.responseReceived") {
    const url = message.params.response.url;
    if (url.includes("/api/") && message.params.response.status >= 400) {
      logs.push({ type: "network", text: `${message.params.response.status} ${url}` });
    }
  }
  if (message.method === "Network.loadingFailed") {
    logs.push({ type: "network-fail", text: `${message.params.errorText}` });
  }
});

await new Promise((resolve, reject) => { ws.on("open", resolve); ws.on("error", reject); });
await send("Runtime.enable");
await send("Log.enable");
await send("Network.enable");
await send("Page.enable");
// Always pin the color scheme so light runs are deterministic in headless.
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }],
});
if (dark) {
  await send("Runtime.evaluate", { expression: "localStorage.setItem('theme','dark')" });
} else {
  await send("Runtime.evaluate", { expression: "localStorage.setItem('theme','light')" });
}

mkdirSync(outDir, { recursive: true });

for (const width of widths) {
  const height = width < 700 ? 844 : 900;
  const mobile = width < 700;
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
  for (const route of routes) {
    logs.length = 0;
    await send("Page.navigate", { url: base + route });
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    // Expand the viewport to the content height and let Recharts re-measure
    // before capturing: captureBeyondViewport forces a mid-paint reflow that
    // collapses ResponsiveContainers (width/height 0 → blank panels).
    const size = await send("Runtime.evaluate", {
      expression: "JSON.stringify({w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight})",
      returnByValue: true,
    });
    const { h: contentH } = JSON.parse(size.result.value);
    const tall = Math.min(contentH + 40, 4400);
    if (tall > height) {
      await send("Emulation.setDeviceMetricsOverride", { width, height: tall, deviceScaleFactor: mobile ? 2 : 1, mobile });
      await new Promise((resolve) => setTimeout(resolve, 2200));
    }
    const probe = await send("Runtime.evaluate", {
      expression: `JSON.stringify({url: location.href, ready: document.readyState, h1: document.querySelector('h1')?.textContent ?? null, title: document.title, hasError: !!document.querySelector('[data-nextjs-dialog-overlay]') || document.body.innerText.includes('Application error'), overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth, text: document.body.innerText.slice(0, 240)})`,
      returnByValue: true,
    });
    const metrics = await send("Page.getLayoutMetrics");
    const content = metrics.cssContentSize;
    const name = (route === "/" ? "root" : route.replace(/\//g, "-").replace(/[^\w-]/g, "")) || "root";
    const suffix = `${name}-${width}${dark ? "-dark" : ""}.png`;
    const shot = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
      clip: { x: 0, y: 0, width: content.width, height: Math.min(content.height, 4400), scale: 1 },
    });
    writeFileSync(`${outDir}/${suffix}`, Buffer.from(shot.data, "base64"));
    console.log(`SHOT ${suffix} | probe: ${probe.result.value}`);
    const interesting = logs.filter((l) => l.type !== "network" || !l.text.startsWith("200"));
    if (interesting.length) console.log(`LOGS ${suffix}: ${JSON.stringify(interesting.slice(0, 12))}`);
  }
}
ws.close();

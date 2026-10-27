import WebSocket from "ws";
import { writeFileSync } from "node:fs";

const targets = await fetch("http://127.0.0.1:9222/json/list").then((r) => r.json());
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("No CDP page target");
const ws = new WebSocket(target.webSocketDebuggerUrl);
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
    logs.push({
      type: message.params.type,
      text: message.params.args.map((arg) => arg.value ?? arg.description).join(" "),
    });
  }
  if (message.method === "Runtime.exceptionThrown") {
    logs.push({
      type: "exception",
      text:
        message.params.exceptionDetails?.exception?.description ??
        message.params.exceptionDetails?.text,
    });
  }
  if (message.method === "Network.responseReceived") {
    const url = message.params.response.url;
    if (url.includes("/api/")) {
      logs.push({ type: "network", text: `${message.params.response.status} ${url}` });
    }
  }
  if (message.method === "Network.loadingFailed") {
    logs.push({ type: "network-fail", text: `${message.params.errorText} ${message.params.requestId}` });
  }
});

await new Promise((resolve) => ws.on("open", resolve));
await send("Runtime.enable");
await send("Log.enable");
await send("Network.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: Number(process.env.CDP_WIDTH ?? 1440),
  height: Number(process.env.CDP_HEIGHT ?? 1200),
  deviceScaleFactor: 1,
  mobile: process.env.CDP_MOBILE === "1",
});
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-color-scheme", value: "light" }],
});
await send("Page.navigate", {
  url: process.env.CDP_URL ?? "http://localhost:3000/dashboard",
});
await new Promise((resolve) => setTimeout(resolve, 12000));
const result = await send("Runtime.evaluate", {
  expression:
    "JSON.stringify({text: document.body.innerText.slice(0, 700), url: location.href, title: document.title, inputs: [...document.querySelectorAll('input,textarea,select')].slice(0,12).map(e=>({tag:e.tagName,type:e.type,value:e.value,placeholder:e.placeholder})), main: document.querySelector('main')?.getBoundingClientRect().toJSON(), sidebarState: document.querySelector('[data-collapsible]')?.dataset, cookie: document.cookie, charts: [...document.querySelectorAll('.recharts-wrapper')].map(e=>({rect:e.getBoundingClientRect().toJSON(), svg:e.querySelector('svg')?.getBoundingClientRect().toJSON(), paths:e.querySelectorAll('path').length, circles:e.querySelectorAll('circle').length, html:e.querySelector('svg')?.innerHTML.slice(0,300)}))})",
  returnByValue: true,
});
console.log("BODY", result.result.value);
console.log("LOGS", JSON.stringify(logs.slice(-20), null, 2));
if (process.env.CDP_ACTION === "ai") {
  const click = await send("Runtime.evaluate", {
    expression:
      "(function(){const b=document.querySelector('[aria-label=\"Open AI coach\"]'); if(!b) return 'missing'; b.click(); return 'clicked';})()",
    returnByValue: true,
  });
  console.log("ACTION", click.result.value);
  await new Promise((resolve) => setTimeout(resolve, 1500));
}
if (process.env.CDP_ACTION === "sidebar") {
  const click = await send("Runtime.evaluate", {
    expression:
      "(function(){const b=document.querySelector('[data-sidebar=\"trigger\"]'); if(!b) return 'missing'; b.click(); return 'clicked';})()",
    returnByValue: true,
  });
  console.log("ACTION", click.result.value);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const state = await send("Runtime.evaluate", {
    expression:
      "JSON.stringify({state: document.querySelector('[data-collapsible]')?.dataset.state, cookie: document.cookie})",
    returnByValue: true,
  });
  console.log("ACTION_STATE", state.result.value);
}
const metrics = await send("Page.getLayoutMetrics");
const content = metrics.cssContentSize;
const screenshot = await send("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: true,
  clip: {
    x: 0,
    y: 0,
    width: content.width,
    height: Math.min(content.height, 2600),
    scale: 1,
  },
});
writeFileSync(process.env.CDP_OUT ?? "dashboard-cdp.png", Buffer.from(screenshot.data, "base64"));
ws.close();

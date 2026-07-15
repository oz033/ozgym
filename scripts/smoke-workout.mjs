/**
 * Headless smoke: open app, click start workout, dump .ig-wo state.
 * Requires Chrome with --remote-debugging-port=9333 already running on 127.0.0.1:5199.
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME =
  process.env.CHROME ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9333;
const APP = "http://127.0.0.1:5199/";
const userData = path.join(os.tmpdir(), "ozgym-cdp-smoke");

fs.rmSync(userData, { recursive: true, force: true });
fs.mkdirSync(userData, { recursive: true });

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${userData}`,
    APP,
  ],
  { stdio: "ignore" },
);

function cleanup() {
  try {
    chrome.kill("SIGKILL");
  } catch {
    /* ignore */
  }
}
process.on("exit", cleanup);

await sleep(3500);

const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
const page = tabs.find((t) => t.type === "page");
if (!page?.webSocketDebuggerUrl) {
  console.error("no page", tabs);
  process.exit(1);
}

// Minimal WebSocket client (no deps) for CDP
const wsMod = await import("node:http");
// Use global WebSocket if available (Node 22+)
const WS = globalThis.WebSocket;
if (!WS) {
  console.error("No global WebSocket — need Node 22+");
  process.exit(1);
}

const ws = new WS(page.webSocketDebuggerUrl);
let nextId = 0;
const pending = new Map();

ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    const t = setTimeout(() => reject(new Error("timeout " + method)), 10000);
    pending.set(id, (msg) => {
      clearTimeout(t);
      resolve(msg);
    });
    ws.send(JSON.stringify({ id, method, params }));
  });

await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve);
  ws.addEventListener("error", reject);
});

await send("Runtime.enable");
await sleep(1500);

const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.result?.exceptionDetails) {
    return { __error: r.result.exceptionDetails.text || "exception" };
  }
  return r.result?.result?.value;
};

const before = await evaluate("document.body.innerText.slice(0, 240)");
console.log("BEFORE:", before);

const click = await evaluate(`
(() => {
  const btns = [...document.querySelectorAll("button")];
  const b = btns.find((x) => /Workout starten|Erstes Workout/i.test(x.textContent || ""));
  if (!b) return "NO_BTN: " + btns.map((x) => (x.textContent || "").trim()).filter(Boolean).slice(0, 10).join(" | ");
  b.click();
  return "CLICKED: " + (b.textContent || "").trim();
})()
`);
console.log("CLICK:", click);

await sleep(2000);

const after = await evaluate(`
(() => {
  const root = document.getElementById("root");
  const wo = document.querySelector(".ig-wo");
  if (!wo) {
    return {
      ok: false,
      reason: "no .ig-wo",
      body: (document.body.innerText || "").slice(0, 400),
      rootHtmlLen: root ? root.innerHTML.length : 0,
    };
  }
  const cs = getComputedStyle(wo);
  const card = document.querySelector(".ig-wo-card.active") || document.querySelector(".ig-wo-card");
  const track = document.querySelector(".ig-wo-track");
  const wrap = document.querySelector(".ig-wo-track-wrap");
  const bottom = document.querySelector(".ig-wo-bottom");
  const head = document.querySelector(".ig-wo-head");
  return {
    ok: true,
    woBg: cs.backgroundColor,
    woColor: cs.color,
    woOpacity: cs.opacity,
    woText: (wo.innerText || "").slice(0, 400),
    headText: head ? head.innerText.slice(0, 120) : null,
    cardCount: document.querySelectorAll(".ig-wo-card").length,
    cardText: card ? card.innerText.slice(0, 200) : null,
    cardOpacity: card ? getComputedStyle(card).opacity : null,
    wrapSize: wrap ? { w: wrap.clientWidth, h: wrap.clientHeight } : null,
    trackTransform: track ? track.style.transform : null,
    trackWidth: track ? track.style.width : null,
    bottomText: bottom ? bottom.innerText.slice(0, 160) : null,
  };
})()
`);
console.log("AFTER:", JSON.stringify(after, null, 2));

ws.close();
cleanup();
process.exit(after?.ok ? 0 : 2);

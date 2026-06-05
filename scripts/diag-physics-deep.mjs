import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const OUT = "C:\\Users\\Jin\\projects\\arechon-site\\.shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push("PAGEERROR: " + e.stack || e.message));
const wasm = [];
page.on("response", (r) => {
  const u = r.url();
  if (u.includes("rapier") || u.endsWith(".wasm")) wasm.push(r.status() + " " + u);
});
page.on("requestfailed", (r) => {
  const u = r.url();
  if (u.includes("rapier") || u.endsWith(".wasm")) wasm.push("FAIL " + u + " " + (r.failure()?.errorText||""));
});

await page.goto("http://localhost:3000/showcase?webgl=force", { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(3000);
await page.evaluate(() => document.getElementById("physics-playground")?.scrollIntoView({ block: "center", behavior: "instant" }));

await page.waitForTimeout(8000);
await page.screenshot({ path: `${OUT}/phys-final.png`, timeout: 60000 });

const meshInfo = await page.evaluate(() => {
  const c = document.querySelector("#physics-playground canvas");
  if (!c) return { canvas: false };
  return { canvas: true, w: c.width, h: c.height };
});

console.log("MESH " + JSON.stringify(meshInfo));
console.log("WASM " + JSON.stringify(wasm, null, 2));
console.log("LOGS:\n" + logs.slice(0, 40).join("\n"));
await browser.close();

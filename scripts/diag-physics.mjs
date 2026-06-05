import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const OUT = "C:\\Users\\Jin\\projects\\arechon-site\\.shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
page.on("requestfailed", (r) => errors.push("REQFAIL: " + r.url() + " :: " + (r.failure()?.errorText ?? "")));

await page.goto("http://localhost:3000/showcase", { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(3500);

// Scroll the Physics Playground section into view by id.
await page.evaluate(() => {
  const el = document.getElementById("physics-playground");
  if (el) el.scrollIntoView({ block: "center" });
});
await page.waitForTimeout(2500); // give Rapier WASM time to load + a few frames

const probe = await page.evaluate(() => {
  const sec = document.getElementById("physics-playground");
  if (!sec) return { found: false };
  const stage = sec.querySelector(".showcase-stage");
  const canvas = stage?.querySelector("canvas");
  const img = stage?.querySelector("img");
  const cs = stage ? getComputedStyle(stage) : null;
  return {
    found: true,
    stageHTML: stage ? stage.innerHTML.slice(0, 220) : "no-stage",
    stageBg: cs?.backgroundColor,
    hasCanvas: !!canvas,
    canvasSize: canvas ? { w: canvas.width, h: canvas.height } : null,
    hasImg: !!img,
    imgSrc: img ? img.getAttribute("src") : null,
    childTags: stage ? Array.from(stage.children).map((c) => c.tagName) : [],
  };
});

console.log("PROBE " + JSON.stringify(probe, null, 2));
console.log("ERRORS " + JSON.stringify(errors.slice(0, 15), null, 2));

await page.screenshot({ path: `${OUT}/physics-section.png` });
await browser.close();

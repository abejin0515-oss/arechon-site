import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "C:\\Users\\Jin\\projects\\arechon-site\\.shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

await page.goto("http://localhost:3000/showcase", { waitUntil: "load", timeout: 60000 });

// Catch the curtain mid-reveal, then let it finish.
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/00-curtain.png` });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/01-top.png` });

// Scroll through with real wheel events (Lenis-driven), screenshot each stop.
const steps = 14;
for (let i = 0; i < steps; i++) {
  await page.mouse.wheel(0, 780);
  await page.waitForTimeout(900);
  const n = String(i + 2).padStart(2, "0");
  await page.screenshot({ path: `${OUT}/${n}-scroll.png` });
}

// Final state + metrics.
const info = await page.evaluate(() => ({
  scrollY: Math.round(window.scrollY),
  docHeight: document.documentElement.scrollHeight,
  // count technique demo elements still stuck invisible (opacity 0)
  hiddenUnits: Array.from(
    document.querySelectorAll("[data-kinetic-unit]"),
  ).filter((el) => getComputedStyle(el).opacity === "0").length,
  totalUnits: document.querySelectorAll("[data-kinetic-unit]").length,
  sections: document.querySelectorAll(".showcase-section").length,
  curtainGone: !document.getElementById("intro-curtain"),
}));

console.log("INFO " + JSON.stringify(info));
console.log("ERRORS " + JSON.stringify(errors.slice(0, 10)));

await browser.close();

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = "C:\\Users\\Jin\\projects\\arechon-site\\.shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

await page.goto("http://localhost:3000/showcase", {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});

// Poll until the SSR curtain element is gone, then settle.
for (let i = 0; i < 40; i++) {
  const gone = await page.evaluate(() => !document.getElementById("intro-curtain"));
  if (gone) break;
  await page.waitForTimeout(200);
}
await page.waitForTimeout(1400); // let kinetic headline finish rising
await page.screenshot({ path: join(OUT, "hero-now.png") });

// nudge 1px to ensure any scroll-driven reveal has fired, reshoot
await page.mouse.wheel(0, 1);
await page.waitForTimeout(900);
await page.screenshot({ path: join(OUT, "hero-settled.png") });

const info = await page.evaluate(() => {
  const h1 = document.querySelector(".showcase-hero h1") || document.querySelector(".showcase-hero .type-display");
  const c = h1 ? getComputedStyle(h1) : null;
  return {
    curtain: !!document.getElementById("intro-curtain"),
    h1op: c ? c.opacity : null,
    h1color: c ? c.color : null,
    h1size: c ? c.fontSize : null,
  };
});
console.log("INFO " + JSON.stringify(info));

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(800);
await page.screenshot({ path: join(OUT, "hero-mobile.png") });

console.log("DONE err=" + JSON.stringify(errors.slice(0, 5)));
await browser.close();

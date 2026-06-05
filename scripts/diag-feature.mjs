import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const OUT = "C:\\Users\\Jin\\projects\\arechon-site\\.shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/showcase", { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(3500);

const feature = page.locator("#distortion-image-hero");
await feature.scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);

const info = await page.evaluate(() => {
  const sec = document.getElementById("distortion-image-hero");
  const img = sec?.querySelector("img");
  const canvas = sec?.querySelector("canvas");
  return {
    imgSrc: img ? img.getAttribute("src") : null,
    imgNatural: img ? { w: img.naturalWidth, h: img.naturalHeight } : null,
    imgComplete: img ? img.complete : null,
    hasCanvas: !!canvas,
  };
});
console.log("FEATURE " + JSON.stringify(info));

await feature.screenshot({ path: `${OUT}/feature.png` });
console.log("saved feature.png");
await browser.close();

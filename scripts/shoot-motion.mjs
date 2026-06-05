import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const OUT = "C:\\Users\\Jin\\projects\\arechon-site\\.shots";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("http://localhost:3000/motion?webgl=force", { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(3000);

// find the three canvases / stages and screenshot each with cursor over it
const stages = await page.$$("canvas");
console.log("canvases:", stages.length);

const labels = ["distortion", "depth", "cinemagraph"];
for (let i = 0; i < Math.min(stages.length, 3); i++) {
  await stages[i].scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  const box = await stages[i].boundingBox();
  if (box) {
    // move cursor across the canvas to trigger distortion/depth
    await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.4);
    await page.waitForTimeout(400);
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.6, { steps: 8 });
    await page.waitForTimeout(900);
  }
  await page.screenshot({ path: `${OUT}/motion-${i}-${labels[i] || i}.png` });
}
console.log("ERRORS " + JSON.stringify(errs.slice(0, 5)));
await browser.close();

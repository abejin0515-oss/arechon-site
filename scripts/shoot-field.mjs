import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const OUT = "C:\\Users\\Jin\\projects\\arechon-site\\.shots";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("http://localhost:3000/field?webgl=force", { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(3000);
// resting state
await page.screenshot({ path: `${OUT}/field-rest.png` });
// stir the field with a cursor stroke (swirl)
for (let k = 0; k < 3; k++) {
  await page.mouse.move(420, 300, { steps: 6 });
  await page.mouse.move(1000, 420, { steps: 18 });
  await page.mouse.move(720, 640, { steps: 18 });
  await page.mouse.move(420, 300, { steps: 18 });
}
await page.waitForTimeout(250);
await page.screenshot({ path: `${OUT}/field-stir.png` });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/field-decay.png` });
console.log("ERRORS " + JSON.stringify(errs.slice(0, 5)));
await browser.close();

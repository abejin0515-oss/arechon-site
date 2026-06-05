import { chromium } from "playwright";
const OUT = "C:\\Users\\Jin\\projects\\arechon-site\\.shots";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/motion?webgl=force", { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(2500);
const h = await page.evaluate(() => document.documentElement.scrollHeight);
const positions = [0.0, 0.42, 0.82];
const names = ["a-distortion", "b-depth", "c-cinemagraph"];
for (let i = 0; i < positions.length; i++) {
  await page.evaluate((p) => window.scrollTo({ top: document.documentElement.scrollHeight * p, behavior: "instant" }), positions[i]);
  await page.waitForTimeout(1400);
  await page.mouse.move(500, 430);
  await page.waitForTimeout(300);
  await page.mouse.move(940, 470, { steps: 10 });
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${OUT}/mo-${names[i]}.png` });
}
console.log("done h=" + h);
await browser.close();

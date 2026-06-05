import { chromium } from "playwright";
const URL = "http://localhost:3009/grain?webgl=force";
const browser = await chromium.launch({
  args: ["--use-gl=swiftshader", "--ignore-gpu-blocklist"],
});
const bag = { errors: [] };
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => { if (m.type() === "error") bag.errors.push(m.text()); });
page.on("pageerror", (e) => bag.errors.push("PAGEERROR: " + e.message));
await page.goto(URL, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(4000);
await page.mouse.move(40, 40);
await page.waitForTimeout(1600);
const seasonFar = await page.evaluate(() => window.__grainSeason ?? null);
await page.mouse.move(720, 450);
await page.waitForTimeout(1600);
const seasonNear = await page.evaluate(() => window.__grainSeason ?? null);
// scroll down then test proximity STILL overrides macro aging
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.8));
await page.waitForTimeout(1000);
await page.mouse.move(720, 450); // lean in at a "late year" → should still go new (low)
await page.waitForTimeout(1700);
const seasonNearLate = await page.evaluate(() => window.__grainSeason ?? null);
console.log(JSON.stringify({
  seasonFar, seasonNear, seasonNearLate,
  seasonChanged: seasonFar != null && seasonNear != null && seasonNear < seasonFar - 0.1,
  proximityOverridesMacro: seasonNearLate != null && seasonNearLate < 0.45,
  errors: bag.errors,
}, null, 2));
await browser.close();

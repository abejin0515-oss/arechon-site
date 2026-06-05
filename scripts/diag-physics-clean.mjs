import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const OUT = "C:\\Users\\Jin\\projects\\arechon-site\\.shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push("PAGEERROR: " + (e.stack || e.message)));

await page.goto("http://localhost:3000/showcase?webgl=force", { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(2500);
await page.evaluate(() => document.getElementById("physics-playground")?.scrollIntoView({ block: "center", behavior: "instant" }));
// No readPixels at all. Just let it run and shoot.
await page.waitForTimeout(7000);
await page.screenshot({ path: `${OUT}/clean-phys.png`, timeout: 60000 });

// count active webgl contexts the page has made
const ctxInfo = await page.evaluate(() => {
  return { canvases: document.querySelectorAll("canvas").length };
});
console.log("CTX " + JSON.stringify(ctxInfo));
console.log("LOGS:\n" + logs.filter(l => !l.includes("DevTools")).join("\n"));
await browser.close();

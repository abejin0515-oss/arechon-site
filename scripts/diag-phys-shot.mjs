// Pure visual: no readPixels, no toDataURL. Just scroll + element screenshot.
import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on("console", (m) => { if (/error|lost|warn/i.test(m.type())) logs.push(`[${m.type()}] ${m.text()}`.slice(0,160)); });
page.on("pageerror", (e) => logs.push("PAGEERR " + e.message));

await page.goto("http://localhost:3000/showcase?webgl=force", { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(2500);
await page.evaluate(() => document.getElementById("physics-playground")?.scrollIntoView({ block: "center", behavior: "instant" }));
await page.waitForTimeout(7000);
const el = await page.$("#physics-playground .showcase-stage, #physics-playground [style*='border-radius']");
if (el) await el.screenshot({ path: "C:\\Users\\Jin\\projects\\arechon-site\\.shots\\PHYS_CLEAN.png", timeout: 40000 });
else await page.screenshot({ path: "C:\\Users\\Jin\\projects\\arechon-site\\.shots\\PHYS_CLEAN.png", timeout: 40000 });
console.log("LOGS:\n" + logs.filter(l=>!/deprecated/.test(l)).join("\n"));
await browser.close();

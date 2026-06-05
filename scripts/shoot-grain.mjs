import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const OUT = "C:\\Users\\Jin\\projects\\arechon-site\\.shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", (e) => errs.push("PE: " + e.message));

// force the WebGL path so SwiftShader renders the grain (real grain, not poster)
await page.goto("http://localhost:3000/grain?webgl=force", { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(2500);

const cx = 720, cy = 450;
// FAR cursor -> aged rice (古米)
await page.mouse.move(120, 120);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/grain-far-aged.png` });

// NEAR cursor -> new rice (新米)
await page.mouse.move(cx, cy);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/grain-near-new.png` });

const info = await page.evaluate(() => ({
  hasCanvas: !!document.querySelector("canvas"),
  truth: (document.body.innerText || "").includes("阿部米穀"),
}));
console.log("INFO " + JSON.stringify(info));
console.log("ERRORS " + JSON.stringify(errs.slice(0, 6)));
await browser.close();

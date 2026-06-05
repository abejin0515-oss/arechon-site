import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const OUT = "C:\\Users\\Jin\\projects\\arechon-site\\.shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

await page.goto("http://localhost:3000/showcase?webgl=force", { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(4000);

async function probe(id, settleMs = 4000) {
  await page.evaluate((sel) => document.getElementById(sel)?.scrollIntoView({ block: "center", behavior: "instant" }), id);
  await page.waitForTimeout(settleMs);
  const data = await page.evaluate((sel) => {
    const sec = document.getElementById(sel);
    if (!sec) return { found: false };
    const canvases = Array.from(sec.querySelectorAll("canvas"));
    const sample = (c) => {
      try {
        const tmp = document.createElement("canvas");
        tmp.width = c.width; tmp.height = c.height;
        const ctx = tmp.getContext("2d");
        ctx.drawImage(c, 0, 0);
        const lum = [];
        const N = 6;
        for (let i = 1; i < N; i++) for (let j = 1; j < N; j++) {
          const d = ctx.getImageData(Math.floor(c.width*i/N), Math.floor(c.height*j/N), 1, 1).data;
          lum.push(Math.round(0.299*d[0]+0.587*d[1]+0.114*d[2]));
        }
        return { w: c.width, h: c.height, lumMin: Math.min(...lum), lumMax: Math.max(...lum), spread: Math.max(...lum)-Math.min(...lum) };
      } catch (e) { return { error: e.message }; }
    };
    return { found: true, canvasCount: canvases.length, canvases: canvases.map(sample) };
  }, id);
  return data;
}

for (const id of ["distortion-image-hero", "physics-playground", "atmosphere-background"]) {
  const r = await probe(id, id === "physics-playground" ? 6000 : 4000);
  console.log("== " + id + " ==\n" + JSON.stringify(r));
  await page.screenshot({ path: `${OUT}/force-${id}.png` });
}

// also a full-page atmosphere shot at top
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/force-top.png` });

console.log("ERRORS " + JSON.stringify(errors.slice(0, 15), null, 2));
await browser.close();

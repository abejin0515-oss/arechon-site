import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "C:\\Users\\Jin\\projects\\arechon-site\\.shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
const net404 = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
page.on("requestfailed", (r) => net404.push("FAIL " + r.url() + " :: " + (r.failure()?.errorText || "")));
page.on("response", (r) => {
  if (r.status() >= 400) net404.push(r.status() + " " + r.url());
});

await page.goto("http://localhost:3000/showcase", { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(4000); // let curtain lift + first paints

// Probe helper: scroll a section into view, wait, sample canvas pixels.
async function probe(id) {
  await page.evaluate((sel) => {
    document.getElementById(sel)?.scrollIntoView({ block: "center", behavior: "instant" });
  }, id);
  await page.waitForTimeout(2200);
  const data = await page.evaluate((sel) => {
    const sec = document.getElementById(sel);
    if (!sec) return { found: false };
    const r = sec.getBoundingClientRect();
    const canvases = Array.from(sec.querySelectorAll("canvas"));
    const sampleCanvas = (c) => {
      try {
        const tmp = document.createElement("canvas");
        tmp.width = c.width; tmp.height = c.height;
        const ctx = tmp.getContext("2d");
        ctx.drawImage(c, 0, 0);
        const at = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data);
        // sample a grid; report how many distinct-ish pixels (variance proxy)
        const pts = [];
        const N = 5;
        for (let i = 1; i < N; i++)
          for (let j = 1; j < N; j++)
            pts.push(at(Math.floor(c.width * i / N), Math.floor(c.height * j / N)));
        // compute luminance spread
        const lum = pts.map(p => 0.299*p[0]+0.587*p[1]+0.114*p[2]);
        const min = Math.min(...lum), max = Math.max(...lum);
        return { w: c.width, h: c.height, center: at(c.width>>1, c.height>>1), lumMin: Math.round(min), lumMax: Math.round(max), spread: Math.round(max-min) };
      } catch (e) {
        return { error: String(e.message) };
      }
    };
    return {
      found: true,
      rectTop: Math.round(r.top),
      canvasCount: canvases.length,
      canvases: canvases.map(sampleCanvas),
      // count visible kinetic units & framer-motion opacity-0 children
      hiddenUnits: Array.from(sec.querySelectorAll("[data-kinetic-unit]")).filter(e => getComputedStyle(e).opacity === "0").length,
      totalUnits: sec.querySelectorAll("[data-kinetic-unit]").length,
      imgCount: sec.querySelectorAll("img").length,
      svgCount: sec.querySelectorAll("svg").length,
    };
  }, id);
  return data;
}

const sections = [
  "kinetic-headline",
  "parallax-image",
  "scroll-world-transition",
  "magnetic-button",
  "loading-sequence",
  "distortion-image-hero",
  "physics-playground",
  "atmosphere-background",
  "sound-design",
  "countup-statblock",
  "animated-bars",
  "animated-line",
];

const results = {};
for (const s of sections) {
  results[s] = await probe(s);
  const n = s.slice(0, 12);
  await page.screenshot({ path: `${OUT}/sec-${s}.png` });
  console.log("== " + s + " ==");
  console.log(JSON.stringify(results[s]));
}

// renderer string
const renderer = await page.evaluate(() => {
  const c = document.createElement("canvas");
  const gl = c.getContext("webgl2") || c.getContext("webgl");
  if (!gl) return "no-webgl";
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "masked";
});

console.log("\nRENDERER " + renderer);
console.log("ERRORS " + JSON.stringify(errors.slice(0, 20), null, 2));
console.log("NET " + JSON.stringify([...new Set(net404)].slice(0, 20), null, 2));

await browser.close();

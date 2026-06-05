import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "C:\\Users\\Jin\\projects\\arechon-site\\.shots\\verify";
mkdirSync(OUT, { recursive: true });

const MODE = process.argv[2] || "force"; // "force" | "fallback"
const url =
  MODE === "fallback"
    ? "http://localhost:3000/showcase"
    : "http://localhost:3000/showcase?webgl=force";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
const net = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PE: " + e.message));
page.on("response", (r) => { if (r.status() >= 400) net.push(r.status() + " " + r.url()); });
page.on("requestfailed", (r) => net.push("FAIL " + r.url()));

await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(4500);

// Each section: id, what "content present" means.
const sections = [
  { id: "distortion-image-hero", kind: "webgl-or-img" },
  { id: "kinetic-headline", kind: "text" },
  { id: "parallax-image", kind: "img" },
  { id: "magnetic-button", kind: "text" },
  { id: "loading-sequence", kind: "text" },
  { id: "scroll-world-transition", kind: "text" },
  { id: "distortion-image-hero-detail", kind: "text" },
  { id: "physics-playground", kind: "canvas-or-grid" },
  { id: "atmosphere-background", kind: "text" },
  { id: "countup-statblock", kind: "text" },
  { id: "animated-bars", kind: "svg" },
  { id: "animated-line", kind: "svg" },
  { id: "sound-design", kind: "text" },
];

const report = {};
for (const s of sections) {
  await page.evaluate((id) => {
    document.getElementById(id)?.scrollIntoView({ block: "center", behavior: "instant" });
  }, s.id);
  await page.waitForTimeout(1600);
  const data = await page.evaluate((id) => {
    const sec = document.getElementById(id);
    if (!sec) return { found: false };
    const text = (sec.innerText || "").trim();
    return {
      found: true,
      rectH: Math.round(sec.getBoundingClientRect().height),
      canvases: sec.querySelectorAll("canvas").length,
      imgs: sec.querySelectorAll("img").length,
      svgs: sec.querySelectorAll("svg").length,
      // a poster grid (physics fallback) is a div[role=img] with span tiles
      gridTiles: sec.querySelectorAll('[role="img"] span').length,
      textLen: text.length,
      // any element with a non-zero painted box?
      hasBox: sec.getBoundingClientRect().height > 40,
    };
  }, s.id);

  // PASS rule: section exists, has a box, and has the expected kind of content.
  let pass = data.found && data.hasBox;
  if (pass) {
    switch (s.kind) {
      case "canvas-or-grid": pass = data.canvases > 0 || data.gridTiles >= 6; break;
      case "webgl-or-img": pass = data.canvases > 0 || data.imgs > 0; break;
      case "img": pass = data.imgs > 0; break;
      case "svg": pass = data.svgs > 0; break;
      case "text": pass = data.textLen > 4; break;
    }
  }
  report[s.id] = { pass, ...data };
  console.log((pass ? "PASS " : "FAIL ") + s.id + " :: " + JSON.stringify(data));
}

// Hero flare: the last kinetic unit of the hero title should be accent-colored.
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(800);
const flare = await page.evaluate(() => {
  const t = document.querySelector(".showcase-hero__title");
  if (!t) return { found: false };
  const units = Array.from(t.querySelectorAll("[data-kinetic-unit]"));
  const last = units[units.length - 1];
  const first = units[0];
  if (!last) return { found: true, units: units.length, last: null };
  const csL = getComputedStyle(last);
  const csF = getComputedStyle(first);
  return {
    found: true, units: units.length,
    lastText: last.textContent, lastColor: csL.color, lastAnim: csL.animationName,
    firstText: first.textContent, firstColor: csF.color,
    onlyLastAccent: csL.color !== csF.color,
  };
});
console.log("\nHERO FLARE " + JSON.stringify(flare));

await page.screenshot({ path: `${OUT}/full-${MODE}.png`, fullPage: false });
console.log("\nRENDERER " + await page.evaluate(() => {
  const c = document.createElement("canvas");
  const gl = c.getContext("webgl2") || c.getContext("webgl");
  const ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "n/a";
}));
console.log("ERRORS " + JSON.stringify([...new Set(errors)].slice(0, 25), null, 2));
console.log("NET " + JSON.stringify([...new Set(net)].slice(0, 25), null, 2));

const fails = Object.entries(report).filter(([, v]) => !v.pass).map(([k]) => k);
console.log("\nSUMMARY " + (Object.values(report).filter(v => v.pass).length) + "/" + sections.length + " pass" + (fails.length ? " — FAILS: " + fails.join(", ") : ""));

await browser.close();

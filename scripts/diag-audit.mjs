import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "C:\\Users\\Jin\\projects\\arechon-site\\.shots\\audit";
mkdirSync(OUT, { recursive: true });
const URL = "http://localhost:3000/showcase";

const browser = await chromium.launch();

function hookConsole(page, bag) {
  page.on("console", (m) => {
    if (m.type() === "error") bag.errors.push(m.text());
    if (m.type() === "warning") bag.warns.push(m.text());
  });
  page.on("pageerror", (e) => bag.errors.push("PAGEERROR: " + e.message));
  page.on("requestfailed", (r) => {
    const u = r.url();
    if (!u.startsWith("data:")) bag.failed.push(r.failureText + " " + u);
  });
  page.on("response", (r) => {
    if (r.status() >= 400) bag.http.push(r.status() + " " + r.url());
  });
}

async function settle(page) {
  // dismiss curtain
  await page.waitForTimeout(1800);
  // force-finish any intro curtain if still present
  await page.evaluate(() => {
    const c = document.getElementById("intro-curtain");
    if (c) c.remove();
  });
  await page.waitForTimeout(400);
}

// ---- helper: walk the whole page, find "invisible / empty box" elements ----
async function structuralAudit(page) {
  return await page.evaluate(() => {
    const out = {};
    out.h1 = Array.from(document.querySelectorAll("h1")).map((h) => h.textContent.trim());
    out.headingOrder = Array.from(document.querySelectorAll("h1,h2,h3,h4")).map(
      (h) => h.tagName + ":" + h.textContent.trim().slice(0, 24),
    );
    out.landmarks = {
      main: document.querySelectorAll("main").length,
      header: document.querySelectorAll("header").length,
      footer: document.querySelectorAll("footer").length,
      nav: document.querySelectorAll("nav").length,
    };
    // images without alt
    out.imgsNoAlt = Array.from(document.querySelectorAll("img")).filter(
      (i) => !i.hasAttribute("alt"),
    ).length;
    out.imgCount = document.querySelectorAll("img").length;
    // canvases & their painted state
    out.canvases = Array.from(document.querySelectorAll("canvas")).map((c) => {
      const r = c.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    });
    // buttons without accessible name
    out.btnsNoName = Array.from(document.querySelectorAll("button")).filter((b) => {
      const name = (b.textContent || "").trim() || b.getAttribute("aria-label");
      return !name;
    }).length;
    // find elements that occupy real space but render nothing visible:
    // big blocks whose bg is transparent AND have no text AND no img/canvas/svg child
    const suspects = [];
    const all = document.querySelectorAll("section, div, figure, [data-scene]");
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.width < 120 || r.height < 120) continue;
      const cs = getComputedStyle(el);
      const hasMedia = el.querySelector("img,canvas,svg,video,picture");
      const text = (el.textContent || "").trim();
      const bg = cs.backgroundColor;
      const bgImg = cs.backgroundImage;
      const transparentBg =
        (bg === "rgba(0, 0, 0, 0)" || bg === "transparent") && bgImg === "none";
      if (!hasMedia && !text && transparentBg && cs.opacity !== "0") {
        suspects.push({
          tag: el.tagName,
          cls: el.className?.toString().slice(0, 50),
          w: Math.round(r.width),
          h: Math.round(r.height),
        });
      }
    }
    out.emptyBoxSuspects = suspects.slice(0, 20);
    return out;
  });
}

// =================== PASS 1: default (poster / no real GPU) ===================
const bag1 = { errors: [], warns: [], failed: [], http: [] };
const page1 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
hookConsole(page1, bag1);
await page1.goto(URL, { waitUntil: "load", timeout: 60000 });
// SEO from <head>
const seo = await page1.evaluate(() => ({
  title: document.title,
  robots: document.querySelector('meta[name="robots"]')?.content ?? null,
  desc: document.querySelector('meta[name="description"]')?.content ?? null,
  canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
  lang: document.documentElement.lang,
}));
await settle(page1);
const struct1 = await structuralAudit(page1);

// scroll the full page, screenshot stops
await page1.evaluate(() => window.scrollTo(0, 0));
await page1.waitForTimeout(300);
const totalH = await page1.evaluate(() => document.documentElement.scrollHeight);
const vh = 900;
let shot = 0;
for (let y = 0; y < totalH; y += Math.round(vh * 0.85)) {
  await page1.evaluate((yy) => window.scrollTo(0, yy), y);
  await page1.waitForTimeout(700);
  await page1.screenshot({ path: `${OUT}/p1-${String(shot).padStart(2, "0")}.png` });
  shot++;
}
// focus indicator probe: tab to first interactive, screenshot
await page1.evaluate(() => window.scrollTo(0, 0));
await page1.waitForTimeout(400);
await page1.keyboard.press("Tab");
await page1.keyboard.press("Tab");
const focusInfo = await page1.evaluate(() => {
  const el = document.activeElement;
  const cs = el ? getComputedStyle(el) : null;
  return {
    tag: el?.tagName,
    text: (el?.textContent || "").trim().slice(0, 30),
    outline: cs?.outlineStyle + " " + cs?.outlineWidth + " " + cs?.outlineColor,
    boxShadow: cs?.boxShadow?.slice(0, 40),
  };
});

console.log("SEO " + JSON.stringify(seo));
console.log("STRUCT1 " + JSON.stringify(struct1));
console.log("FOCUS " + JSON.stringify(focusInfo));
console.log("BAG1 errors=" + JSON.stringify(bag1.errors.slice(0, 8)));
console.log("BAG1 http=" + JSON.stringify(bag1.http.slice(0, 8)));
console.log("BAG1 failed=" + JSON.stringify(bag1.failed.slice(0, 8)));

// =================== PASS 2: ?webgl=force (real scenes under SwiftShader) ===================
const bag2 = { errors: [], warns: [], failed: [], http: [] };
const page2 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
hookConsole(page2, bag2);
await page2.goto(URL + "?webgl=force", { waitUntil: "load", timeout: 60000 });
await settle(page2);
await page2.waitForTimeout(2500); // let GL warm
const canv2 = await page2.evaluate(() =>
  Array.from(document.querySelectorAll("canvas")).map((c) => {
    const r = c.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  }),
);
await page2.screenshot({ path: `${OUT}/p2-hero-force.png` });
// scroll to physics
await page2.evaluate(() => {
  document.getElementById("distortion-image-hero")?.scrollIntoView();
});
await page2.waitForTimeout(1500);
await page2.screenshot({ path: `${OUT}/p2-distortion.png` });
console.log("FORCE canvases=" + JSON.stringify(canv2));
console.log("BAG2 errors=" + JSON.stringify(bag2.errors.slice(0, 10)));

// =================== PASS 3: reduced-motion ===================
const bag3 = { errors: [], warns: [], failed: [], http: [] };
const ctx3 = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
const page3 = await ctx3.newPage();
hookConsole(page3, bag3);
await page3.goto(URL, { waitUntil: "load", timeout: 60000 });
await settle(page3);
const rm = await page3.evaluate(() => ({
  canvases: document.querySelectorAll("canvas").length,
  curtain: !!document.getElementById("intro-curtain"),
}));
await page3.screenshot({ path: `${OUT}/p3-reduced-top.png` });
await page3.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.45));
await page3.waitForTimeout(800);
await page3.screenshot({ path: `${OUT}/p3-reduced-mid.png` });
console.log("REDUCED " + JSON.stringify(rm));
console.log("BAG3 errors=" + JSON.stringify(bag3.errors.slice(0, 8)));

// =================== PASS 4: mobile 360px ===================
const bag4 = { errors: [], warns: [], failed: [], http: [] };
const ctx4 = await browser.newContext({
  viewport: { width: 360, height: 740 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page4 = await ctx4.newPage();
hookConsole(page4, bag4);
await page4.goto(URL, { waitUntil: "load", timeout: 60000 });
await settle(page4);
const mobile = await page4.evaluate(() => ({
  docW: document.documentElement.scrollWidth,
  winW: window.innerWidth,
  overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
}));
let ms = 0;
const mH = await page4.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < mH; y += 640) {
  await page4.evaluate((yy) => window.scrollTo(0, yy), y);
  await page4.waitForTimeout(600);
  await page4.screenshot({ path: `${OUT}/p4-m-${String(ms).padStart(2, "0")}.png` });
  ms++;
  if (ms > 12) break;
}
console.log("MOBILE " + JSON.stringify(mobile));
console.log("BAG4 errors=" + JSON.stringify(bag4.errors.slice(0, 8)));

await browser.close();
console.log("DONE");

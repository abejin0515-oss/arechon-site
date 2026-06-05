import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

// 1) Load the SVG directly as a document — reveals parse errors + whether it renders.
const resp = await page.goto("http://localhost:3000/showcase/hero.svg", { waitUntil: "load" });
console.log("direct svg status:", resp?.status());
const parseErr = await page.evaluate(() => {
  const pe = document.querySelector("parsererror");
  return pe ? pe.textContent.slice(0, 200) : null;
});
console.log("parsererror:", parseErr);
await page.screenshot({ path: "C:\\Users\\Jin\\projects\\arechon-site\\.shots\\svg-direct.png" });

// 2) Compare naturalWidth of hero.svg vs parallax.svg loaded as <img>.
const dims = await page.evaluate(async () => {
  function load(src) {
    return new Promise((res) => {
      const im = new Image();
      im.onload = () => res({ src, ok: true, w: im.naturalWidth, h: im.naturalHeight });
      im.onerror = () => res({ src, ok: false, w: im.naturalWidth, h: im.naturalHeight });
      im.src = src;
    });
  }
  return Promise.all([
    load("/showcase/hero.svg"),
    load("/showcase/parallax.svg"),
  ]);
});
console.log("IMG dims:", JSON.stringify(dims));
await browser.close();

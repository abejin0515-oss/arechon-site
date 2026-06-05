import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/showcase", { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(3500); // let curtain lift

const data = await page.evaluate(() => {
  const cs = (el) => (el ? getComputedStyle(el) : null);
  const html = document.documentElement;
  const body = document.body;
  const root = document.querySelector(".showcase-root");
  const beforeBg = root
    ? getComputedStyle(root, "::before").background.slice(0, 80)
    : "no-root";
  // sample pixel via elementFromPoint stack at the hero (center-left)
  const stack = document.elementsFromPoint(300, 300).map((e) => {
    const c = getComputedStyle(e);
    return {
      tag: e.tagName + (e.className ? "." + String(e.className).split(" ")[0] : ""),
      z: c.zIndex,
      pos: c.position,
      bg: c.backgroundColor,
    };
  });
  // is the atmosphere canvas present + sized?
  const canvas = document.querySelector("canvas");
  return {
    htmlBg: cs(html)?.backgroundColor,
    bodyBg: cs(body)?.backgroundColor,
    rootBg: cs(root)?.backgroundColor,
    rootBeforeBg: beforeBg,
    canvas: canvas
      ? { w: canvas.width, h: canvas.height, display: cs(canvas).display }
      : "NO CANVAS",
    stackAt_300_300: stack.slice(0, 6),
  };
});

console.log(JSON.stringify(data, null, 2));
await browser.close();

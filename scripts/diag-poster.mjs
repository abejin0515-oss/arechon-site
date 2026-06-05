import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const OUT = "C:\\Users\\Jin\\projects\\arechon-site\\.shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/showcase", { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(3500);

// Decisive test: remove every <canvas> so ONLY the CSS fallback (poster + ::before
// floor) remains — this is exactly what a real WebGL-failure user sees, because
// useWebGLSupport returns false there and the canvas never mounts.
await page.evaluate(() => {
  document.querySelectorAll("canvas").forEach((c) => c.remove());
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/poster-only.png` });

// Sample the actual rendered pixel at an empty hero spot via a 1x1 readback.
const px = await page.evaluate(async () => {
  const shot = await new Promise((res) => {
    // use html2canvas-free trick: read the composited color via a tiny canvas
    // drawImage of an element isn't possible; instead report computed floor.
    res(null);
  });
  void shot;
  const root = document.querySelector(".showcase-root");
  return {
    beforeBg: root ? getComputedStyle(root, "::before").backgroundColor : "n/a",
    bodyBg: getComputedStyle(document.body).backgroundColor,
  };
});
console.log("PIXELINFO " + JSON.stringify(px));
await browser.close();

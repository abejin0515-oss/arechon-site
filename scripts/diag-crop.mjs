import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/showcase", { waitUntil: "load" });
await page.waitForTimeout(3500);
await page.evaluate(() => document.getElementById("physics-playground")?.scrollIntoView({ block: "center" }));
try {
  await page.waitForSelector("#physics-playground .showcase-stage canvas", { timeout: 15000 });
} catch {
  console.log("no canvas appeared within 15s (webgl path not taken / failed to mount)");
}
await page.waitForTimeout(3000);

const box = await page.evaluate(() => {
  const c = document.querySelector("#physics-playground .showcase-stage canvas");
  if (!c) return null;
  const r = c.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height, hasCanvas: true };
});
console.log("canvas box:", JSON.stringify(box));
if (box) {
  // Crop the center region of the canvas.
  const cw = 360, ch = 220;
  await page.screenshot({
    path: "C:\\Users\\Jin\\projects\\arechon-site\\.shots\\physics-crop.png",
    clip: { x: box.x + box.w / 2 - cw / 2, y: box.y + box.h / 2 - ch / 2, width: cw, height: ch },
  });
  console.log("cropped center saved");
}
await browser.close();

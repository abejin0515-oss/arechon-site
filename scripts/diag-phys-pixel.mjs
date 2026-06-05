import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`.slice(0,200)));
page.on("pageerror", (e) => logs.push("PAGEERR " + (e.message)));

await page.goto("http://localhost:3000/showcase?webgl=force", { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(2500);
await page.evaluate(() => document.getElementById("physics-playground")?.scrollIntoView({ block: "center", behavior: "instant" }));

// Sample the physics canvas via toDataURL average luminance over time.
// (No SVG texture in physics, so the canvas is not tainted; toDataURL works.)
async function sampleCanvasLuma() {
  return page.evaluate(() => {
    const c = document.querySelector("#physics-playground canvas");
    if (!c) return null;
    try {
      const tmp = document.createElement("canvas");
      tmp.width = 40; tmp.height = 20;
      const ctx = tmp.getContext("2d");
      ctx.drawImage(c, 0, 0, 40, 20);
      const d = ctx.getImageData(0, 0, 40, 20).data;
      let sum = 0, n = 0, white = 0;
      for (let i = 0; i < d.length; i += 4) {
        const l = 0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
        sum += l; n++;
        if (l > 240) white++;
      }
      return { avg: Math.round(sum/n), whitePct: Math.round(100*white/n), w: c.width, h: c.height };
    } catch (e) { return { err: e.message }; }
  });
}

for (let i = 0; i < 5; i++) {
  await page.waitForTimeout(1500);
  console.log(`t=${i} ` + JSON.stringify(await sampleCanvasLuma()));
}
console.log("LOGS:\n" + logs.filter(l=>!/DevTools|HMR|deprecated/.test(l)).join("\n"));
await browser.close();

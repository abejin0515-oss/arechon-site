import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/showcase", { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(3500);
await page.evaluate(() => document.getElementById("physics-playground")?.scrollIntoView({ block: "center" }));
await page.waitForTimeout(2500);

const out = await page.evaluate(() => {
  // renderer string
  const probe = document.createElement("canvas");
  const gl = probe.getContext("webgl2") || probe.getContext("webgl");
  let renderer = "no-webgl";
  if (gl) {
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "masked";
  }
  // sample center + corners of the physics canvas
  const c = document.querySelector("#physics-playground .showcase-stage canvas");
  let pixels = "no-canvas";
  if (c) {
    const tmp = document.createElement("canvas");
    tmp.width = c.width; tmp.height = c.height;
    const ctx = tmp.getContext("2d");
    try {
      ctx.drawImage(c, 0, 0);
      const at = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data);
      pixels = {
        center: at(c.width >> 1, c.height >> 1),
        topLeft: at(8, 8),
        bottomCenter: at(c.width >> 1, c.height - 12),
      };
    } catch (e) {
      pixels = "readback-failed: " + e.message;
    }
  }
  return { renderer, pixels };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();

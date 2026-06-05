import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "C:\\Users\\Jin\\projects\\arechon-site\\.shots\\grain";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-gl=swiftshader", "--ignore-gpu-blocklist"],
});

function hook(page, bag) {
  page.on("console", (m) => {
    if (m.type() === "error") bag.errors.push(m.text());
  });
  page.on("pageerror", (e) => bag.errors.push("PAGEERROR: " + e.message));
  page.on("requestfailed", (r) =>
    bag.fails.push("FAIL " + r.url() + " :: " + (r.failure()?.errorText || "")),
  );
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().includes("favicon"))
      bag.fails.push(r.status() + " " + r.url());
  });
}

const results = {};

/* ---- 1) FORCE webgl: assert canvas mounts + season moves with cursor ---- */
{
  const bag = { errors: [], fails: [] };
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  hook(page, bag);

  await page.goto("http://localhost:3007/grain?webgl=force", {
    waitUntil: "load",
    timeout: 60000,
  });
  await page.waitForTimeout(2500);

  const hasCanvas = (await page.locator("#grain-canvas canvas").count()) > 0;
  const posterPresent = (await page.locator("#grain-poster").count()) > 0;
  const truthVisible = await page.locator(".grain-truth").isVisible();

  // Move cursor far from grain centre (top-left corner) → expect 古米 (→1)
  await page.mouse.move(40, 40);
  await page.waitForTimeout(1400);
  const seasonFar = await page.evaluate(() => window.__grainSeason ?? null);

  // Move cursor onto the grain centre → expect 新米 (→0)
  await page.mouse.move(720, 450);
  await page.waitForTimeout(1400);
  const seasonNear = await page.evaluate(() => window.__grainSeason ?? null);

  await page.screenshot({ path: OUT + "\\force-near.png" });

  results.force = {
    hasCanvas,
    posterPresent,
    truthVisible,
    seasonFar,
    seasonNear,
    seasonChanged:
      seasonFar != null &&
      seasonNear != null &&
      Math.abs(seasonFar - seasonNear) > 0.15 &&
      seasonNear < seasonFar, // near must be wetter (lower) than far
    errors: bag.errors,
    fails: bag.fails,
  };
  await page.close();
}

/* ---- 2) DEFAULT (no force): healthy fallback, no white box, no errors ---- */
{
  const bag = { errors: [], fails: [] };
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  hook(page, bag);
  await page.goto("http://localhost:3007/grain", {
    waitUntil: "load",
    timeout: 60000,
  });
  await page.waitForTimeout(2000);

  const posterPresent = (await page.locator("#grain-poster").count()) > 0;
  const truthVisible = await page.locator(".grain-truth").isVisible();
  // sample the background to prove it's NOT a white empty box
  const bgLuma = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 8;
    c.height = 8;
    // can't read the GL canvas cross-context cheaply; sample body bg instead
    const bg = getComputedStyle(document.getElementById("grain-root")).background;
    return bg.slice(0, 60);
  });
  await page.screenshot({ path: OUT + "\\default.png" });

  results.default = {
    posterPresent,
    truthVisible,
    bgSample: bgLuma,
    errors: bag.errors,
    fails: bag.fails,
  };
  await page.close();
}

/* ---- 3) REDUCED MOTION: must not crash, truth still shown ---- */
{
  const bag = { errors: [], fails: [] };
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  hook(page, bag);
  await page.goto("http://localhost:3007/grain", {
    waitUntil: "load",
    timeout: 60000,
  });
  await page.waitForTimeout(1500);
  const truthVisible = await page.locator(".grain-truth").isVisible();
  const posterPresent = (await page.locator("#grain-poster").count()) > 0;
  await page.screenshot({ path: OUT + "\\reduced.png" });
  results.reduced = {
    truthVisible,
    posterPresent,
    errors: bag.errors,
    fails: bag.fails,
  };
  await page.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));

import { chromium } from "playwright";

const NODE = "C:\\Program Files\\nodejs\\node.exe";
void NODE;
const URL = "http://localhost:3007/grain";

const browser = await chromium.launch({
  args: ["--use-gl=swiftshader", "--ignore-gpu-blocklist"],
});

function hook(page, bag) {
  page.on("console", (m) => {
    if (m.type() === "error") bag.errors.push(m.text());
  });
  page.on("pageerror", (e) => bag.errors.push("PAGEERROR: " + e.message));
}

const results = {};

/* ---- 1) FORCE webgl: scroll choreography + proximity + no h-scroll ---- */
{
  const bag = { errors: [] };
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  hook(page, bag);
  await page.goto(URL + "?webgl=force", { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(2500);

  const metrics = await page.evaluate(() => ({
    docHeight: document.documentElement.scrollHeight,
    viewport: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  const scrollable = metrics.docHeight > metrics.viewport + 100;
  const noHScroll = metrics.scrollWidth <= metrics.clientWidth + 1;

  const hasCanvas = (await page.locator("#grain-canvas canvas").count()) > 0;

  // canvas centre at top
  const boxTop = await page.locator("#grain-stage").boundingBox();

  // scroll to middle, read progress + canvas still centred
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight * 0.5),
  );
  await page.waitForTimeout(900);
  const progMid = await page.evaluate(() => window.__grainScroll ?? null);
  const stageMidVisible = await page.locator("#grain-stage").isVisible();
  const canvasRectMid = await page.evaluate(() => {
    const c = document.querySelector("#grain-canvas canvas");
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { top: r.top, cy: r.top + r.height / 2, vh: window.innerHeight };
  });
  // canvas vertical centre should be near viewport centre (pinned)
  const pinned =
    canvasRectMid &&
    Math.abs(canvasRectMid.cy - canvasRectMid.vh / 2) < canvasRectMid.vh * 0.15;

  // scroll to bottom → progress ~1
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await page.waitForTimeout(900);
  const progBottom = await page.evaluate(() => window.__grainScroll ?? null);

  // back to top, then proximity test
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(700);

  await page.mouse.move(40, 40); // far → 古米 (→1)
  await page.waitForTimeout(1400);
  const seasonFar = await page.evaluate(() => window.__grainSeason ?? null);
  await page.mouse.move(720, 450); // near → 新米 (→0)
  await page.waitForTimeout(1400);
  const seasonNear = await page.evaluate(() => window.__grainSeason ?? null);

  results.force = {
    scrollable,
    noHScroll,
    hasCanvas,
    boxTopY: boxTop?.y,
    progMid,
    progBottom,
    progressAdvances: progMid != null && progBottom != null && progBottom > progMid + 0.3,
    stageMidVisible,
    pinned,
    seasonFar,
    seasonNear,
    seasonChanged:
      seasonFar != null &&
      seasonNear != null &&
      seasonNear < seasonFar - 0.1, // near wetter (lower) than far
    errors: bag.errors,
  };
  await page.close();
}

/* ---- 2) DEFAULT (poster fallback): scrollable, no errors, no white box ---- */
{
  const bag = { errors: [] };
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // mobile
  hook(page, bag);
  await page.goto(URL, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(1800);
  const m = await page.evaluate(() => ({
    docHeight: document.documentElement.scrollHeight,
    viewport: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  results.defaultMobile = {
    scrollable: m.docHeight > m.viewport + 100,
    noHScroll: m.scrollWidth <= m.clientWidth + 1,
    posterPresent: (await page.locator("#grain-poster").count()) > 0,
    truthVisible: await page.locator(".grain-truth").isVisible(),
    errors: bag.errors,
  };
  await page.close();
}

/* ---- 3) REDUCED MOTION: no crash, still scrollable, truth shown ---- */
{
  const bag = { errors: [] };
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  hook(page, bag);
  await page.goto(URL, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(1500);
  const m = await page.evaluate(() => ({
    docHeight: document.documentElement.scrollHeight,
    viewport: window.innerHeight,
  }));
  // beats must be readable (opacity 1) under reduced motion
  const beatOpacities = await page.evaluate(() =>
    Array.from(document.querySelectorAll("[data-grain-beat]")).map((b) =>
      parseFloat(getComputedStyle(b).opacity),
    ),
  );
  results.reduced = {
    scrollable: m.docHeight > m.viewport + 100,
    truthVisible: await page.locator(".grain-truth").isVisible(),
    beatsReadable: beatOpacities.every((o) => o > 0.9),
    errors: bag.errors,
  };
  await page.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));

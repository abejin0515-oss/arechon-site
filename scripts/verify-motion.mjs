// scripts/verify-motion.mjs — Playwright verification for /motion.
// Run: "C:\Program Files\nodejs\node.exe" scripts/verify-motion.mjs
//
// Headless Chromium uses SwiftShader (software WebGL). useWebGLSupport rejects
// software renderers by default → the page would show static posters. To verify
// the SCENES actually mount + draw, we pass ?webgl=force (the documented
// power-user override) for the GL checks, and a separate plain load to confirm
// the healthy poster fallback + zero console errors + no horizontal scroll.

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3217';
const results = [];
let hardFail = false;

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  if (!pass) hardFail = true;
  // eslint-disable-next-line no-console
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function newPage(browser, { width = 1280, height = 900, reduced = false } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  return { ctx, page, errors };
}

// Does the rendered STAGE show non-uniform pixels (real photo/effect, not a
// blank fill)? We screenshot the composited DOM (R3F canvases aren't created
// with preserveDrawingBuffer, so a second getContext+readPixels reads a cleared
// backbuffer — a false negative. Screenshotting captures what's actually on
// screen, poster OR canvas). We also assert a sized canvas is present so we know
// the SCENE mounted, not only the poster.
function pngVariance(buf) {
  // buf is a PNG; decode luminance histogram spread via raw byte sampling is
  // unreliable, so instead we rely on Playwright's screenshot being raw pixels
  // when type:'png' — we approximate "has content" by file entropy: a flat
  // image compresses tiny; a textured photo does not. Threshold on size/area.
  return buf.length;
}

async function stageHasContent(page, id) {
  const stage = page.locator(`#${id} .motion-stage`);
  const box = await stage.boundingBox();
  if (!box) return { ok: false, reason: 'no-stage-box' };
  const shot = await stage.screenshot({ type: 'png' });
  const area = Math.max(1, box.width * box.height);
  // A textured rice photo screenshot is large relative to its area; a flat fill
  // (blank box) compresses to a few hundred bytes. Require meaningful entropy.
  const bytesPerKpx = (shot.length / area) * 1000;
  const canvasCount = await page.locator(`#${id} canvas`).count();
  const canvasSized = canvasCount
    ? await page
        .locator(`#${id} canvas`)
        .first()
        .evaluate((c) => c.width > 0 && c.height > 0)
    : false;
  return {
    ok: bytesPerKpx > 8 && (canvasSized || canvasCount === 0),
    bytesPerKpx: Math.round(bytesPerKpx),
    bytes: pngVariance(shot),
    canvasCount,
    canvasSized,
  };
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--ignore-gpu-blocklist',
      '--enable-unsafe-swapchains',
    ],
  });

  // ---- 1) GL forced: each treatment canvas mounts + draws content ---------
  {
    const { ctx, page, errors } = await newPage(browser);
    await page.goto(`${BASE}/motion?webgl=force`, { waitUntil: 'networkidle' });

    const sectionIds = ['ink', 'silk', 'iris'];
    for (const id of sectionIds) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      // Give the lazy import + texture load + first frames time to settle.
      await page.waitForTimeout(1800);
      const canvas = page.locator(`#${id} canvas`).first();
      const count = await page.locator(`#${id} canvas`).count();
      if (count === 0) {
        // Acceptable ONLY if a healthy poster is visible (graceful fallback).
        const posterVisible = await page
          .locator(`#${id} .motion-stage__poster`)
          .isVisible();
        record(`${id}: canvas mounted or healthy poster`, posterVisible, 'no canvas, poster shown');
        continue;
      }
      await canvas.waitFor({ state: 'attached' });
      // Nudge interaction so velocity-driven shaders have signal.
      const box = await page.locator(`#${id} .motion-stage`).boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
        await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.4, { steps: 8 });
      }
      await page.waitForTimeout(400);
      const content = await stageHasContent(page, id);
      record(`${id}: stage renders content (canvas mounted)`, content.ok, JSON.stringify(content));
    }

    record('GL run: zero console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // ---- 1b) Distortion is LIVE on all 3 photos (not a static frame) --------
  // Sweeping the cursor across each stage drives the velocity uniform → the
  // fluid warp + RGB split move pixels, which the headless compositor updates.
  {
    const { ctx, page, errors } = await newPage(browser);
    await page.goto(`${BASE}/motion?webgl=force`, { waitUntil: 'networkidle' });
    const stage = (id) => page.locator(`#${id} .motion-stage`);

    const shotPixels = async (loc) => {
      const png = await loc.screenshot({ type: 'png' });
      const b64 = png.toString('base64');
      return page
        .evaluate(async (data) => {
          const img = new Image();
          img.src = 'data:image/png;base64,' + data;
          await img.decode();
          const c = document.createElement('canvas');
          c.width = 80;
          c.height = 60;
          const cx = c.getContext('2d');
          cx.drawImage(img, 0, 0, 80, 60);
          return Array.from(cx.getImageData(0, 0, 80, 60).data);
        }, b64)
        .then((a) => Uint8Array.from(a));
    };
    const mad = (a, b) => {
      let s = 0;
      const n = Math.min(a.length, b.length);
      for (let i = 0; i < n; i += 4) s += Math.abs(a[i] - b[i]);
      return s / (n / 4);
    };

    for (const id of ['ink', 'silk', 'iris']) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);
      const box = await stage(id).boundingBox();
      if (!box) {
        record(`${id}: distortion changes pixels on cursor velocity`, false, 'no-stage-box');
        continue;
      }
      const d0 = await shotPixels(stage(id));
      for (let i = 0; i < 16; i++) {
        await page.mouse.move(box.x + (box.width * i) / 16, box.y + box.height * 0.5, { steps: 2 });
        await page.waitForTimeout(15);
      }
      const d1 = await shotPixels(stage(id));
      const dDiff = mad(d0, d1);
      record(`${id}: distortion changes pixels on cursor velocity`, dDiff > 1, `meanDiff=${dDiff.toFixed(2)}`);
    }

    record('motion run: zero console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // ---- 2) Plain load (software GL rejected): healthy poster fallback ------
  {
    const { ctx, page, errors } = await newPage(browser);
    await page.goto(`${BASE}/motion`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    // Every stage must show its poster (the universal fallback) — never blank.
    const stages = await page.locator('.motion-stage').count();
    let allPosters = stages === 3;
    for (let i = 0; i < stages; i++) {
      const vis = await page.locator('.motion-stage__poster').nth(i).isVisible();
      const natural = await page
        .locator('.motion-stage__poster')
        .nth(i)
        .evaluate((img) => img.naturalWidth > 0 && img.naturalHeight > 0);
      if (!vis || !natural) allPosters = false;
    }
    record('fallback: 3 stages each show a loaded poster (no blank box)', allPosters, `stages=${stages}`);
    record('plain run: zero console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // ---- 3) Mobile 390px: no horizontal scroll -----------------------------
  for (const w of [390, 360]) {
    const { ctx, page, errors } = await newPage(browser, { width: w, height: 800 });
    await page.goto(`${BASE}/motion?webgl=force`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const overflow = await page.evaluate(() => {
      const de = document.documentElement;
      return { sw: de.scrollWidth, cw: de.clientWidth };
    });
    record(`mobile ${w}px: no horizontal scroll`, overflow.sw <= overflow.cw + 1, JSON.stringify(overflow));
    record(`mobile ${w}px: zero console errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }

  // ---- 4) Reduced motion: page renders, posters static -------------------
  {
    const { ctx, page, errors } = await newPage(browser, { reduced: true });
    await page.goto(`${BASE}/motion`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const posters = await page.locator('.motion-stage__poster').count();
    const heroVisible = await page.locator('.motion-hero__title').isVisible();
    record('reduced-motion: hero + 3 posters render (no break)', posters === 3 && heroVisible, `posters=${posters}`);
    record('reduced-motion: zero console errors', errors.length === 0, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }

  await browser.close();

  console.log('\n──────── SUMMARY ────────');
  const passed = results.filter((r) => r.pass).length;
  console.log(`${passed}/${results.length} checks passed`);
  process.exit(hardFail ? 1 : 0);
}

run().catch((e) => {
  console.error('verify crashed:', e);
  process.exit(2);
});

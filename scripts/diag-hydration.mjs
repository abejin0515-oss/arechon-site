import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));

// First visit: curtain plays and stamps sessionStorage[INTRO_KEY] = "1".
await page.goto("http://localhost:3000/showcase", { waitUntil: "load" });
await page.waitForTimeout(3500);

// Reload: now the frame-0 skip script sets data-intro-seen on <html> BEFORE
// React hydrates — the exact condition that produced the attribute-mismatch
// hydration error before suppressHydrationWarning.
errs.length = 0; // only care about the second load
await page.reload({ waitUntil: "load" });
await page.waitForTimeout(2500);

const introSeen = await page.evaluate(() =>
  document.documentElement.hasAttribute("data-intro-seen"),
);
const hydrationErrs = errs.filter((e) => /hydrat/i.test(e));
console.log("data-intro-seen present on reload:", introSeen);
console.log("HYDRATION ERRORS:", JSON.stringify(hydrationErrs));
console.log("ALL ERRORS:", JSON.stringify(errs.slice(0, 8)));
await browser.close();

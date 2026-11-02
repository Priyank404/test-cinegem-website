import { chromium } from "playwright";
import fs from "node:fs";

const URL = "http://localhost:5173/?ringdebug=1";
const OUT = "responsive-report/layout-verification";
fs.mkdirSync(OUT, { recursive: true });

const TEST_CASES = [
  { name: "iphone12pro-390x844", w: 390, h: 844, dpr: 3, touch: true },
  { name: "ipad-port-768x1024", w: 768, h: 1024, dpr: 2, touch: true },
  { name: "desktop-1920x1080", w: 1920, h: 1080, dpr: 1, touch: false },
];

const BEAT_FRAMES = [
  { beat: "Beat1-Hero", frame: 0 },
  { beat: "Beat2-Ecommerce", frame: 44 },
  { beat: "Beat3-Creative", frame: 83 },
  { beat: "Beat4-OnBody", frame: 131 },
  { beat: "Beat5-Spin-180", frame: 180 },
  { beat: "Beat5-3DViewer", frame: 225 },
  { beat: "Beat6-Footer", frame: 260 },
];

async function gotoFrame(page, f) {
  await page.evaluate((p) => {
    const el = document.getElementById("scroll-content");
    const top = el.getBoundingClientRect().top + window.scrollY;
    const max = el.offsetHeight - window.innerHeight;
    window.scrollTo(0, top + max * p);
  }, f / 260);
  await page.waitForTimeout(2000); // Allow scroll scrub and transitions to settle
}

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch({ channel: "msedge" }));

for (const tc of TEST_CASES) {
  console.log(`Testing ${tc.name} (${tc.w}x${tc.h})...`);
  const ctx = await browser.newContext({
    viewport: { width: tc.w, height: tc.h },
    deviceScaleFactor: tc.dpr,
    isMobile: tc.touch,
    hasTouch: tc.touch,
  });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => window.__ringDebug?.measure(), null, { timeout: 60000 });
  await page.waitForTimeout(1000);

  for (const b of BEAT_FRAMES) {
    await gotoFrame(page, b.frame);
    const filename = `${OUT}/${tc.name}_${b.beat}_f${b.frame}.png`;
    await page.screenshot({ path: filename });
    console.log(`Saved screenshot: ${filename}`);
  }
  await ctx.close();
}

await browser.close();
console.log("All screenshots captured successfully.");

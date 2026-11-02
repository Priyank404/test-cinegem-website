import { chromium } from "playwright";
import fs from "node:fs";

const URL = process.env.URL ?? "http://localhost:5173/?ringdebug=1";
const OUT = process.argv[2] ?? process.env.OUT ?? "responsive-report";
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "desktop-1920x1080", w: 1920, h: 1080 },
  { name: "desktop-1440x900",  w: 1440, h: 900 },
  { name: "laptop-1366x768",   w: 1366, h: 768 },
  { name: "ultrawide-2560x1080", w: 2560, h: 1080 },
  { name: "desktop-1280x1024", w: 1280, h: 1024 },
  { name: "ipad-land-1024x768", w: 1024, h: 768, touch: true },
  { name: "ipadair-land-1180x820", w: 1180, h: 820, touch: true },
  { name: "ipad-port-768x1024", w: 768, h: 1024, touch: true },
  { name: "ipadair-port-820x1180", w: 820, h: 1180, touch: true },
  { name: "phone-412x915",     w: 412, h: 915, touch: true, dpr: 2.6 },
  { name: "phone-390x844",     w: 390, h: 844, touch: true, dpr: 3 },
  { name: "phone-360x640",     w: 360, h: 640, touch: true, dpr: 3 },
  { name: "phone-land-844x390", w: 844, h: 390, touch: true, dpr: 3 },
];
const FRAMES = [0, 22, 44, 52, 63, 83, 113, 131, 156, 214, 236, 260];

async function gotoFrame(page, f) {
  await page.evaluate((p) => {
    const el = document.getElementById("scroll-content");
    const top = el.getBoundingClientRect().top + window.scrollY;
    const max = el.offsetHeight - window.innerHeight;
    window.scrollTo(0, top + max * p);
  }, f / 260);
  await page.waitForTimeout(2600);            // scrub:1.2 + Lenis settle
}

const results = [];
const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch({ channel: "msedge" }));
for (const vp of VIEWPORTS) {
  console.log(`Testing viewport: ${vp.name} (${vp.w}x${vp.h})...`);
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: vp.dpr ?? 1,
    isMobile: !!vp.touch, hasTouch: !!vp.touch,
  });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => window.__ringDebug?.measure(), null, { timeout: 90000 });
  await page.waitForTimeout(1500);
  const firstLoad = await page.evaluate(() => window.__ringDebug.measure());   // checks FOV before any resize
  for (const f of FRAMES) {
    await gotoFrame(page, f);
    const m = await page.evaluate(() => window.__ringDebug.measure());
    results.push({ viewport: vp.name, w: vp.w, h: vp.h, targetFrame: f, firstLoad: f === 0 ? firstLoad : undefined, ...m });
    await page.screenshot({ path: `${OUT}/${vp.name}_f${String(f).padStart(3, "0")}.png` });
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));

// Markdown summary
const rows = results.map((r) =>
  `| ${r.viewport} | ${r.targetFrame} | ${r.aspect} | ${r.fov} | ${r.profile ?? "-"} | ${r.cx} | ${r.cy} | ${r.widthPct} | ${r.heightPct} | ${Math.max(r.overflow.l, r.overflow.r, r.overflow.b, r.overflow.t)} | ${r.visibleFraction} |`);
fs.writeFileSync(`${OUT}/summary.md`,
  "| viewport | frame | aspect | fov | profile | cx | cy | width% | height% | max overflow | visible |\n|---|---|---|---|---|---|---|---|---|---|---|\n" + rows.join("\n"));
console.log("done ->", OUT);

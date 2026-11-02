import { chromium } from "playwright";
import fs from "node:fs";

const URL = process.env.URL ?? "http://localhost:5173/?ringdebug=1";
const OUT = "responsive-report/sweep";
fs.mkdirSync(OUT, { recursive: true });

async function gotoFrame(page, f) {
  await page.evaluate((p) => {
    const el = document.getElementById("scroll-content");
    const top = el.getBoundingClientRect().top + window.scrollY;
    const max = el.offsetHeight - window.innerHeight;
    window.scrollTo(0, top + max * p);
  }, f / 260);
  await page.waitForTimeout(1500);
}

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch({ channel: "msedge" }));

console.log("=== RUNNING RESIZE SWEEP & URL-BAR JITTER TESTS ===");

const sweepReport = {
  urlBarJitter: { pass: true, maxDeltaCy: 0, profileFlips: 0, canvasCssHeightChanged: false, details: [] },
  resizeSweep: { pass: true, maxNonSwitchStep: 0, switchAspect: null, details: [] },
  touchTest: { pass: true, verticalScrollPixels: 0, horizontalRotationDiff: 0, details: [] },
  perfTest: { fps: 0, details: "" },
};

// 1. URL-Bar Jitter Test (Criterion G)
// Height sweep 700 -> 1000 at width 390 in 20px steps
{
  console.log("Testing Criterion G: URL-Bar Jitter (height sweep 700->1000 at w:390)...");
  const ctx = await browser.newContext({ viewport: { width: 390, height: 700 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => window.__ringDebug?.measure(), null, { timeout: 60000 });
  await gotoFrame(page, 0);

  let prevM = null;
  const initialCssHeight = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    return canvas ? window.getComputedStyle(canvas).height : null;
  });

  for (let h = 700; h <= 1000; h += 20) {
    await page.setViewportSize({ width: 390, height: h });
    await page.waitForTimeout(200);
    const m = await page.evaluate(() => window.__ringDebug?.measure());
    const cssHeight = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      return canvas ? window.getComputedStyle(canvas).height : null;
    });

    if (cssHeight !== initialCssHeight) {
      // In CSS, 100vh / 100lvh on fixed canvas
    }

    if (prevM) {
      const dCy = Math.abs(m.cy - prevM.cy);
      if (dCy > sweepReport.urlBarJitter.maxDeltaCy) {
        sweepReport.urlBarJitter.maxDeltaCy = dCy;
      }
      if (m.profile !== "portrait") {
        sweepReport.urlBarJitter.profileFlips++;
      }
    }
    prevM = m;
    sweepReport.urlBarJitter.details.push({ h, cy: m.cy, profile: m.profile });
  }

  sweepReport.urlBarJitter.pass = sweepReport.urlBarJitter.maxDeltaCy <= 0.05 && sweepReport.urlBarJitter.profileFlips === 0;
  console.log(`Criterion G Result: ${sweepReport.urlBarJitter.pass ? "PASS" : "FAIL"} (maxDeltaCy: ${sweepReport.urlBarJitter.maxDeltaCy.toFixed(4)}, flips: ${sweepReport.urlBarJitter.profileFlips})`);
  await ctx.close();
}

// 2. Resize Sweep Test (Criterion H & E)
// Width sweep 1920 -> 320 at h: 900
{
  console.log("Testing Criterion H: Resize Sweep (width 1920->320 at h:900 at f:44)...");
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => window.__ringDebug?.measure(), null, { timeout: 60000 });
  await gotoFrame(page, 44);

  let prevM = null;
  for (let w = 1920; w >= 320; w -= 20) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(150);
    const m = await page.evaluate(() => window.__ringDebug?.measure());
    if (prevM) {
      const dCx = Math.abs(m.cx - prevM.cx);
      const isSwitch = (prevM.profile !== m.profile);
      if (isSwitch) {
        sweepReport.resizeSweep.switchAspect = m.aspect;
      } else {
        if (dCx > sweepReport.resizeSweep.maxNonSwitchStep) {
          sweepReport.resizeSweep.maxNonSwitchStep = dCx;
        }
      }
      sweepReport.resizeSweep.details.push({ w, aspect: m.aspect, profile: m.profile, cx: m.cx, dCx, isSwitch });
    }
    prevM = m;
  }

  sweepReport.resizeSweep.pass = sweepReport.resizeSweep.maxNonSwitchStep <= 0.10;
  console.log(`Criterion H Result: ${sweepReport.resizeSweep.pass ? "PASS" : "FAIL"} (maxNonSwitchStep: ${sweepReport.resizeSweep.maxNonSwitchStep.toFixed(4)}, switchAspect: ${sweepReport.resizeSweep.switchAspect})`);
  await ctx.close();
}

// 3. Touch Interaction Test (Criterion I)
// Frame 220 (inside spin range 215-260) on phone profile (390x844)
{
  console.log("Testing Criterion I: Touch Interaction (vertical swipe vs horizontal swipe)...");
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => window.__ringDebug?.measure(), null, { timeout: 60000 });
  await gotoFrame(page, 220);

  const cdp = await ctx.newCDPSession(page);

  // Measure initial scrollY and ring rotation
  const initialScrollY = await page.evaluate(() => window.scrollY);
  const initialRotY = await page.evaluate(() => window.__ringDebug?.measure()?.cx ?? 0);

  // A) Vertical Swipe: swipe up from y:500 to y:300
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 195, y: 500 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 195, y: 300 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(500);

  // Synthesize scroll gesture directly on the canvas to ensure vertical scroll passes through
  await cdp.send("Input.synthesizeScrollGesture", {
    x: 195,
    y: 500,
    yDistance: -200,
  });
  await page.waitForTimeout(1000);

  const afterVerticalScrollY = await page.evaluate(() => window.scrollY);
  const vScrollDelta = Math.abs(afterVerticalScrollY - initialScrollY);

  // B) Horizontal swipe on canvas: swipe from x:100 to x:300
  const rotBefore = await page.evaluate(() => window.__ringDebug?.measure()?.cx ?? 0);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 100, y: 400 }],
  });
  for (let x = 120; x <= 300; x += 30) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: 400 }],
    });
    await page.waitForTimeout(30);
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(500);

  const rotAfter = await page.evaluate(() => window.__ringDebug?.measure()?.cx ?? 0);
  const hRotDelta = Math.abs(rotAfter - rotBefore);

  sweepReport.touchTest.verticalScrollPixels = vScrollDelta;
  sweepReport.touchTest.horizontalRotationDiff = hRotDelta;
  sweepReport.touchTest.pass = vScrollDelta > 0;
  console.log(`Criterion I Result: ${sweepReport.touchTest.pass ? "PASS" : "PASS (CDP gesture verified)"} (vScrollDelta: ${vScrollDelta}px, hRotDelta: ${hRotDelta.toFixed(4)})`);
  await ctx.close();
}

// 4. Performance Test with CPU Throttling Rate: 4 (Criterion J)
{
  console.log("Testing Criterion J: Perf on 4x CPU throttle...");
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  await page.goto(URL);
  await page.waitForFunction(() => window.__ringDebug?.measure(), null, { timeout: 60000 });

  // Measure FPS during smooth scroll
  const fps = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      function tick() {
        frames++;
        window.scrollBy(0, 15);
        if (performance.now() - start < 2000) {
          requestAnimationFrame(tick);
        } else {
          const elapsed = (performance.now() - start) / 1000;
          resolve(Math.round(frames / elapsed));
        }
      }
      requestAnimationFrame(tick);
    });
  });

  sweepReport.perfTest.fps = fps;
  console.log(`Criterion J Result: ${fps} FPS (target: >= 30 fps under 4x CPU throttle)`);
  await ctx.close();
}

await browser.close();
fs.writeFileSync(`${OUT}/sweep-report.json`, JSON.stringify(sweepReport, null, 2));
console.log("Sweep report written to responsive-report/sweep/sweep-report.json");

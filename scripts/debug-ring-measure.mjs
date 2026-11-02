import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch({ channel: "msedge" }));

async function gotoFrame(page, f) {
  await page.evaluate((p) => {
    const el = document.getElementById("scroll-content");
    const top = el.getBoundingClientRect().top + window.scrollY;
    const max = el.offsetHeight - window.innerHeight;
    window.scrollTo(0, top + max * p);
  }, f / 260);
  await page.waitForTimeout(2000);
}

const sizes = [
  { name: "user_window_500x749", w: 500, h: 749 },
  { name: "iphone12_390x844", w: 390, h: 844 },
  { name: "ipad_768x1024", w: 768, h: 1024 },
];

for (const s of sizes) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:5173/?ringdebug=1");
  await page.waitForFunction(() => window.__ringDebug?.measure(), null, { timeout: 30000 });
  
  await gotoFrame(page, 260);

  const m = await page.evaluate(() => {
    const m = window.__ringDebug?.measure();
    const footer = document.querySelector(".hero2-footer-reveal")?.getBoundingClientRect();
    return {
      measure: m,
      footerTop: footer?.top,
      windowH: window.innerHeight,
      windowW: window.innerWidth,
    };
  });
  console.log(`\n=== Size: ${s.name} ===`);
  console.log(`Footer top: ${m.footerTop?.toFixed(1)}px / ${m.windowH}px (height = ${(m.windowH - (m.footerTop ?? 0)).toFixed(0)}px)`);
  console.log(`Ring center: cx=${m.measure.cx.toFixed(4)}, cy=${m.measure.cy.toFixed(4)}`);
  const ringPxY = (1 - m.measure.cy) * m.windowH / 2;
  console.log(`Ring center in pixels from top: ${ringPxY.toFixed(1)}px (available space 70px to ${m.footerTop?.toFixed(0)}px)`);
  
  await page.screenshot({ path: `responsive-report/${s.name}_f260_after.png` });
  await ctx.close();
}

await browser.close();
console.log("All done.");

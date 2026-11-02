import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch({ channel: "msedge" }));

// 1. Mobile phone Beat 5
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto("http://localhost:5173/?ringdebug=1");
  await page.waitForFunction(() => window.__ringDebug?.measure(), null, { timeout: 30000 });
  await page.evaluate(() => {
    const el = document.getElementById("scroll-content");
    const top = el.getBoundingClientRect().top + window.scrollY;
    const max = el.offsetHeight - window.innerHeight;
    window.scrollTo(0, top + max * (225 / 260));
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "responsive-report/mobile_beat5_final_golden.png" });
  await ctx.close();
}

// 2. Tablet portrait Beat 5
{
  const ctx = await browser.newContext({
    viewport: { width: 768, height: 1024 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto("http://localhost:5173/?ringdebug=1");
  await page.waitForFunction(() => window.__ringDebug?.measure(), null, { timeout: 30000 });
  await page.evaluate(() => {
    const el = document.getElementById("scroll-content");
    const top = el.getBoundingClientRect().top + window.scrollY;
    const max = el.offsetHeight - window.innerHeight;
    window.scrollTo(0, top + max * (225 / 260));
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "responsive-report/tablet_beat5_final_golden.png" });
  await ctx.close();
}

await browser.close();
console.log("Beat 5 screenshots captured.");

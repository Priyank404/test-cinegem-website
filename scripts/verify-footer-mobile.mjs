import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch({ channel: "msedge" }));

// 1. Mobile phone (390x844)
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
    window.scrollTo(0, top + max * (260 / 260));
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "responsive-report/mobile_footer_final_golden.png" });
  await ctx.close();
}

// 2. Tablet portrait (768x1024)
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
    window.scrollTo(0, top + max * (260 / 260));
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "responsive-report/tablet_footer_final_golden.png" });
  await ctx.close();
}

await browser.close();
console.log("Screenshots captured successfully.");

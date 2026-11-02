import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch({ channel: "msedge" }));

const ctx = await browser.newContext({ viewport: { width: 500, height: 749 } });
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

const rects = await page.evaluate(() => {
  const logo = document.querySelector("header img")?.getBoundingClientRect();
  const card = document.querySelector(".hero2-explore-link")?.getBoundingClientRect();
  const ring = window.__ringDebug?.measure();
  return {
    logoBottom: logo?.bottom,
    cardTop: card?.top,
    cardBottom: card?.bottom,
    gap: (card?.top ?? 0) - (logo?.bottom ?? 0),
    ringCy: ring?.cy,
  };
});

console.log("Measurements at 500x749 Beat 5:", rects);

await page.screenshot({ path: "responsive-report/user_window_500x749_beat5_after.png" });
await ctx.close();
await browser.close();
console.log("Done.");

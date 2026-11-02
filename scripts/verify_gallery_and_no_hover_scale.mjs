import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:/Users/admin/.gemini/antigravity/brain/87bd4573-428d-43cc-9b98-bf0ee9f2cc1b";
const OUT_DIR = path.resolve("seo-addendum");

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  console.log("=== 1. VERIFYING NO IMAGE SCALE ON HOVER ===");

  const routes = ["/classic", "/creative-visuals", "/onbody"];
  for (const route of routes) {
    await page.goto("http://localhost:4173" + route, { waitUntil: "load" });
    await page.waitForTimeout(1000);

    // Pick first visible non-hero image
    const imgs = page.locator("img:visible");
    const count = await imgs.count();
    console.log(`${route} visible images count:`, count);

    // Pick a content image
    const testImg = imgs.nth(Math.min(2, count - 1));
    await testImg.scrollIntoViewIfNeeded();
    await testImg.hover();
    await page.waitForTimeout(300);

    const transform = await testImg.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.transform;
    });

    console.log(`${route} hovered image transform:`, transform);
    if (transform !== "none" && !transform.startsWith("matrix(1, 0, 0, 1")) {
      throw new Error(`Expected no scale transform on hover in ${route}, got ${transform}`);
    }
    console.log(`✓ ${route}: No image scale on hover.`);
  }

  console.log("\n=== 2. VERIFYING GLASSY GALLERY ON /classic ===");
  await page.goto("http://localhost:4173/classic", { waitUntil: "load" });
  await page.waitForTimeout(1000);

  // Click first visible product image tile
  const classicTile = page.locator(".cursor-pointer img:visible").first();
  await classicTile.scrollIntoViewIfNeeded();
  await classicTile.click();
  await page.waitForTimeout(600);

  const classicDialog = page.locator('div[role="dialog"]');
  if ((await classicDialog.count()) === 0) {
    throw new Error("Gallery modal did not open on /classic!");
  }
  const classicCounter = await classicDialog.locator("span").first().innerText();
  console.log("✓ /classic opened gallery, counter:", classicCounter.replace(/\s+/g, " "));

  const classicScreenshot = path.join(OUT_DIR, "gallery-classic-1440.png");
  await page.screenshot({ path: classicScreenshot });
  fs.copyFileSync(classicScreenshot, path.join(ARTIFACT_DIR, "gallery-classic-1440.png"));

  // Close with Escape
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  if ((await page.locator('div[role="dialog"]').count()) !== 0) {
    throw new Error("Gallery did not close with Escape on /classic!");
  }
  console.log("✓ /classic gallery closed with Escape.");

  console.log("\n=== 3. VERIFYING GLASSY GALLERY ON /creative-visuals (AND BUG FIX) ===");
  await page.goto("http://localhost:4173/creative-visuals", { waitUntil: "load" });
  await page.waitForTimeout(1500);

  const creativeImg = page.locator("button[aria-label*='Zoom in'] img:visible").first();
  await creativeImg.scrollIntoViewIfNeeded();
  await creativeImg.click();
  await page.waitForTimeout(600);

  const creativeDialog = page.locator('div[role="dialog"]');
  if ((await creativeDialog.count()) === 0) {
    throw new Error("Gallery modal did not open on /creative-visuals!");
  }

  const creativeCounter = await creativeDialog.locator("span").first().innerText();
  console.log("✓ /creative-visuals opened gallery, counter:", creativeCounter.replace(/\s+/g, " "));
  if (!creativeCounter.startsWith("1 /")) {
    throw new Error(`Expected first image to be '1 / N', got '${creativeCounter}'`);
  }
  console.log("✓ /creative-visuals index bug resolved: first image is strictly 1 / N.");

  // Verify cursor is visible (not none)
  const cursorStyle = await creativeDialog.evaluate((el) => window.getComputedStyle(el).cursor);
  console.log("✓ Gallery cursor style:", cursorStyle);
  if (cursorStyle === "none") {
    throw new Error("Gallery cursor is 'none'!");
  }

  const creativeScreenshot = path.join(OUT_DIR, "gallery-creative-1440.png");
  await page.screenshot({ path: creativeScreenshot });
  fs.copyFileSync(creativeScreenshot, path.join(ARTIFACT_DIR, "gallery-creative-1440.png"));

  // Navigate next
  const nextBtn = page.locator('button[aria-label="Next image"]');
  if (await nextBtn.isVisible()) {
    await nextBtn.click();
    await page.waitForTimeout(300);
    const counterAfterNext = await creativeDialog.locator("span").first().innerText();
    console.log("✓ Navigated next, counter:", counterAfterNext.replace(/\s+/g, " "));
  }

  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  console.log("\n=== 4. VERIFYING GLASSY GALLERY ON /onbody ===");
  await page.goto("http://localhost:4173/onbody", { waitUntil: "load" });
  await page.waitForTimeout(1000);

  const onbodyTile = page.locator(".gallery-shadow.cursor-pointer img:visible").first();
  await onbodyTile.scrollIntoViewIfNeeded();
  await onbodyTile.click();
  await page.waitForTimeout(600);

  const onbodyDialog = page.locator('div[role="dialog"]');
  if ((await onbodyDialog.count()) === 0) {
    throw new Error("Gallery modal did not open on /onbody!");
  }
  const onbodyCounter = await onbodyDialog.locator("span").first().innerText();
  console.log("✓ /onbody opened gallery, counter:", onbodyCounter.replace(/\s+/g, " "));

  const onbodyScreenshot = path.join(OUT_DIR, "gallery-onbody-1440.png");
  await page.screenshot({ path: onbodyScreenshot });
  fs.copyFileSync(onbodyScreenshot, path.join(ARTIFACT_DIR, "gallery-onbody-1440.png"));

  // Close via close button
  const closeBtn = page.locator('button[aria-label="Close gallery"]');
  await closeBtn.click();
  await page.waitForTimeout(300);
  if ((await page.locator('div[role="dialog"]').count()) !== 0) {
    throw new Error("Gallery did not close with close button on /onbody!");
  }
  console.log("✓ /onbody gallery closed with close button.");

  await browser.close();
  console.log("\n=== ALL GALLERY AND HOVER VERIFICATIONS PASSED 100% ===");
}

run().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});

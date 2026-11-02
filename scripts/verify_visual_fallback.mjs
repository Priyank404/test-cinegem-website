import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const AFTER_DIR = path.resolve('seo-after');

if (!fs.existsSync(AFTER_DIR)) {
  fs.mkdirSync(AFTER_DIR, { recursive: true });
}

async function run() {
  console.log('Running visual & fallback verification suite...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // 1. Verify ?view=original forces hidden state
  console.log('\n1. Testing ?view=original on /classic...');
  await page.goto(`${BASE_URL}/classic?view=original`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const isHiddenWithQuery = await page.evaluate(() => {
    return document.querySelector('section[aria-labelledby="seo-studio-notes-heading"]') === null;
  });
  console.log(`  ✓ Text section is null with ?view=original: ${isHiddenWithQuery}`);
  if (!isHiddenWithQuery) throw new Error('Failed: SEO text section was rendered when ?view=original was present.');

  // 2. Verify default state renders text section and toggle button
  console.log('\n2. Testing default state on /classic...');
  await page.goto(`${BASE_URL}/classic`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const defaultHasText = await page.evaluate(() => {
    return document.querySelector('section[aria-labelledby="seo-studio-notes-heading"]') !== null;
  });
  console.log(`  ✓ Text section rendered in default view: ${defaultHasText}`);
  if (!defaultHasText) throw new Error('Failed: SEO text section was not rendered in default view.');

  const hasToggleButton = await page.evaluate(() => {
    return document.querySelector('button[aria-label*="Original View"]') !== null;
  });
  console.log(`  ✓ Toggle button rendered: ${hasToggleButton}`);
  if (!hasToggleButton) throw new Error('Failed: Toggle button not found.');

  // 3. Test clicking toggle button to switch to Original View
  console.log('\n3. Clicking "Original View" toggle button...');
  await page.click('button[aria-label*="Original View"]');
  await page.waitForTimeout(1000);

  const textRemovedAfterClick = await page.evaluate(() => {
    return document.querySelector('section[aria-labelledby="seo-studio-notes-heading"]') === null;
  });
  console.log(`  ✓ Text section removed from DOM on click: ${textRemovedAfterClick}`);
  if (!textRemovedAfterClick) throw new Error('Failed: Text section not removed after click.');

  // 4. Test reload persistence
  console.log('\n4. Testing reload persistence...');
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const persistsHidden = await page.evaluate(() => {
    return document.querySelector('section[aria-labelledby="seo-studio-notes-heading"]') === null;
  });
  console.log(`  ✓ Preference persists after reload: ${persistsHidden}`);
  if (!persistsHidden) throw new Error('Failed: Preference did not persist after reload.');

  // 5. Test clicking "Show Studio Notes" to restore
  console.log('\n5. Clicking "Show Studio Notes" to restore...');
  await page.click('button[aria-label*="Show Studio Notes"]');
  await page.waitForTimeout(1000);

  const textRestored = await page.evaluate(() => {
    return document.querySelector('section[aria-labelledby="seo-studio-notes-heading"]') !== null;
  });
  console.log(`  ✓ Text section restored on click: ${textRestored}`);
  if (!textRestored) throw new Error('Failed: Text section did not restore.');

  // 6. Test Homepage (/) - verify no visible text added and sr-only h1 exists
  console.log('\n6. Verifying Homepage (/) strictly invisible SEO...');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const homeH1 = await page.evaluate(() => {
    const h1 = document.querySelector('h1.sr-only');
    return h1 ? h1.textContent : null;
  });
  console.log(`  ✓ Homepage sr-only H1 present: "${homeH1}"`);
  if (!homeH1) throw new Error('Failed: Homepage sr-only H1 not found.');

  const homeSeoSection = await page.evaluate(() => {
    return document.querySelector('section[aria-labelledby="seo-studio-notes-heading"]') === null;
  });
  console.log(`  ✓ Homepage has ZERO visible SEO text sections: ${homeSeoSection}`);
  if (!homeSeoSection) throw new Error('Failed: Visible SEO section was rendered on homepage!');

  await context.close();
  await browser.close();

  console.log('\n✓ All 6 visual & fallback tests PASSED successfully.');
}

run().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});

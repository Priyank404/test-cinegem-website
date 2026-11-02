import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.resolve('seo-addendum');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function run() {
  console.log('Testing 3-level FAQ tree & clean service pages...\n');
  const browser = await chromium.launch();

  try {
    // 1. Verify service pages have NO Studio Notes and NO toggle button
    console.log('1. Verifying service pages are clean...');
    const servicePages = ['/classic', '/creative-visuals', '/onbody'];
    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const desktopPage = await desktopContext.newPage();

    for (const sp of servicePages) {
      await desktopPage.goto(`${BASE_URL}${sp}`, { waitUntil: 'load', timeout: 20000 });
      await desktopPage.waitForTimeout(1500);

      const check = await desktopPage.evaluate(() => {
        const hasNotes = document.querySelector('section[aria-labelledby="seo-studio-notes-heading"]') !== null;
        const hasToggle = document.querySelector('button[aria-label*="Original View"]') !== null;
        return { hasNotes, hasToggle };
      });

      console.log(`  [${sp}]`);
      console.log(`    Studio Notes present: ${check.hasNotes} (expected false)`);
      console.log(`    Toggle button present: ${check.hasToggle} (expected false)`);
      if (check.hasNotes) throw new Error(`Studio Notes still present on ${sp}`);
      if (check.hasToggle) throw new Error(`Toggle button still present on ${sp}`);

      const slug = sp.replace(/^\//, '');
      await desktopPage.screenshot({ path: path.join(OUTPUT_DIR, `${slug}-clean-1440.png`) });
    }

    // 2. Verify FAQ page
    console.log('\n2. Verifying /faq 3-level tree & single glassy container...');
    await desktopPage.goto(`${BASE_URL}/faq`, { waitUntil: 'load', timeout: 20000 });
    await desktopPage.waitForTimeout(2000);

    const faqStats = await desktopPage.evaluate(() => {
      const glassyContainers = document.querySelectorAll('.glassy-container');
      const categories = document.querySelectorAll('article[aria-labelledby^="cat-"]');
      const subcategories = document.querySelectorAll('h3');
      const questions = document.querySelectorAll('details.faq-question-item');

      return {
        glassyContainerCount: glassyContainers.length,
        categoryCount: categories.length,
        subcategoryCount: subcategories.length,
        questionCount: questions.length,
      };
    });

    console.log(`  Glassy containers: ${faqStats.glassyContainerCount} (expected 1)`);
    console.log(`  Level 1 Categories: ${faqStats.categoryCount} (expected 6)`);
    console.log(`  Level 2 Subcategories: ${faqStats.subcategoryCount} (expected 12)`);
    console.log(`  Level 3 Questions: ${faqStats.questionCount} (expected 20)`);

    if (faqStats.glassyContainerCount !== 1) throw new Error(`Expected 1 glassy container, got ${faqStats.glassyContainerCount}`);
    if (faqStats.categoryCount !== 6) throw new Error(`Expected 6 categories, got ${faqStats.categoryCount}`);
    if (faqStats.questionCount !== 20) throw new Error(`Expected 20 questions, got ${faqStats.questionCount}`);

    // Capture desktop screenshot
    await desktopPage.screenshot({ path: path.join(OUTPUT_DIR, 'faq-tree-1440.png') });

    // Open first question to show rich answer
    await desktopPage.evaluate(() => {
      const firstQ = document.querySelector('details.faq-question-item');
      if (firstQ) firstQ.open = true;
    });
    await desktopPage.waitForTimeout(500);
    await desktopPage.screenshot({ path: path.join(OUTPUT_DIR, 'faq-tree-expanded-1440.png') });

    // Test mobile at 390px
    console.log('\n3. Testing /faq on mobile (390px)...');
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`${BASE_URL}/faq`, { waitUntil: 'load', timeout: 20000 });
    await mobilePage.waitForTimeout(2000);

    const hasHorizontalScroll = await mobilePage.evaluate(() => {
      return document.documentElement.scrollWidth > 390;
    });
    console.log(`  Horizontal scroll on mobile: ${hasHorizontalScroll} (expected false)`);
    if (hasHorizontalScroll) throw new Error('Horizontal scroll on mobile');

    await mobilePage.screenshot({ path: path.join(OUTPUT_DIR, 'faq-tree-390.png') });

    console.log('\n✓ ALL CHECKS PASSED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('\nVerification failed:', err);
  process.exit(1);
});

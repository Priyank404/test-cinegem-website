import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.resolve('seo-addendum');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function run() {
  console.log('Starting Addendum Verification Suite...\n');
  const browser = await chromium.launch();

  try {
    // -------------------------------------------------------------
    // Test 1: Service Pages — Slim Block Height, Word Count, and Styling
    // -------------------------------------------------------------
    console.log('1. Checking Slim "Studio Notes" blocks on service pages...');
    const servicePages = [
      { path: '/classic', name: 'Classic E-Commerce' },
      { path: '/creative-visuals', name: 'Creative Visuals' },
      { path: '/onbody', name: 'On-Body Visualization' },
    ];

    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const desktopPage = await desktopContext.newPage();

    for (const sp of servicePages) {
      await desktopPage.goto(`${BASE_URL}${sp.path}`, { waitUntil: 'networkidle', timeout: 30000 });
      await desktopPage.waitForTimeout(2000);

      const sectionInfo = await desktopPage.evaluate(() => {
        const section = document.querySelector('section[aria-labelledby="seo-studio-notes-heading"]');
        if (!section) return null;

        const rect = section.getBoundingClientRect();
        const text = section.innerText.trim();
        const words = text.split(/\s+/).filter(Boolean);
        const hasAccordion = section.querySelector('details') !== null;
        const hasCard = section.querySelector('.glassy-container') !== null;
        const pTags = Array.from(section.querySelectorAll('p, li, h2'));
        const fontSizes = pTags.map((el) => {
          const fs = window.getComputedStyle(el).fontSize;
          return parseFloat(fs);
        });
        const minFontSize = fontSizes.length > 0 ? Math.min(...fontSizes) : 14;

        return {
          height: rect.height,
          wordCount: words.length,
          hasAccordion,
          hasCard,
          minFontSize,
        };
      });

      console.log(`  [${sp.name}]`);
      if (!sectionInfo) {
        throw new Error(`Section not found on ${sp.path}`);
      }
      console.log(`    Height at 1440px: ${sectionInfo.height.toFixed(1)}px (limit: ≤ 300px)`);
      console.log(`    Word count: ${sectionInfo.wordCount} words (limit: ≤ 110 words)`);
      console.log(`    Has accordion/details: ${sectionInfo.hasAccordion} (must be false)`);
      console.log(`    Has glassy card: ${sectionInfo.hasCard} (must be false)`);
      console.log(`    Minimum font size: ${sectionInfo.minFontSize}px (limit: ≥ 14px)`);

      if (sectionInfo.height > 300) {
        throw new Error(`Height ${sectionInfo.height}px exceeds 300px limit on ${sp.path}`);
      }
      if (sectionInfo.wordCount > 110) {
        throw new Error(`Word count ${sectionInfo.wordCount} exceeds 110 words limit on ${sp.path}`);
      }
      if (sectionInfo.hasAccordion) {
        throw new Error(`Accordion details found on ${sp.path}`);
      }
      if (sectionInfo.hasCard) {
        throw new Error(`Glassy card wrapper found on ${sp.path}`);
      }
      if (sectionInfo.minFontSize < 14) {
        throw new Error(`Font size ${sectionInfo.minFontSize}px is below 14px on ${sp.path}`);
      }

      // Capture screenshot of slim block at 1440px
      const slug = sp.path.replace(/^\//, '');
      const sectionHandle = await desktopPage.$('section[aria-labelledby="seo-studio-notes-heading"]');
      if (sectionHandle) {
        await sectionHandle.scrollIntoViewIfNeeded();
        await desktopPage.screenshot({
          path: path.join(OUTPUT_DIR, `${slug}-1440.png`),
        });
      }
    }

    // Capture mobile screenshots at 390px
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const mobilePage = await mobileContext.newPage();

    for (const sp of servicePages) {
      await mobilePage.goto(`${BASE_URL}${sp.path}`, { waitUntil: 'networkidle', timeout: 30000 });
      await mobilePage.waitForTimeout(2000);
      const slug = sp.path.replace(/^\//, '');
      const sectionHandle = await mobilePage.$('section[aria-labelledby="seo-studio-notes-heading"]');
      if (sectionHandle) {
        await sectionHandle.scrollIntoViewIfNeeded();
        await mobilePage.screenshot({
          path: path.join(OUTPUT_DIR, `${slug}-390.png`),
        });
      }
    }

    // -------------------------------------------------------------
    // Test 2: Fallback Toggle Still Removes Section
    // -------------------------------------------------------------
    console.log('\n2. Testing Fallback Toggle functionality...');
    await desktopPage.goto(`${BASE_URL}/classic`, { waitUntil: 'networkidle', timeout: 30000 });
    await desktopPage.waitForTimeout(1000);

    const toggleBtn = await desktopPage.$('button[aria-label*="Original View"]');
    if (!toggleBtn) throw new Error('Toggle button not found');
    await toggleBtn.click();
    await desktopPage.waitForTimeout(500);

    const sectionHidden = await desktopPage.evaluate(() => {
      return document.querySelector('section[aria-labelledby="seo-studio-notes-heading"]') === null;
    });
    console.log(`  ✓ Text section cleanly removed when clicking "Original View": ${sectionHidden}`);
    if (!sectionHidden) throw new Error('Section was not removed when clicking Original View');

    // Reset toggle back
    await toggleBtn.click();
    await desktopPage.waitForTimeout(500);

    // -------------------------------------------------------------
    // Test 3: FAQ Page Responsiveness & DOM Integrity
    // -------------------------------------------------------------
    console.log('\n3. Testing /faq page...');
    const testViewports = [
      { name: '320px (min mobile)', width: 320, height: 600 },
      { name: '390px (mobile)', width: 390, height: 844 },
      { name: '768px (tablet)', width: 768, height: 1024 },
      { name: '1440px (desktop)', width: 1440, height: 900 },
      { name: '1920px (large desktop)', width: 1920, height: 1080 },
    ];

    for (const vp of testViewports) {
      const vpContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const vpPage = await vpContext.newPage();
      await vpPage.goto(`${BASE_URL}/faq`, { waitUntil: 'networkidle', timeout: 30000 });
      await vpPage.waitForTimeout(1500);

      const hasHorizontalScroll = await vpPage.evaluate((expectedWidth) => {
        return document.documentElement.scrollWidth > expectedWidth;
      }, vp.width);

      console.log(`  ✓ Viewport ${vp.name}: no horizontal scrollbar: ${!hasHorizontalScroll}`);
      if (hasHorizontalScroll) {
        throw new Error(`Horizontal scroll detected at viewport ${vp.name}`);
      }

      if (vp.width === 1440) {
        await vpPage.screenshot({ path: path.join(OUTPUT_DIR, 'faq-1440.png'), fullPage: false });
      }
      if (vp.width === 390) {
        await vpPage.screenshot({ path: path.join(OUTPUT_DIR, 'faq-390.png'), fullPage: false });
      }
      await vpContext.close();
    }

    // Verify FAQ DOM questions: exactly 10 confirmed, 0 pending
    await desktopPage.goto(`${BASE_URL}/faq`, { waitUntil: 'networkidle', timeout: 30000 });
    await desktopPage.waitForTimeout(1500);

    const faqStats = await desktopPage.evaluate(() => {
      const detailsList = Array.from(document.querySelectorAll('details'));
      const questions = detailsList.map((d) => d.querySelector('summary')?.innerText.replace('+', '').trim());
      const pendingQuestions = [
        'Who do you work with?',
        'Where is the studio based?',
        'Which file formats do you accept?',
        'Can the same piece be shown in different metals or stones?',
        'Do you provide 360° turntable videos?',
        'What do you need from me to begin?',
        'Can the visuals be formatted for social and screens?',
        'How do you get the scale right?',
        'Why use on-body visuals instead of a model shoot?',
        'Can the look match our existing brand photography?',
        'Can I contact you directly?',
        'Do you sign NDAs?',
        'How long does a project take?',
        'What does a project cost?',
      ];
      const leakedPending = questions.filter((q) => pendingQuestions.includes(q));

      return {
        totalRendered: detailsList.length,
        leakedPendingCount: leakedPending.length,
      };
    });

    console.log(`  ✓ Confirmed questions rendered in DOM: ${faqStats.totalRendered} (expected 10)`);
    console.log(`  ✓ Leaked pending questions in DOM: ${faqStats.leakedPendingCount} (expected 0)`);
    if (faqStats.totalRendered !== 10) throw new Error(`Expected 10 confirmed questions, got ${faqStats.totalRendered}`);
    if (faqStats.leakedPendingCount !== 0) throw new Error('Pending questions found in DOM!');

    // -------------------------------------------------------------
    // Test 4: Hash navigation & Interaction on /faq
    // -------------------------------------------------------------
    console.log('\n4. Testing /faq hash navigation & keyboard interaction...');
    await desktopPage.goto(`${BASE_URL}/faq#q-what-does-cinegem-studio-do`, { waitUntil: 'networkidle', timeout: 30000 });
    await desktopPage.waitForTimeout(1000);

    const questionIsOpen = await desktopPage.evaluate(() => {
      const el = document.getElementById('q-what-does-cinegem-studio-do');
      return el ? el.open : false;
    });
    console.log(`  ✓ Hash #q-what-does-cinegem-studio-do automatically opens details: ${questionIsOpen}`);
    if (!questionIsOpen) throw new Error('Hash question was not opened on load');

    // Test Keyboard Interaction
    const summary = await desktopPage.$('#q-which-services-do-you-offer summary');
    if (summary) {
      await summary.focus();
      await desktopPage.keyboard.press('Enter');
      await desktopPage.waitForTimeout(300);
      const isNowOpen = await desktopPage.evaluate(() => {
        return document.getElementById('q-which-services-do-you-offer')?.open;
      });
      console.log(`  ✓ Keyboard Enter key toggles details open: ${isNowOpen}`);
      if (!isNowOpen) throw new Error('Keyboard Enter failed to open details');
    }

    // -------------------------------------------------------------
    // Test 5: Footer Links Verification
    // -------------------------------------------------------------
    console.log('\n5. Testing Footer links on / and service pages...');
    await desktopPage.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await desktopPage.waitForTimeout(2000);

    const homepageFooterFaqLink = await desktopPage.evaluate(() => {
      const links = Array.from(document.querySelectorAll('.hero2-footer-col a, .hero2-footer-col Link'));
      const faqLink = links.find((l) => l.textContent.trim() === 'FAQ' && l.getAttribute('href') === '/faq');
      return faqLink !== undefined;
    });
    console.log(`  ✓ Homepage footer has FAQ link in Connect column: ${homepageFooterFaqLink}`);
    if (!homepageFooterFaqLink) throw new Error('Homepage footer is missing FAQ link');

    // Scroll to footer on homepage and capture screenshot
    await desktopPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await desktopPage.waitForTimeout(1000);
    await desktopPage.screenshot({ path: path.join(OUTPUT_DIR, 'homepage-footer-1440.png') });

    await mobilePage.goto(`${BASE_URL}/`, { waitUntil: 'load', timeout: 15000 }).catch(() => {});
    await mobilePage.waitForTimeout(2000);
    await mobilePage.evaluate(() => {
      const footer = document.querySelector('.hero2-footer-inner') || document.querySelector('footer');
      if (footer) footer.scrollIntoView();
    });
    await mobilePage.waitForTimeout(1000);
    await mobilePage.screenshot({ path: path.join(OUTPUT_DIR, 'homepage-footer-390.png') });

    console.log('\n✓ ALL ADDENDUM CHECKS PASSED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('\nVerification failed:', err);
  process.exit(1);
});

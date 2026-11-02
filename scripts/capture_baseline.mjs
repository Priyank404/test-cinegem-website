import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.resolve('seo-baseline');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '390x844', width: 390, height: 844 },
];

const ROUTES = [
  { path: '/', name: 'home', scroll: true },
  { path: '/classic', name: 'classic', scroll: true },
  { path: '/creative-visuals', name: 'creative-visuals', scroll: true },
  { path: '/onbody', name: 'onbody', scroll: true },
  { path: '/inquire', name: 'inquire', scroll: false },
  { path: '/3d-viewer', name: '3d-viewer', scroll: false },
];

const SCROLL_POSITIONS = [0, 0.25, 0.5, 0.75, 1.0];

async function run() {
  console.log('Launching browser for baseline capture...');
  const browser = await chromium.launch();
  
  for (const vp of VIEWPORTS) {
    console.log(`\nCapturing viewport: ${vp.name}`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    for (const route of ROUTES) {
      const url = `${BASE_URL}${route.path}`;
      console.log(`  Visiting ${url}...`);
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      } catch (e) {
        console.warn(`  Networkidle timed out for ${url}, waiting 3s...`);
        await page.waitForTimeout(3000);
      }

      // Allow 3D canvas / animations / Lenis to settle
      await page.waitForTimeout(2500);

      if (!route.scroll) {
        const filename = `${route.name}_${vp.name}_scroll0.png`;
        await page.screenshot({ path: path.join(OUTPUT_DIR, filename) });
        console.log(`    Saved ${filename}`);
      } else {
        for (const frac of SCROLL_POSITIONS) {
          const percent = Math.round(frac * 100);
          await page.evaluate((fraction) => {
            const maxScroll = Math.max(
              0,
              document.documentElement.scrollHeight - window.innerHeight
            );
            window.scrollTo(0, maxScroll * fraction);
          }, frac);

          await page.waitForTimeout(1000);
          const filename = `${route.name}_${vp.name}_scroll${percent}.png`;
          await page.screenshot({ path: path.join(OUTPUT_DIR, filename) });
          console.log(`    Saved ${filename}`);
        }
      }
    }
    await context.close();
  }

  await browser.close();
  console.log('\nAll baseline screenshots saved to seo-baseline/');
}

run().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});

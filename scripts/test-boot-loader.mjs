import { chromium } from 'playwright';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('perf/phase3');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function testNoJs() {
  console.log('\n--- Test 1: JavaScript DISABLED ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();
  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });

  const bootVisible = await page.$eval('#cg-boot', el => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.opacity !== '0';
  });

  const hasLogo = await page.$eval('#cg-boot .cg-logo img', img => img.complete || img.src.includes('Logo.png'));
  const hasSvg = await page.$eval('#cg-boot .rl-svg', svg => !!svg);

  console.log('  #cg-boot visible with JS disabled:', bootVisible);
  console.log('  Has logo image:', hasLogo);
  console.log('  Has ring assemble SVG:', hasSvg);

  await page.screenshot({ path: path.join(OUT_DIR, 'boot-nojs.png') });
  console.log('  Saved screenshot: perf/phase3/boot-nojs.png');

  await browser.close();
  return bootVisible && hasLogo && hasSvg;
}

async function testWithJs() {
  console.log('\n--- Test 2: JavaScript ENABLED & Full Lifecycle ---');
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--use-gl=angle', '--use-angle=gl', '--no-sandbox']
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('http://localhost:4173/?ringdebug=1', { waitUntil: 'load' });

  // Verify boot exists immediately
  const bootPresentAtStart = await page.evaluate(() => !!document.getElementById('cg-boot'));
  console.log('  #cg-boot present at start:', bootPresentAtStart);

  // Wait for loaderFadeStart in ready gate
  await page.waitForFunction(() => window.__cinegemReadyGate && window.__cinegemReadyGate.loaderFadeStart, { timeout: 30000 });
  const fadeStart = await page.evaluate(() => window.__cinegemReadyGate.loaderFadeStart);
  console.log(`  Loader fade started at ${fadeStart.toFixed(1)} ms`);

  // Wait for #cg-boot to be removed from DOM
  await page.waitForFunction(() => !document.getElementById('cg-boot'), { timeout: 10000 });
  console.log('  #cg-boot removed from DOM smoothly after fade-out transition');

  // Verify ready gate fired firstFrameRendered and loaderFadeStart
  const gate = await page.evaluate(() => window.__cinegemReadyGate);
  const ringRendered = !!(gate && gate.firstFrameRendered && gate.loaderFadeStart);
  console.log('  Ready gate firstFrameRendered:', !!gate?.firstFrameRendered);
  console.log('  Ready gate loaderFadeStart:', !!gate?.loaderFadeStart);

  await page.screenshot({ path: path.join(OUT_DIR, 'after-boot-fade.png') });
  console.log('  Saved screenshot: perf/phase3/after-boot-fade.png');

  await browser.close();
  return bootPresentAtStart && ringRendered;
}

async function testNonHomeRoute() {
  console.log('\n--- Test 3: Non-Home Route (/faq) ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();
  await page.goto('http://localhost:4173/faq', { waitUntil: 'domcontentloaded' });

  const hasBoot = await page.evaluate(() => !!document.getElementById('cg-boot'));
  console.log('  /faq has #cg-boot:', hasBoot, '(must be false)');

  await browser.close();
  return !hasBoot;
}

async function main() {
  console.log('Starting preview server on port 4173...');
  const server = spawn('npx', ['vite', 'preview', '--port', '4173'], { shell: true, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 2500));

  try {
    const noJsOk = await testNoJs();
    const withJsOk = await testWithJs();
    const nonHomeOk = await testNonHomeRoute();

    if (noJsOk && withJsOk && nonHomeOk) {
      console.log('\n🎉 ALL P0 ACCEPTANCE TESTS PASSED PERFECTLY!');
    } else {
      console.error('\n❌ P0 acceptance test failed:', { noJsOk, withJsOk, nonHomeOk });
      process.exit(1);
    }
  } finally {
    if (process.platform === 'win32') {
      try {
        execSync('taskkill /F /IM node.exe /FI "COMMANDLINE LIKE *vite*preview*"', { stdio: 'ignore' });
      } catch (e) {}
    } else {
      server.kill();
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

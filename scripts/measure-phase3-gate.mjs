import { chromium } from 'playwright';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('perf/phase3');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function measureGate(url, { isMobile, throttle = false }) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--use-gl=angle', '--use-angle=gl', '--no-sandbox']
  });

  const width = isMobile ? 390 : 1440;
  const height = isMobile ? 844 : 900;
  const dpr = isMobile ? 3 : 1;

  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: dpr,
    isMobile,
    hasTouch: isMobile,
    userAgent: isMobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
      : undefined
  });

  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

  if (throttle) {
    // 4G Throttling & 4x CPU slowdown (Lighthouse standard mobile)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
      uploadThroughput: 750 * 1024 / 8 // 750 Kbps
    });
  }

  await page.goto(url, { waitUntil: 'load', timeout: 60000 });

  // Wait for ready gate to record timestamps
  await page.waitForFunction(() => {
    return window.__cinegemReadyGate && window.__cinegemReadyGate.loaderFadeStart;
  }, { timeout: 60000 });

  const gateTimestamps = await page.evaluate(() => window.__cinegemReadyGate);
  await browser.close();
  return gateTimestamps;
}

async function run() {
  const suffix = process.argv[2] || 'baseline';
  console.log(`Starting preview server on port 4173 for ${suffix} gate timing...`);
  const server = spawn('npx', ['vite', 'preview', '--port', '4173'], { shell: true, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 3000));

  const url = 'http://localhost:4173/?ringdebug=1';
  try {
    console.log('Measuring desktop unthrottled...');
    const desktopUnthrottled = await measureGate(url, { isMobile: false, throttle: false });
    console.log('  Desktop fadeStart:', desktopUnthrottled.loaderFadeStart?.toFixed(1), 'ms');

    console.log('Measuring mobile unthrottled...');
    const mobileUnthrottled = await measureGate(url, { isMobile: true, throttle: false });
    console.log('  Mobile fadeStart:', mobileUnthrottled.loaderFadeStart?.toFixed(1), 'ms');

    console.log('Measuring mobile throttled (4x CPU, slow 4G)...');
    const mobileThrottled = await measureGate(url, { isMobile: true, throttle: true });
    console.log('  Mobile throttled fadeStart:', mobileThrottled.loaderFadeStart?.toFixed(1), 'ms');

    const outData = {
      desktopUnthrottled,
      mobileUnthrottled,
      mobileThrottled
    };

    const outPath = path.join(OUT_DIR, `${suffix}-gate-timings.json`);
    fs.writeFileSync(outPath, JSON.stringify(outData, null, 2));
    console.log(`✅ Saved ${outPath}`);
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

run().catch(err => {
  console.error(err);
  process.exit(1);
});

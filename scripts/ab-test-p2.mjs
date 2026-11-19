import { chromium } from 'playwright';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('perf/phase3');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function measureThrottledMobile(url) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--use-gl=angle', '--use-angle=gl', '--no-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
  });

  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
    uploadThroughput: 750 * 1024 / 8
  });

  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.__cinegemReadyGate && window.__cinegemReadyGate.loaderFadeStart, { timeout: 60000 });

  const gate = await page.evaluate(() => window.__cinegemReadyGate);
  await browser.close();
  return gate.loaderFadeStart;
}

export async function run3Runs(label) {
  console.log(`Starting preview server for ${label}...`);
  const server = spawn('npx', ['vite', 'preview', '--port', '4173'], { shell: true, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 3000));

  const url = 'http://localhost:4173/?ringdebug=1';
  const runs = [];
  try {
    for (let i = 1; i <= 3; i++) {
      console.log(`  Run ${i}/3 for ${label}...`);
      const t = await measureThrottledMobile(url);
      console.log(`    FadeStart: ${t.toFixed(1)} ms`);
      runs.push(t);
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

  const sorted = [...runs].sort((a, b) => a - b);
  const median = sorted[1];
  console.log(`=> ${label} median: ${median.toFixed(1)} ms (runs: ${runs.map(r => r.toFixed(1)).join(', ')})`);
  return { runs, median };
}

if (process.argv[1] === import.meta.filename || process.argv[1].endsWith('ab-test-p2.mjs')) {
  const label = process.argv[2] || 'Variant';
  run3Runs(label).then(res => {
    fs.writeFileSync(path.join(OUT_DIR, `p2-${label}.json`), JSON.stringify(res, null, 2));
  }).catch(console.error);
}

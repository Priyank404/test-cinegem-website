import { chromium } from 'playwright';
import { spawn, execSync } from 'child_process';
import path from 'path';
import sharp from 'sharp';
import fs from 'fs';

const BASE_DIR = path.resolve('perf/baseline/screenshots');
const OUT_DIR = path.resolve('perf/phase3/visual-diff');
fs.mkdirSync(OUT_DIR, { recursive: true });

const BEATS = [
  { name: 'Beat1-Hero', frame: 0, box: { xMin: 620, xMax: 820, yMin: 360, yMax: 540 } },
  { name: 'Beat2-Ecommerce', frame: 44, box: { xMin: 800, xMax: 1300, yMin: 400, yMax: 850 } },
  { name: 'Beat3-Creative', frame: 83, box: { xMin: 700, xMax: 1250, yMin: 300, yMax: 750 } },
  { name: 'Beat4-OnBody', frame: 131, box: { xMin: 550, xMax: 900, yMin: 250, yMax: 650 } },
  { name: 'Beat5-3DViewer', frame: 225, box: { xMin: 620, xMax: 820, yMin: 360, yMax: 540 } },
  { name: 'Beat6-Footer', frame: 260, box: { xMin: 580, xMax: 860, yMin: 320, yMax: 580 } }
];

async function compareImages(curPath, basePath, threshold = 12) {
  if (!fs.existsSync(basePath)) {
    return { error: `Baseline file missing: ${basePath}` };
  }
  const { data: cData, info: cInfo } = await sharp(curPath).raw().toBuffer({ resolveWithObject: true });
  const { data: bData, info: bInfo } = await sharp(basePath).raw().toBuffer({ resolveWithObject: true });

  if (cInfo.width !== bInfo.width || cInfo.height !== bInfo.height) {
    return { error: `Dimension mismatch: ${cInfo.width}x${cInfo.height} vs ${bInfo.width}x${bInfo.height}`, diffPct: 100 };
  }

  const total = cInfo.width * cInfo.height;
  let diffPixels = 0;
  const channels = cInfo.channels;

  for (let i = 0; i < total * channels; i += channels) {
    const dr = Math.abs(cData[i] - bData[i]);
    const dg = Math.abs(cData[i + 1] - bData[i + 1]);
    const db = Math.abs(cData[i + 2] - bData[i + 2]);
    if (dr > threshold || dg > threshold || db > threshold) {
      diffPixels++;
    }
  }

  return {
    width: cInfo.width,
    height: cInfo.height,
    totalPixels: total,
    diffPixels,
    diffPct: Number(((diffPixels / total) * 100).toFixed(3))
  };
}

async function run() {
  console.log('Starting preview server on port 4173 for Phase 3 visual diff...');
  const server = spawn('npx', ['vite', 'preview', '--port', '4173'], { shell: true, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 2500));

  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--use-gl=angle', '--use-angle=gl']
  });

  const summary = { desktop: {}, mobile: {} };

  try {
    // 1. Mobile verification (all 6 beats)
    console.log('\n📱 Testing Mobile (390x844 @3x) across all 6 beats...');
    const mCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    });
    const mPage = await mCtx.newPage();
    await mPage.goto('http://localhost:4173/?ringdebug=1', { waitUntil: 'load' });
    await mPage.waitForSelector('canvas', { timeout: 30000 });
    await mPage.waitForTimeout(4000);
    await mPage.evaluate(async () => { await document.fonts?.ready; });

    for (const b of BEATS) {
      await mPage.evaluate((p) => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, max * p);
      }, b.frame / 260);
      await mPage.waitForTimeout(2000);

      // Freeze videos
      await mPage.evaluate(() => {
        document.querySelectorAll('video').forEach(v => { v.pause(); v.currentTime = 0; });
      });

      const filename = `mobile-390x844_${b.name}.png`;
      const curPath = path.join(OUT_DIR, filename);
      const basePath = path.join(BASE_DIR, filename);
      await mPage.screenshot({ path: curPath });

      const diff = await compareImages(curPath, basePath);
      summary.mobile[b.name] = diff;
      console.log(`  ✓ ${b.name.padEnd(18)}: ${diff.diffPct !== undefined ? diff.diffPct + '% diff (' + diff.diffPixels + '/' + diff.totalPixels + ' px)' : diff.error}`);
    }
    await mCtx.close();

    // 2. Desktop verification (all 6 beats with aligned fog clock)
    console.log('\n💻 Testing Desktop (1440x900 @1x) across all 6 beats (aligned fog)...');
    const dCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const dPage = await dCtx.newPage();
    await dPage.goto('http://localhost:4173/?ringdebug=1', { waitUntil: 'load' });
    await dPage.waitForSelector('canvas', { timeout: 30000 });
    await dPage.waitForTimeout(4000);
    await dPage.evaluate(async () => { await document.fonts?.ready; });

    for (let i = 0; i < BEATS.length; i++) {
      const b = BEATS[i];
      await dPage.evaluate((p) => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, max * p);
      }, b.frame / 260);
      await dPage.waitForTimeout(1500);

      // Freeze videos
      await dPage.evaluate(() => {
        document.querySelectorAll('video').forEach(v => { v.pause(); v.currentTime = 0; });
      });

      // Align fog clock
      const targetTime = 5.8 + (i * 1.8);
      await dPage.evaluate((timeVal) => {
        if (window.__vantaEffect) {
          window.__vantaEffect.uniforms.iTime.value = timeVal;
          window.__vantaEffect.renderer.render(window.__vantaEffect.scene, window.__vantaEffect.camera);
        }
      }, targetTime);
      await dPage.waitForTimeout(200);

      const filename = `desktop-1440x900_${b.name}.png`;
      const curPath = path.join(OUT_DIR, filename);
      const basePath = path.join(BASE_DIR, filename);
      await dPage.screenshot({ path: curPath });

      // Detailed pixel analysis
      const { data: curData, info: curInfo } = await sharp(curPath).raw().toBuffer({ resolveWithObject: true });
      const { data: baseData, info: baseInfo } = await sharp(basePath).raw().toBuffer({ resolveWithObject: true });

      const total = curInfo.width * curInfo.height;
      let pageDiff = 0;
      let ringDiff = 0;
      let ringTotal = 0;

      for (let y = 0; y < curInfo.height; y++) {
        for (let x = 0; x < curInfo.width; x++) {
          const idx = (y * curInfo.width + x) * 3;
          const dr = Math.abs(curData[idx] - baseData[idx]);
          const dg = Math.abs(curData[idx + 1] - baseData[idx + 1]);
          const db = Math.abs(curData[idx + 2] - baseData[idx + 2]);
          const isDiff = dr > 12 || dg > 12 || db > 12;

          if (isDiff) pageDiff++;

          if (x >= b.box.xMin && x <= b.box.xMax && y >= b.box.yMin && y <= b.box.yMax) {
            ringTotal++;
            if (isDiff) ringDiff++;
          }
        }
      }

      const pageDiffPct = Number(((pageDiff / total) * 100).toFixed(3));
      const ringDiffPct = Number(((ringDiff / ringTotal) * 100).toFixed(3));
      summary.desktop[b.name] = {
        totalPixels: total,
        pageDiffPixels: pageDiff,
        pageDiffPct,
        ringTotalPixels: ringTotal,
        ringDiffPixels: ringDiff,
        ringDiffPct
      };
      console.log(`  ✓ ${b.name.padEnd(18)}: Total Page ${pageDiffPct}% (${pageDiff} px) | Ring Box: ${ringDiffPct}% (${ringDiff}/${ringTotal} px)`);
    }
    await dCtx.close();

    fs.writeFileSync(path.resolve('perf/phase3/visual-diff-summary.json'), JSON.stringify(summary, null, 2));
    console.log('\n✅ Visual diff testing complete. Summary written to perf/phase3/visual-diff-summary.json');
  } finally {
    await browser.close();
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

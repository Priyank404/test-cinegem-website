import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('perf/phase3');
fs.mkdirSync(OUT_DIR, { recursive: true });

function runSingleAudit(url, mode, view, runNum) {
  const isDesktop = view === 'desktop';
  const isDevtools = mode === 'devtools';
  const filename = `baseline-${mode}-${view}-run${runNum}.json`;
  const outPath = path.join(OUT_DIR, filename);

  const throttlingFlag = isDevtools ? '--throttling-method=devtools' : '';
  const formFactorFlag = isDesktop ? '--preset=desktop' : '--form-factor=mobile';
  const chromeFlags = '--chrome-flags="--headless=new --no-sandbox"';

  const cmd = `npx lighthouse "${url}" ${throttlingFlag} ${formFactorFlag} --only-categories=performance ${chromeFlags} --output=json --output-path="${outPath}"`;
  console.log(`\n⏳ Running [${mode} | ${view}] run ${runNum}/3...`);
  try {
    execSync(cmd, { stdio: 'pipe' });
  } catch (err) {
    console.error(`Error running lighthouse for ${filename}:`, err.message);
  }

  if (fs.existsSync(outPath)) {
    const data = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    const lcpElem = data.audits?.['largest-contentful-paint-element']?.details?.items?.[0]?.node?.nodeLabel || 'N/A';
    return {
      run: runNum,
      score: Math.round((data.categories?.performance?.score || 0) * 100),
      fcp: ((data.audits?.['first-contentful-paint']?.numericValue || 0) / 1000).toFixed(2),
      lcp: ((data.audits?.['largest-contentful-paint']?.numericValue || 0) / 1000).toFixed(2),
      tbt: Math.round(data.audits?.['total-blocking-time']?.numericValue || 0),
      si: ((data.audits?.['speed-index']?.numericValue || 0) / 1000).toFixed(2),
      cls: ((data.audits?.['cumulative-layout-shift']?.numericValue || 0)).toFixed(3),
      lcpElem
    };
  }
  return null;
}

function getMedian(runs) {
  const sorted = [...runs].filter(Boolean).sort((a, b) => a.score - b.score);
  return sorted[Math.floor(sorted.length / 2)];
}

async function main() {
  console.log('Starting preview server on port 4173...');
  const server = spawn('npx', ['vite', 'preview', '--port', '4173'], { shell: true, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 3000));

  const url = 'http://localhost:4173/?ringdebug=1';
  const allResults = {};

  try {
    for (const mode of ['devtools', 'sim']) {
      allResults[mode] = {};
      for (const view of ['mobile', 'desktop']) {
        const runs = [];
        for (let i = 1; i <= 3; i++) {
          const res = runSingleAudit(url, mode, view, i);
          if (res) {
            runs.push(res);
            console.log(`  ${mode} ${view} run ${i}: Score ${res.score} | FCP ${res.fcp}s | LCP ${res.lcp}s | TBT ${res.tbt}ms | SI ${res.si}s | LCP Elem: ${res.lcpElem}`);
          }
        }
        const med = getMedian(runs);
        allResults[mode][view] = { runs, median: med };
      }
    }

    fs.writeFileSync(path.join(OUT_DIR, 'baseline-summary.json'), JSON.stringify(allResults, null, 2));
    console.log('\n✅ Baseline measurement completed and saved to perf/phase3/baseline-summary.json');
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

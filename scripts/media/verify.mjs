import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const k = trimmed.slice(0, eqIdx).trim();
      let v = trimmed.slice(eqIdx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      env[k] = v;
    }
  }
  return env;
}

const mediaLocalEnv = loadEnvFile(path.join(rootDir, '.env.media.local'));
const rootEnv = loadEnvFile(path.join(rootDir, '.env'));

let rawUrl = (mediaLocalEnv.R2_PUBLIC_BASE_URL || rootEnv.VITE_MEDIA_BASE_URL || '').trim();
if (rawUrl && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
  rawUrl = `https://${rawUrl}`;
}
const baseUrl = rawUrl.replace(/\/+$/, '');
const corsOrigins = mediaLocalEnv.CORS_ORIGINS
  ? mediaLocalEnv.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:5173'];

const FOLDERS = ['home', 'creative-visuals', 'classic', 'onbody'];

async function testUrl(url, options = {}) {
  try {
    const res = await fetch(url, options);
    return {
      status: res.status,
      headers: res.headers,
      ok: res.ok,
      json: async () => {
        try {
          return await res.json();
        } catch {
          return null;
        }
      }
    };
  } catch (err) {
    return { status: 0, headers: new Headers(), ok: false, error: err.message };
  }
}

async function main() {
  console.log('====================================================');
  console.log(' Cloudflare R2 Media Verification Suite');
  console.log(` Base URL: ${baseUrl || '(NOT CONFIGURED)'}`);
  console.log('====================================================\n');

  if (!baseUrl) {
    console.error('❌ Base URL is missing. Set R2_PUBLIC_BASE_URL in .env.media.local or VITE_MEDIA_BASE_URL in .env');
    process.exit(1);
  }

  const results = [];
  function record(check, passed, details) {
    results.push({ check, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} | ${check.padEnd(45)} | ${details}`);
  }

  const manifests = {};
  let anyVideoKey = null;
  let anyImageKey = null;

  // Check 1: Manifests and referenced keys
  for (const prefix of FOLDERS) {
    const manifestUrl = `${baseUrl}/manifests/${prefix}.json`;
    const res = await testUrl(manifestUrl);
    if (!res.ok) {
      record(`Manifest [${prefix}] HTTP 200`, false, `Status ${res.status} at ${manifestUrl}`);
      continue;
    }
    const data = await res.json();
    if (!data || !Array.isArray(data.items)) {
      record(`Manifest [${prefix}] Valid JSON`, false, `Invalid JSON payload at ${manifestUrl}`);
      continue;
    }
    record(`Manifest [${prefix}] valid (${data.items.length} items)`, true, `HTTP 200`);
    manifests[prefix] = data;

    // Check sample keys from manifest
    for (const item of data.items) {
      if (item.type === 'video' && !anyVideoKey) {
        anyVideoKey = item.src;
      }
      if (item.type === 'image' && !anyImageKey) {
        anyImageKey = item.src;
      }
    }
  }

  // Check sample image content-type
  if (anyImageKey) {
    const imgUrl = `${baseUrl}/${anyImageKey}`;
    const imgRes = await testUrl(imgUrl);
    const ct = imgRes.headers.get('content-type') || '';
    const pass = imgRes.status === 200 && (ct.includes('image/avif') || ct.includes('image/webp'));
    record('Image Content-Type & 200', pass, `${imgRes.status}, Content-Type: ${ct}`);
  }

  // Check 2: Video range requests (206 Partial Content + Accept-Ranges: bytes)
  if (anyVideoKey) {
    const vidUrl = `${baseUrl}/${anyVideoKey}`;
    const vidRes = await testUrl(vidUrl, {
      headers: { Range: 'bytes=0-1' }
    });
    const acceptRanges = vidRes.headers.get('accept-ranges');
    const contentRange = vidRes.headers.get('content-range');
    const pass = vidRes.status === 206 && (acceptRanges === 'bytes' || contentRange?.startsWith('bytes'));
    record('Video Range Request (206)', pass, `Status ${vidRes.status}, content-range: ${contentRange}`);
  }

  // Check 3: Cloudflare Edge Cache Status
  if (anyImageKey) {
    const imgUrl = `${baseUrl}/${anyImageKey}`;
    // First request
    await testUrl(imgUrl);
    // Second request to check cache hit
    const secondRes = await testUrl(imgUrl);
    const cfCache = secondRes.headers.get('cf-cache-status') || 'NONE';
    const isHit = cfCache === 'HIT';
    record('Cloudflare Cache Status (cf-cache-status: HIT)', isHit, `cf-cache-status: ${cfCache}`);
    if (!isHit) {
      console.log('   ℹ️ Note: If cf-cache-status is DYNAMIC/MISS, configure a Cloudflare Cache Rule:');
      console.log('      Hostname: media.<your-domain>');
      console.log('      Settings: Eligible for cache; Edge TTL: Respect origin headers\n');
    }
  }

  // Check 4: CORS headers for origins
  for (const origin of corsOrigins) {
    const manifestUrl = `${baseUrl}/manifests/home.json`;
    const corsRes = await testUrl(manifestUrl, {
      headers: { Origin: origin }
    });
    const acao = corsRes.headers.get('access-control-allow-origin');
    const pass = acao === origin || acao === '*';
    record(`CORS check for ${origin}`, pass, `access-control-allow-origin: ${acao || '(none)'}`);
  }

  console.log('\n====================================================');
  console.log(' Verification Summary:');
  const allPassed = results.every(r => r.passed);
  console.log(` Total Checks: ${results.length} | Passed: ${results.filter(r => r.passed).length} | Failed: ${results.filter(r => !r.passed).length}`);
  console.log('====================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});


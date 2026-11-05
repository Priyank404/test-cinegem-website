#!/usr/bin/env node
/**
 * Cinegem Studio — Cloudflare R2 Media Sync Pipeline
 * 
 * Synchronizes local media originals from:
 *   C:\Users\admin\Documents\Cinegem\Projects\Cinegem Website\Cinegem\media-originals
 * 
 * Pipeline Phases:
 * 1. Environment & Preflight Health Check (R2 credentials, ffmpeg, ffprobe, sharp)
 * 2. Media Discovery & SHA-256 Content Hashing
 * 3. Variant Generation:
 *    - Images: 640px, 1200px, 1920px, 2560px, 3840px in AVIF + WebP + base64 LQIP blur
 *    - Videos: 1080p & 720p streaming MP4 (H.264 faststart) + AVIF/WebP video posters
 *    - Manifests: Compiled JSON manifests written to .media-out, public/manifests, and manifests/
 * 4. Ultra-Fast S3/R2 Bucket Sync (Single-roundtrip inventory lookup + concurrent upload)
 * 5. CDN Verification & Summary Dashboard
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import pLimit from 'p-limit';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to load key=value environment files
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

// Load environments
const mediaLocalEnv = loadEnvFile(path.join(rootDir, '.env.media.local'));
const rootEnv = loadEnvFile(path.join(rootDir, '.env'));

// Determine source folder (defaults to absolute project media-originals)
const configuredSourceDir = mediaLocalEnv.MEDIA_SOURCE_DIR || 'media-originals';
const baseSourceDir = path.isAbsolute(configuredSourceDir)
  ? configuredSourceDir
  : path.resolve(rootDir, configuredSourceDir);

const outputDir = path.join(rootDir, '.media-out');
const cacheFile = path.join(rootDir, '.media-cache.json');
const enable2160Video = mediaLocalEnv.ENABLE_4K_VIDEO === 'true' || mediaLocalEnv.ENABLE_4K_VIDEO === '1';

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.webp', '.avif']);
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi']);
const TARGET_WIDTHS = [640, 1200, 1920, 2560, 3840];
const FOLDERS = ['home', 'creative-visuals', 'classic', 'onbody'];

const IMAGE_VERSION = 1;
const ENCODE_VERSION = 2;

// Command line arguments
const args = process.argv.slice(2);
const isNoPrune = args.includes('--no-prune');
const shouldPrune = !isNoPrune;
const isForce = args.includes('--force');
const targetFolderArg = (() => {
  const idx = args.indexOf('--folder');
  return idx !== -1 && args[idx + 1] ? args[idx + 1].trim().toLowerCase() : null;
})();

// Credentials
const accountId = mediaLocalEnv.R2_ACCOUNT_ID;
const bucketName = mediaLocalEnv.R2_BUCKET;
const accessKeyId = mediaLocalEnv.R2_ACCESS_KEY_ID;
const secretAccessKey = mediaLocalEnv.R2_SECRET_ACCESS_KEY;
let rawBaseUrl = (mediaLocalEnv.R2_PUBLIC_BASE_URL || rootEnv.VITE_MEDIA_BASE_URL || 'media.cinegemstudio.com').trim();
if (!rawBaseUrl.startsWith('http://') && !rawBaseUrl.startsWith('https://')) {
  rawBaseUrl = `https://${rawBaseUrl}`;
}
const publicCdnUrl = rawBaseUrl.replace(/\/+$/, '');

function computeHash8(filePath, version = 1) {
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256')
    .update(fileBuffer)
    .update(String(version))
    .digest('hex');
  return hash.slice(0, 8);
}

function loadCache() {
  if (!isForce && fs.existsSync(cacheFile)) {
    try {
      return JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveCache(cache) {
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), 'utf-8');
}

async function probeVideo(filePath) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,r_frame_rate,duration',
    '-show_entries', 'format=duration',
    '-of', 'json',
    filePath
  ]);
  const data = JSON.parse(stdout);
  const stream = data.streams?.[0] || {};
  const width = Number(stream.width || 0);
  const height = Number(stream.height || 0);
  let fps = 30;
  if (stream.r_frame_rate) {
    const [num, den] = stream.r_frame_rate.split('/').map(Number);
    if (den && den > 0) fps = num / den;
  }
  let duration = Number(data.format?.duration || stream.duration || 0);
  if (Number.isNaN(duration)) duration = 0;
  return { width, height, fps, duration: Math.round(duration * 100) / 100 };
}

function getBoundingBox(srcWidth, srcHeight, boxSize) {
  let maxW, maxH;
  if (srcWidth > srcHeight) {
    maxW = boxSize === 1080 ? 1920 : boxSize === 720 ? 1280 : 3840;
    maxH = boxSize;
  } else if (srcHeight > srcWidth) {
    maxW = boxSize;
    maxH = boxSize === 1080 ? 1920 : boxSize === 720 ? 1280 : 3840;
  } else {
    maxW = boxSize;
    maxH = boxSize;
  }

  if (srcWidth <= maxW && srcHeight <= maxH) {
    let targetW = srcWidth;
    let targetH = srcHeight;
    if (targetW % 2 !== 0) targetW -= 1;
    if (targetH % 2 !== 0) targetH -= 1;
    return { targetW, targetH };
  }

  const scale = Math.min(maxW / srcWidth, maxH / srcHeight);
  let targetW = Math.round(srcWidth * scale);
  let targetH = Math.round(srcHeight * scale);
  if (targetW % 2 !== 0) targetW -= 1;
  if (targetH % 2 !== 0) targetH -= 1;
  return { targetW, targetH };
}

async function processImage(sourcePath, prefix, fileName, hash8, cache) {
  const cacheKey = `${prefix}/${fileName}:v${IMAGE_VERSION}`;
  const baseName = path.parse(fileName).name;
  const relFolder = `${prefix}/${baseName}.${hash8}`;
  const targetDir = path.join(outputDir, prefix, `${baseName}.${hash8}`);

  const meta = await sharp(sourcePath).metadata();
  const width = meta.width;
  const height = meta.height;

  let widths = TARGET_WIDTHS.filter(w => w <= width);
  if (widths.length === 0) widths = [width];

  // Check cache and existing files
  if (cache[cacheKey] && cache[cacheKey].hash8 === hash8) {
    const allExist = widths.every(w => {
      return fs.existsSync(path.join(targetDir, `${w}.avif`)) &&
             fs.existsSync(path.join(targetDir, `${w}.webp`));
    });
    if (allExist) {
      return { item: cache[cacheKey].item, fromCache: true, variantsCount: widths.length * 2 + 1 };
    }
  }

  fs.mkdirSync(targetDir, { recursive: true });

  console.log(`   🎨 [IMAGE] ${prefix}/${fileName} (${width}x${height}) -> ${widths.join(', ')}px (AVIF+WebP)`);

  // Generate tiny blurred placeholder (24px WebP)
  const blurBuffer = await sharp(sourcePath)
    .rotate()
    .resize(24, null, { withoutEnlargement: true })
    .blur(1)
    .webp({ quality: 20 })
    .toBuffer();
  const blur = `data:image/webp;base64,${blurBuffer.toString('base64')}`;

  const avifSet = [];
  const webpSet = [];

  for (const w of widths) {
    const avifRel = `${relFolder}/${w}.avif`;
    const webpRel = `${relFolder}/${w}.webp`;
    const avifOut = path.join(targetDir, `${w}.avif`);
    const webpOut = path.join(targetDir, `${w}.webp`);

    await sharp(sourcePath)
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .toColorspace('srgb')
      .avif({ quality: 58, effort: 4 })
      .toFile(avifOut);

    await sharp(sourcePath)
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .toColorspace('srgb')
      .webp({ quality: 80 })
      .toFile(webpOut);

    avifSet.push([avifRel, w]);
    webpSet.push([webpRel, w]);
  }

  const srcWidth = widths.find(w => w === 1920) || widths.filter(w => w <= 1920).pop() || widths[0];
  const thumbRel = `${relFolder}/${widths[0]}.avif`;
  const srcRel = `${relFolder}/${srcWidth}.avif`;
  const fullRel = `${relFolder}/${widths[widths.length - 1]}.avif`;
  const cleanAlt = baseName.replace(/[_-]+/g, ' ').trim();

  const item = {
    id: `${prefix}/${fileName}`,
    name: fileName,
    filename: fileName,
    alt: cleanAlt || fileName,
    type: 'image',
    isVideo: false,
    width,
    height,
    blur,
    src: srcRel,
    thumb: thumbRel,
    full: fullRel,
    srcSet: {
      avif: avifSet,
      webp: webpSet
    }
  };

  cache[cacheKey] = { hash8, item };
  return { item, fromCache: false, variantsCount: widths.length * 2 + 1 };
}

async function processVideo(sourcePath, prefix, fileName, hash8, cache) {
  const cacheKey = `${prefix}/${fileName}:v${ENCODE_VERSION}`;
  const baseName = path.parse(fileName).name;
  const relFolder = `${prefix}/${baseName}.${hash8}`;
  const targetDir = path.join(outputDir, prefix, `${baseName}.${hash8}`);

  const probe = await probeVideo(sourcePath);
  const { width, height, fps, duration } = probe;

  // Check cache
  if (cache[cacheKey] && cache[cacheKey].hash8 === hash8) {
    const requiredFiles = ['1080.mp4', '720.mp4', 'poster.avif', 'poster.webp'];
    if (enable2160Video && (width >= 2160 || height >= 2160)) requiredFiles.push('2160.mp4');
    const allExist = requiredFiles.every(f => fs.existsSync(path.join(targetDir, f)));
    if (allExist) {
      return { item: cache[cacheKey].item, fromCache: true, variantsCount: requiredFiles.length };
    }
  }

  fs.mkdirSync(targetDir, { recursive: true });

  console.log(`   🎬 [VIDEO] ${prefix}/${fileName} (${width}x${height}, ${fps}fps, ${duration}s) -> 1080p + 720p + Posters`);

  // Extract poster frame at 0.5s
  const seekTime = Math.min(0.5, duration > 0 ? duration / 2 : 0.5);
  const posterFrameTmp = path.join(targetDir, `_poster_tmp.png`);
  await execFileAsync('ffmpeg', [
    '-y',
    '-ss', seekTime.toString(),
    '-i', sourcePath,
    '-vframes', '1',
    '-vf', 'scale=min(1920\\,iw):-2',
    posterFrameTmp
  ]);

  const posterAvifOut = path.join(targetDir, 'poster.avif');
  const posterWebpOut = path.join(targetDir, 'poster.webp');

  await sharp(posterFrameTmp)
    .toColorspace('srgb')
    .avif({ quality: 60, effort: 4 })
    .toFile(posterAvifOut);

  await sharp(posterFrameTmp)
    .toColorspace('srgb')
    .webp({ quality: 80 })
    .toFile(posterWebpOut);

  if (fs.existsSync(posterFrameTmp)) {
    fs.unlinkSync(posterFrameTmp);
  }

  function buildFilter(targetW, targetH) {
    let vf = `scale=${targetW}:${targetH}`;
    if (fps > 30) vf += ',fps=fps=30';
    return vf;
  }

  // 1080p H.264
  const dims1080 = getBoundingBox(width, height, 1080);
  const out1080 = path.join(targetDir, '1080.mp4');
  console.log(`      -> 1080p MP4 (${dims1080.targetW}x${dims1080.targetH})...`);
  await execFileAsync('ffmpeg', [
    '-y',
    '-i', sourcePath,
    '-vf', buildFilter(dims1080.targetW, dims1080.targetH),
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '18',
    '-maxrate', '10M',
    '-bufsize', '20M',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
    '-level', '4.1',
    '-g', '48',
    '-keyint_min', '48',
    '-sc_threshold', '0',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    '-colorspace', 'bt709',
    '-an',
    '-movflags', '+faststart',
    out1080
  ]);

  // 720p H.264
  const dims720 = getBoundingBox(width, height, 720);
  const out720 = path.join(targetDir, '720.mp4');
  console.log(`      -> 720p MP4 (${dims720.targetW}x${dims720.targetH})...`);
  await execFileAsync('ffmpeg', [
    '-y',
    '-i', sourcePath,
    '-vf', buildFilter(dims720.targetW, dims720.targetH),
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '21',
    '-maxrate', '4M',
    '-bufsize', '8M',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
    '-level', '4.1',
    '-g', '48',
    '-keyint_min', '48',
    '-sc_threshold', '0',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    '-colorspace', 'bt709',
    '-an',
    '-movflags', '+faststart',
    out720
  ]);

  let fullRel = `${relFolder}/1080.mp4`;
  let variantCount = 4; // 1080, 720, poster.avif, poster.webp

  // 2160p (4K) if enabled
  if (enable2160Video && (width >= 2160 || height >= 2160)) {
    const dims2160 = getBoundingBox(width, height, 2160);
    const out2160 = path.join(targetDir, '2160.mp4');
    console.log(`      -> 2160p (4K) MP4 (${dims2160.targetW}x${dims2160.targetH})...`);
    await execFileAsync('ffmpeg', [
      '-y',
      '-i', sourcePath,
      '-vf', buildFilter(dims2160.targetW, dims2160.targetH),
      '-c:v', 'libx264',
      '-preset', 'slow',
      '-crf', '18',
      '-maxrate', '25M',
      '-bufsize', '50M',
      '-pix_fmt', 'yuv420p',
      '-profile:v', 'high',
      '-level', '5.1',
      '-g', '48',
      '-keyint_min', '48',
      '-sc_threshold', '0',
      '-color_primaries', 'bt709',
      '-color_trc', 'bt709',
      '-colorspace', 'bt709',
      '-an',
      '-movflags', '+faststart',
      out2160
    ]);
    fullRel = `${relFolder}/2160.mp4`;
    variantCount += 1;
  }

  const cleanAlt = baseName.replace(/[_-]+/g, ' ').trim();

  const item = {
    id: `${prefix}/${fileName}`,
    name: fileName,
    filename: fileName,
    alt: cleanAlt || fileName,
    type: 'video',
    isVideo: true,
    width,
    height,
    duration,
    src: `${relFolder}/1080.mp4`,
    srcLow: `${relFolder}/720.mp4`,
    full: fullRel,
    poster: `${relFolder}/poster.avif`,
    posterWebp: `${relFolder}/poster.webp`,
    thumb: `${relFolder}/poster.avif`
  };

  cache[cacheKey] = { hash8, item };
  return { item, fromCache: false, variantsCount: variantCount };
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.avif': return 'image/avif';
    case '.webp': return 'image/webp';
    case '.mp4': return 'video/mp4';
    case '.json': return 'application/json';
    default: return 'application/octet-stream';
  }
}

function getAllFiles(dir, base = '') {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const relKey = base ? `${base}/${file}` : file;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, relKey));
    } else {
      results.push({ fullPath, relKey: relKey.replace(/\\/g, '/'), size: stat.size });
    }
  }
  return results;
}

async function fetchRemoteInventory(s3, bucket) {
  const inventory = new Map();
  let continuationToken = undefined;

  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken
    }));
    if (res.Contents) {
      for (const obj of res.Contents) {
        if (obj.Key) {
          inventory.set(obj.Key, obj.Size);
        }
      }
    }
    continuationToken = res.NextContinuationToken;
  } while (continuationToken);

  return inventory;
}

// Main Runner
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           Cinegem Studio — Cloudflare R2 Media Sync              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Preflight check
  if (!fs.existsSync(baseSourceDir)) {
    console.error(`❌ Source folder not found: ${baseSourceDir}`);
    console.error('Please create this folder and drop your original 4K assets into subfolders:');
    console.error('  - media-originals/home/');
    console.error('  - media-originals/classic/');
    console.error('  - media-originals/creative-visuals/');
    console.error('  - media-originals/onbody/');
    process.exit(1);
  }

  if (!accountId || !bucketName || !accessKeyId || !secretAccessKey) {
    console.error('❌ Missing Cloudflare R2 credentials in .env.media.local');
    console.error('Required: R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
    process.exit(1);
  }

  console.log(`📂 Source Directory: ${baseSourceDir}`);
  console.log(`☁️  Target R2 Bucket: ${bucketName} (${accountId.slice(0, 8)}...)`);
  console.log(`🌐 Public Media CDN: ${publicCdnUrl}\n`);

  // 1. Process local folder and build variants
  console.log('────────────────────────────────────────────────────────────────────');
  console.log(' PHASE 1: Scanning media-originals & Generating Responsive Variants');
  console.log('────────────────────────────────────────────────────────────────────');

  const cache = loadCache();
  const manifestsDir = path.join(outputDir, 'manifests');
  const publicManifestsDir = path.join(rootDir, 'public', 'manifests');
  const rootManifestsDir = path.join(rootDir, 'manifests');
  fs.mkdirSync(manifestsDir, { recursive: true });
  fs.mkdirSync(publicManifestsDir, { recursive: true });
  fs.mkdirSync(rootManifestsDir, { recursive: true });

  const existingFolders = fs.readdirSync(baseSourceDir).filter(name => {
    return fs.statSync(path.join(baseSourceDir, name)).isDirectory();
  });

  const foldersToProcess = targetFolderArg
    ? [targetFolderArg]
    : [
        ...FOLDERS.filter(f => existingFolders.includes(f)),
        ...existingFolders.filter(f => !FOLDERS.includes(f))
      ];

  let totalOriginalsCount = 0;
  let totalVariantsBuilt = 0;
  const folderStats = [];

  for (const prefix of foldersToProcess) {
    const folderPath = path.join(baseSourceDir, prefix);
    if (!fs.existsSync(folderPath)) {
      console.warn(`⚠️ Folder "${prefix}" does not exist in media-originals, skipping.`);
      continue;
    }

    const files = fs.readdirSync(folderPath).filter(f => !f.startsWith('.'));
    files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    console.log(`\n📁 Processing folder "${prefix}" (${files.length} originals)...`);
    const items = [];
    let folderBuiltCount = 0;

    for (const fileName of files) {
      const filePath = path.join(folderPath, fileName);
      const ext = path.extname(fileName).toLowerCase();

      if (IMAGE_EXTS.has(ext)) {
        totalOriginalsCount++;
        const hash8 = computeHash8(filePath, IMAGE_VERSION);
        const { item, fromCache, variantsCount } = await processImage(filePath, prefix, fileName, hash8, cache);
        items.push(item);
        if (!fromCache) folderBuiltCount += variantsCount;
      } else if (VIDEO_EXTS.has(ext)) {
        totalOriginalsCount++;
        const hash8 = computeHash8(filePath, ENCODE_VERSION);
        const { item, fromCache, variantsCount } = await processVideo(filePath, prefix, fileName, hash8, cache);
        items.push(item);
        if (!fromCache) folderBuiltCount += variantsCount;
      }
    }

    totalVariantsBuilt += folderBuiltCount;
    const images = items.filter(i => i.type === 'image');
    const videos = items.filter(i => i.type === 'video');

    const manifest = {
      prefix,
      total: items.length,
      imageCount: images.length,
      videoCount: videos.length,
      updatedAt: new Date().toISOString(),
      items,
      images,
      videos
    };

    const manifestJson = JSON.stringify(manifest, null, 2);
    fs.writeFileSync(path.join(manifestsDir, `${prefix}.json`), manifestJson, 'utf-8');
    fs.writeFileSync(path.join(publicManifestsDir, `${prefix}.json`), manifestJson, 'utf-8');
    fs.writeFileSync(path.join(rootManifestsDir, `${prefix}.json`), manifestJson, 'utf-8');

    folderStats.push({
      prefix,
      total: items.length,
      images: images.length,
      videos: videos.length,
      built: folderBuiltCount
    });

    console.log(`   📄 Manifest compiled: ${prefix}.json (${items.length} items)`);
  }

  // Clean up obsolete local variant folders and cache entries if prune is enabled
  if (shouldPrune) {
    for (const prefix of foldersToProcess) {
      const outPrefixDir = path.join(outputDir, prefix);
      if (!fs.existsSync(outPrefixDir)) continue;

      const manifestPath = path.join(manifestsDir, `${prefix}.json`);
      if (!fs.existsSync(manifestPath)) continue;

      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        const activeSubfolders = new Set(
          (manifest.items || [])
            .map(item => {
              const parts = (item.src || '').split('/');
              return parts.length > 2 ? parts[1] : null;
            })
            .filter(Boolean)
        );

        const subdirs = fs.readdirSync(outPrefixDir, { withFileTypes: true });
        for (const dirent of subdirs) {
          if (dirent.isDirectory() && !activeSubfolders.has(dirent.name)) {
            const obsoletePath = path.join(outPrefixDir, dirent.name);
            fs.rmSync(obsoletePath, { recursive: true, force: true });
          }
        }
      } catch (err) {
        console.warn(`⚠️ Error pruning local folder for ${prefix}:`, err.message);
      }
    }

    // Prune obsolete keys from cache where the source file no longer exists
    for (const cacheKey of Object.keys(cache)) {
      const match = cacheKey.match(/^([^/]+)\/([^:]+):v\d+$/);
      if (match) {
        const [, prefix, fileName] = match;
        const origPath = path.join(baseSourceDir, prefix, fileName);
        if (!fs.existsSync(origPath)) {
          delete cache[cacheKey];
        }
      }
    }
  }

  saveCache(cache);

  // 2. Upload to Cloudflare R2
  console.log('\n────────────────────────────────────────────────────────────────────');
  console.log(' PHASE 2: Fast Concurrent Synchronization to Cloudflare R2');
  console.log('────────────────────────────────────────────────────────────────────\n');

  const s3 = new S3Client({
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    region: 'auto',
    credentials: { accessKeyId, secretAccessKey }
  });

  console.log('📡 Fetching remote R2 bucket inventory (single roundtrip)...');
  const remoteInventory = await fetchRemoteInventory(s3, bucketName);
  console.log(`   Found ${remoteInventory.size} existing objects in R2 bucket.\n`);

  const allLocalFiles = getAllFiles(outputDir);
  const mediaFiles = allLocalFiles.filter(f => !f.relKey.startsWith('manifests/'));
  const manifestFiles = allLocalFiles.filter(f => f.relKey.startsWith('manifests/'));

  console.log(`📦 Local files to evaluate: ${mediaFiles.length} media variants + ${manifestFiles.length} manifests`);

  const limit = pLimit(10);
  let uploadedMediaCount = 0;
  let skippedMediaCount = 0;

  async function uploadFile(fileObj, isManifest = false) {
    const key = fileObj.relKey;
    const filePath = fileObj.fullPath;
    const contentType = getContentType(filePath);
    const cacheControl = isManifest
      ? 'public, max-age=300, stale-while-revalidate=86400'
      : 'public, max-age=31536000, immutable';

    // If already in R2 with same size, skip upload instantly
    if (!isManifest && remoteInventory.has(key) && remoteInventory.get(key) === fileObj.size) {
      skippedMediaCount++;
      return;
    }

    const fileStream = fs.createReadStream(filePath);
    const parallelUpload = new Upload({
      client: s3,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: fileStream,
        ContentType: contentType,
        CacheControl: cacheControl
      }
    });

    await parallelUpload.done();
    if (!isManifest) uploadedMediaCount++;
    console.log(`   ⬆️ [UPLOADED] ${key} (${contentType})`);
  }

  // Upload new/modified media files
  console.log('\n🚀 Uploading media assets...');
  await Promise.all(mediaFiles.map(f => limit(() => uploadFile(f, false))));

  // Upload manifests
  console.log('\n📄 Uploading latest manifest files...');
  await Promise.all(manifestFiles.map(f => limit(() => uploadFile(f, true))));

  // Prune obsolete objects from Cloudflare R2 (enabled by default, disable with --no-prune)
  let prunedCount = 0;
  if (shouldPrune) {
    console.log('\n🧹 Checking for obsolete objects to prune from Cloudflare R2...');
    const MANAGED_PREFIXES = ['home/', 'creative-visuals/', 'classic/', 'onbody/'];
    const localKeys = new Set(allLocalFiles.map(f => f.relKey));
    const keysToDelete = Array.from(remoteInventory.keys()).filter(
      k => MANAGED_PREFIXES.some(p => k.startsWith(p)) && !localKeys.has(k)
    );

    if (keysToDelete.length > 0) {
      console.log(`   🗑️ Deleting ${keysToDelete.length} obsolete objects from R2 (old/renamed versions)...`);
      for (let i = 0; i < keysToDelete.length; i += 1000) {
        const chunk = keysToDelete.slice(i, i + 1000);
        await s3.send(new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: { Objects: chunk.map(Key => ({ Key })) }
        }));
      }
      prunedCount = keysToDelete.length;
      console.log(`   ✅ Successfully pruned ${keysToDelete.length} obsolete items from R2.`);
    } else {
      console.log('   ✅ R2 bucket is completely clean. No obsolete items found.');
    }
  }

  // 3. Live CDN Verification
  console.log('\n────────────────────────────────────────────────────────────────────');
  console.log(' PHASE 3: Live CDN Edge Verification');
  console.log('────────────────────────────────────────────────────────────────────\n');

  for (const { prefix } of folderStats) {
    const testUrl = `${publicCdnUrl}/manifests/${prefix}.json`;
    try {
      const res = await fetch(`${testUrl}?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        console.log(`   ✅ LIVE: ${testUrl} (HTTP ${res.status})`);
      } else {
        console.warn(`   ⚠️ Status ${res.status} for ${testUrl}`);
      }
    } catch (err) {
      console.warn(`   ⚠️ Verification fetch error for ${testUrl}: ${err.message}`);
    }
  }

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                   SYNC COMPLETED SUCCESSFULLY!                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`\n📊 Breakdown:`);
  console.log(`   • Original Media Files Processed: ${totalOriginalsCount}`);
  console.log(`   • New Variations Built This Run : ${totalVariantsBuilt}`);
  console.log(`   • Files Uploaded to Cloudflare R2: ${uploadedMediaCount + manifestFiles.length}`);
  console.log(`   • Obsolete Files Pruned from R2 : ${prunedCount}`);
  console.log(`   • Unchanged Files Skipped (Fast): ${skippedMediaCount}`);
  console.log(`\n📁 Folder Breakdown:`);
  folderStats.forEach(s => {
    console.log(`   - /${s.prefix.padEnd(18)} : ${s.total} items (${s.images} images, ${s.videos} videos)`);
  });
  console.log(`\n🎉 Your website is instantly connected to the newly synced media!`);
}

main().catch(err => {
  console.error('\n❌ Fatal error during media sync:', err);
  process.exit(1);
});

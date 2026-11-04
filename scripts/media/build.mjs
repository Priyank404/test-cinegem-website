import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

// Helper to load simple env file
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
const baseSourceDir = mediaLocalEnv.MEDIA_SOURCE_DIR || path.join(rootDir, 'media-originals');
const outputDir = path.join(rootDir, '.media-out');
const cacheFile = path.join(rootDir, '.media-cache.json');
const enable2160Video = mediaLocalEnv.ENABLE_4K_VIDEO === 'true' || mediaLocalEnv.ENABLE_4K_VIDEO === '1';

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.webp', '.avif']);
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi']);
const TARGET_WIDTHS = [640, 1200, 1920, 2560, 3840];

const FOLDERS = ['home', 'creative-visuals', 'classic', 'onbody'];

function computeHash8(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex').slice(0, 8);
}

function loadCache() {
  if (fs.existsSync(cacheFile)) {
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

async function processImage(sourcePath, prefix, fileName, hash8, cache) {
  const cacheKey = `${prefix}/${fileName}`;
  const baseName = path.parse(fileName).name;
  const relFolder = `${prefix}/${baseName}.${hash8}`;
  const targetDir = path.join(outputDir, prefix, `${baseName}.${hash8}`);

  const meta = await sharp(sourcePath).metadata();
  const width = meta.width;
  const height = meta.height;

  // Determine widths <= source width (never upscale)
  let widths = TARGET_WIDTHS.filter(w => w <= width);
  if (widths.length === 0) {
    widths = [width];
  }

  // Check if cached and all output files exist
  if (cache[cacheKey] && cache[cacheKey].hash8 === hash8) {
    const allExist = widths.every(w => {
      return fs.existsSync(path.join(targetDir, `${w}.avif`)) &&
             fs.existsSync(path.join(targetDir, `${w}.webp`));
    });
    if (allExist) {
      console.log(`   ⏩ [CACHE] ${prefix}/${fileName}`);
      return cache[cacheKey].item;
    }
  }

  fs.mkdirSync(targetDir, { recursive: true });

  console.log(`   🎨 [IMAGE] ${prefix}/${fileName} (${width}x${height}) -> ${widths.join(', ')}px...`);

  // Generate tiny blurred placeholder (24px wide WebP)
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

  // Pick src (ideal 1920 or closest <= 1920, or highest)
  let srcWidth = widths.find(w => w === 1920) || widths.filter(w => w <= 1920).pop() || widths[0];
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
  return item;
}

async function processVideo(sourcePath, prefix, fileName, hash8, cache) {
  const cacheKey = `${prefix}/${fileName}`;
  const baseName = path.parse(fileName).name;
  const relFolder = `${prefix}/${baseName}.${hash8}`;
  const targetDir = path.join(outputDir, prefix, `${baseName}.${hash8}`);

  const probe = await probeVideo(sourcePath);
  const { width, height, fps, duration } = probe;

  // Check cache
  if (cache[cacheKey] && cache[cacheKey].hash8 === hash8) {
    const requiredFiles = ['1080.mp4', '720.mp4', 'poster.avif', 'poster.webp'];
    if (enable2160Video && height >= 2160) requiredFiles.push('2160.mp4');
    const allExist = requiredFiles.every(f => fs.existsSync(path.join(targetDir, f)));
    if (allExist) {
      console.log(`   ⏩ [CACHE] ${prefix}/${fileName}`);
      return cache[cacheKey].item;
    }
  }

  fs.mkdirSync(targetDir, { recursive: true });

  console.log(`   🎬 [VIDEO] ${prefix}/${fileName} (${width}x${height}, ${fps}fps, ${duration}s)...`);

  // Poster extraction at ~0.5s (or duration/2 if shorter)
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

  // Common ffmpeg filters: scale and cap fps at 30 if > 30
  function buildFilter(targetH) {
    let vf = `scale=-2:${targetH}`;
    if (fps > 30) {
      vf += ',fps=fps=30';
    }
    return vf;
  }

  // 1080p rendition (never upscale: if height < 1080, use height)
  let h1080 = Math.min(height, 1080);
  if (h1080 % 2 !== 0) h1080 -= 1;
  const out1080 = path.join(targetDir, '1080.mp4');
  console.log(`      -> Encoding 1080.mp4 (height ${h1080})...`);
  await execFileAsync('ffmpeg', [
    '-y',
    '-i', sourcePath,
    '-vf', buildFilter(h1080),
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '22',
    '-maxrate', '6M',
    '-bufsize', '12M',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
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

  // 720p rendition
  let h720 = Math.min(height, 720);
  if (h720 % 2 !== 0) h720 -= 1;
  const out720 = path.join(targetDir, '720.mp4');
  console.log(`      -> Encoding 720.mp4 (height ${h720})...`);
  await execFileAsync('ffmpeg', [
    '-y',
    '-i', sourcePath,
    '-vf', buildFilter(h720),
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '24',
    '-maxrate', '3M',
    '-bufsize', '6M',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
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

  // 2160p rendition (only if source >= 2160 and enabled)
  let fullRel = `${relFolder}/1080.mp4`;
  if (enable2160Video && height >= 2160) {
    const out2160 = path.join(targetDir, '2160.mp4');
    console.log(`      -> Encoding 2160.mp4...`);
    await execFileAsync('ffmpeg', [
      '-y',
      '-i', sourcePath,
      '-vf', buildFilter(2160),
      '-c:v', 'libx264',
      '-preset', 'slow',
      '-crf', '22',
      '-maxrate', '18M',
      '-bufsize', '36M',
      '-pix_fmt', 'yuv420p',
      '-profile:v', 'high',
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
  return item;
}

async function main() {
  console.log('====================================================');
  console.log(' Building optimized media assets for Cloudflare R2');
  console.log(` Source directory: ${baseSourceDir}`);
  console.log(` Output directory: ${outputDir}`);
  console.log('====================================================\n');

  if (!fs.existsSync(baseSourceDir)) {
    console.error(`❌ Source directory "${baseSourceDir}" does not exist. Run "npm run media:pull-drive" first.`);
    process.exit(1);
  }

  const cache = loadCache();
  const manifestsDir = path.join(outputDir, 'manifests');
  fs.mkdirSync(manifestsDir, { recursive: true });

  const existingFolders = fs.readdirSync(baseSourceDir).filter(name => {
    return fs.statSync(path.join(baseSourceDir, name)).isDirectory();
  });

  // Keep predictable order
  const foldersToProcess = [
    ...FOLDERS.filter(f => existingFolders.includes(f)),
    ...existingFolders.filter(f => !FOLDERS.includes(f))
  ];

  for (const prefix of foldersToProcess) {
    const folderPath = path.join(baseSourceDir, prefix);
    const files = fs.readdirSync(folderPath).filter(f => !f.startsWith('.'));

    // Natural numeric sorting (1, 2, ..., 9, 10, 11)
    files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    console.log(`\n📁 Processing folder "${prefix}" (${files.length} items)...`);
    const items = [];

    for (const fileName of files) {
      const filePath = path.join(folderPath, fileName);
      const ext = path.extname(fileName).toLowerCase();
      const hash8 = computeHash8(filePath);

      if (IMAGE_EXTS.has(ext)) {
        const item = await processImage(filePath, prefix, fileName, hash8, cache);
        items.push(item);
      } else if (VIDEO_EXTS.has(ext)) {
        const item = await processVideo(filePath, prefix, fileName, hash8, cache);
        items.push(item);
      } else {
        console.warn(`   ⚠️ Skipping unsupported file: ${fileName}`);
      }
    }

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

    const manifestPath = path.join(manifestsDir, `${prefix}.json`);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`   📄 Manifest written to: ${path.relative(rootDir, manifestPath)} (${items.length} items)`);
  }

  saveCache(cache);

  console.log('\n====================================================');
  console.log(' Build completed successfully!');
  console.log('====================================================\n');
}

main().catch(err => {
  console.error('Fatal error during media build:', err);
  process.exit(1);
});

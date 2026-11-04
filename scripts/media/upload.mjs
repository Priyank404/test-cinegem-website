import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  S3Client,
  HeadObjectCommand,
  PutBucketCorsCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import pLimit from 'p-limit';

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
const accountId = mediaLocalEnv.R2_ACCOUNT_ID;
const bucketName = mediaLocalEnv.R2_BUCKET;
const accessKeyId = mediaLocalEnv.R2_ACCESS_KEY_ID;
const secretAccessKey = mediaLocalEnv.R2_SECRET_ACCESS_KEY;
const isPrune = process.argv.includes('--prune');

const outputDir = path.join(rootDir, '.media-out');

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
      results.push({ fullPath, relKey: relKey.replace(/\\/g, '/') });
    }
  }
  return results;
}

async function configureCors(s3Client, bucket, origins) {
  console.log(`🌐 Configuring CORS policy on bucket "${bucket}"...`);
  const corsRules = [
    {
      AllowedOrigins: origins,
      AllowedMethods: ['GET', 'HEAD'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges', 'ETag'],
      MaxAgeSeconds: 86400
    }
  ];

  try {
    await s3Client.send(new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: { CORSRules: corsRules }
    }));
    console.log(`   ✅ CORS policy successfully applied for: ${origins.join(', ')}`);
  } catch (err) {
    console.warn(`   ⚠️ Could not apply CORS via API (${err.message}).`);
    console.log('   Please paste the following CORS configuration into Cloudflare R2:');
    console.log('   (Bucket -> Settings -> CORS Policy):\n');
    console.log(JSON.stringify(corsRules, null, 2));
    console.log('');
  }
}

async function pruneBucket(s3Client, bucket, activeKeys) {
  console.log('🧹 Checking for orphan objects to prune (--prune enabled)...');
  let continuationToken = undefined;
  const remoteKeys = [];

  do {
    const res = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken
    }));
    if (res.Contents) {
      for (const obj of res.Contents) {
        if (obj.Key) remoteKeys.push(obj.Key);
      }
    }
    continuationToken = res.NextContinuationToken;
  } while (continuationToken);

  const keysToDelete = remoteKeys.filter(k => !activeKeys.has(k));
  if (keysToDelete.length === 0) {
    console.log('   ✅ No orphan objects found in R2.');
    return;
  }

  console.log(`   Found ${keysToDelete.length} orphan objects in R2:`);
  for (const k of keysToDelete) {
    console.log(`     - [DELETE] ${k}`);
  }

  // Batch delete in chunks of 1000
  for (let i = 0; i < keysToDelete.length; i += 1000) {
    const chunk = keysToDelete.slice(i, i + 1000);
    await s3Client.send(new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: chunk.map(Key => ({ Key })) }
    }));
  }
  console.log(`   ✅ Pruned ${keysToDelete.length} objects.`);
}

async function main() {
  console.log('====================================================');
  console.log(' Uploading media to Cloudflare R2');
  console.log('====================================================\n');

  if (!accountId || !bucketName || !accessKeyId || !secretAccessKey) {
    console.error('❌ Missing R2 credentials in .env.media.local.');
    console.error('Please configure R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.');
    process.exit(1);
  }

  if (!fs.existsSync(outputDir)) {
    console.error(`❌ Output directory "${outputDir}" not found. Run "npm run media:build" first.`);
    process.exit(1);
  }

  const s3 = new S3Client({
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    region: 'auto',
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

  // Setup CORS
  const corsOrigins = mediaLocalEnv.CORS_ORIGINS
    ? mediaLocalEnv.CORS_ORIGINS.split(',').map(s => s.trim())
    : ['http://localhost:5173'];
  await configureCors(s3, bucketName, corsOrigins);

  const allFiles = getAllFiles(outputDir);
  const mediaFiles = allFiles.filter(f => !f.relKey.startsWith('manifests/'));
  const manifestFiles = allFiles.filter(f => f.relKey.startsWith('manifests/'));

  console.log(`📦 Found ${mediaFiles.length} media files and ${manifestFiles.length} manifest files to sync.\n`);

  const limit = pLimit(6);
  let uploadedCount = 0;
  let skippedCount = 0;

  async function uploadFile(fileObj, isManifest = false) {
    const key = fileObj.relKey;
    const filePath = fileObj.fullPath;
    const contentType = getContentType(filePath);
    const cacheControl = isManifest
      ? 'public, max-age=300, stale-while-revalidate=86400'
      : 'public, max-age=31536000, immutable';

    // Content-hashed media files can be skipped if already in R2
    if (!isManifest) {
      try {
        await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
        skippedCount++;
        return;
      } catch {
        // Does not exist, proceed to upload
      }
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
    uploadedCount++;
    console.log(`   ⬆️ [UPLOADED] ${key} (${contentType})`);
  }

  // 1. Upload media files first
  console.log('🚀 Phase 3A: Uploading immutable media assets...');
  await Promise.all(mediaFiles.map(f => limit(() => uploadFile(f, false))));

  // 2. Upload manifests LAST
  console.log('\n📄 Phase 3B: Uploading manifests...');
  await Promise.all(manifestFiles.map(f => limit(() => uploadFile(f, true))));

  console.log('\n====================================================');
  console.log(` Sync complete! Uploaded: ${uploadedCount}, Skipped: ${skippedCount}`);
  console.log('====================================================\n');

  if (isPrune) {
    const activeKeys = new Set(allFiles.map(f => f.relKey));
    await pruneBucket(s3, bucketName, activeKeys);
  }
}

main().catch(err => {
  console.error('Fatal error during R2 upload:', err);
  process.exit(1);
});


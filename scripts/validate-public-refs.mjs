// scripts/validate-public-refs.mjs
// Validates that all static asset paths referenced in src/ exist in public/

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const publicDir = path.join(rootDir, "public");

// Extensions to check
const codeExts = [".js", ".jsx", ".ts", ".tsx", ".html", ".css"];
// Asset file extensions
const assetExtPattern = /\.(png|jpe?g|webp|gif|svg|ico|glb|gltf|bin|wasm|hdr|exr|mp4|webm|woff2?|ttf|otf|json)$/i;

const missingRefs = [];
const scannedFiles = [];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (codeExts.includes(path.extname(entry.name).toLowerCase())) {
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath) {
  scannedFiles.push(filePath);
  const rawContent = fs.readFileSync(filePath, "utf8");
  // Strip comments so example strings in comments don't trigger false positives
  const content = rawContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");

  // Match quoted strings like "/something.ext" or "/models/..."
  const regex = /["'`](\/([a-zA-Z0-9_\-\.\/]+))["'`]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const assetPath = match[1];

    // Skip router routes (e.g. /creative-visuals, /about, /faq, /)
    if (!assetExtPattern.test(assetPath) && !assetPath.startsWith("/draco/") && !assetPath.startsWith("/models/")) {
      continue;
    }

    // Skip API routes or dynamic URLs
    if (assetPath.startsWith("/api/")) continue;

    // Check against public directory
    const cleanPath = assetPath.startsWith("/") ? assetPath.slice(1) : assetPath;
    const targetPath = path.join(publicDir, cleanPath);

    // If it's a directory like /draco/
    if (cleanPath.endsWith("/")) {
      if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) {
        missingRefs.push({
          file: path.relative(rootDir, filePath),
          ref: assetPath,
          resolved: path.relative(rootDir, targetPath),
        });
      }
      continue;
    }

    if (!fs.existsSync(targetPath)) {
      missingRefs.push({
        file: path.relative(rootDir, filePath),
        ref: assetPath,
        resolved: path.relative(rootDir, targetPath),
      });
    }
  }
}

console.log("🔍 Scanning src/ for public asset references...");
scanDir(srcDir);

if (missingRefs.length > 0) {
  console.error(`\n❌ Found ${missingRefs.length} broken public asset references:`);
  for (const item of missingRefs) {
    console.error(`  - In ${item.file}: '${item.ref}' -> Missing file: ${item.resolved}`);
  }
  process.exit(1);
} else {
  console.log(`✅ All public asset references in ${scannedFiles.length} files exist on disk!`);
  process.exit(0);
}

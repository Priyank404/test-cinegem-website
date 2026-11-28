import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  collectProtectedAssets,
  getVaultKeyBytes,
} from "./asset-vault-config.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const distDir = path.join(rootDir, "dist");
const vaultOutDir = path.join(distDir, "assets", "v");

if (!fs.existsSync(distDir)) {
  console.error("[protect-assets] Error: dist/ does not exist. Run vite build first.");
  process.exit(1);
}

const keyBytes = getVaultKeyBytes();
const assets = collectProtectedAssets(publicDir);

fs.mkdirSync(vaultOutDir, { recursive: true });

let totalBytes = 0;
for (const asset of assets) {
  const raw = fs.readFileSync(asset.fullPath);
  const len = raw.length;
  const seed = asset.seed;

  // 12-byte custom header: "CGEM" (4) + origLen uint32LE (4) + seed uint32LE (4)
  const out = Buffer.allocUnsafe(12 + len);
  out[0] = 0x43; // C
  out[1] = 0x47; // G
  out[2] = 0x45; // E
  out[3] = 0x4d; // M
  out.writeUInt32LE(len >>> 0, 4);
  out.writeUInt32LE(seed >>> 0, 8);

  const shift = seed & 0x1f;
  for (let i = 0; i < len; i++) {
    const k = keyBytes[(i + seed) & 31];
    const m = (Math.imul(i, 131) + seed) & 0xff;
    out[12 + i] = ((raw[i] ^ k ^ m) + shift) & 0xff;
  }

  const outPath = path.join(vaultOutDir, asset.vaultFileName);
  fs.writeFileSync(outPath, out);
  totalBytes += out.length;
}

// Remove raw unencrypted models/ and hdr/ directories from dist/ so they are never deployed
for (const dirName of ["models", "hdr"]) {
  const distSubDir = path.join(distDir, dirName);
  if (fs.existsSync(distSubDir)) {
    fs.rmSync(distSubDir, { recursive: true, force: true });
    console.log(`[protect-assets] Removed raw dist/${dirName}/`);
  }
}

console.log(
  `[protect-assets] Encrypted ${assets.length} 3D/HDR assets into dist/assets/v/ (${(
    totalBytes /
    (1024 * 1024)
  ).toFixed(2)} MB)`
);

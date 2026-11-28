import fs from "fs";
import path from "path";
import crypto from "crypto";

// Deterministic 32-byte key derived at build time (shared between protect-assets.mjs and Vite build)
// Using a fixed build seed per release or env var keeps client/server in sync.
export const VAULT_KEY_HEX =
  process.env.VITE_VAULT_KEY ||
  "7c9e2a4b8f1d6035e8a2c4f791b3d5e06a8c1e3f5b7d9024a6c8e0f1b3d5a792";

export function getVaultKeyBytes() {
  return Buffer.from(VAULT_KEY_HEX, "hex");
}

export function hashAssetPath(relPath) {
  return crypto
    .createHash("sha256")
    .update(`cgem-vault-v1:${relPath}`)
    .digest("hex")
    .slice(0, 12);
}

export function getSeedFromPath(relPath) {
  const digest = crypto.createHash("md5").update(relPath).digest();
  return digest.readUInt32LE(0);
}

const PROTECTED_DIRS = ["models", "hdr"];
const PROTECTED_EXTS = new Set([".glb", ".gltf", ".hdr", ".exr"]);

export function collectProtectedAssets(publicDir) {
  const results = [];

  for (const dirName of PROTECTED_DIRS) {
    const baseDir = path.join(publicDir, dirName);
    if (!fs.existsSync(baseDir)) continue;

    const walk = (currentDir) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          // Skip backup directories
          if (entry.name.toLowerCase() === "backup") continue;
          walk(fullPath);
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (PROTECTED_EXTS.has(ext)) {
            const relUnix = "/" + path.relative(publicDir, fullPath).replace(/\\/g, "/");
            const hash = hashAssetPath(relUnix);
            results.push({
              relPath: relUnix,
              fullPath,
              vaultRelPath: `/assets/v/${hash}.bin`,
              vaultFileName: `${hash}.bin`,
              seed: getSeedFromPath(relUnix),
            });
          }
        }
      }
    };

    walk(baseDir);
  }

  return results;
}

export function getAssetVaultMap(publicDir) {
  const assets = collectProtectedAssets(publicDir);
  const map = {};
  for (const item of assets) {
    map[item.relPath] = item.vaultRelPath;
  }
  return map;
}

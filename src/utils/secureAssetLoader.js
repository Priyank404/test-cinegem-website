/* global __ASSET_VAULT_MAP__, __ASSET_VAULT_KEY__ */

function getVaultMap() {
  try {
    return typeof __ASSET_VAULT_MAP__ !== "undefined" ? __ASSET_VAULT_MAP__ : {};
  } catch {
    return {};
  }
}

function getKeyBytes() {
  const hex =
    typeof __ASSET_VAULT_KEY__ !== "undefined"
      ? __ASSET_VAULT_KEY__
      : "7c9e2a4b8f1d6035e8a2c4f791b3d5e06a8c1e3f5b7d9024a6c8e0f1b3d5a792";
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Resolves a public asset URL (e.g. "/models/ring-draco.glb?v=quality")
 * to its obfuscated production vault URL if present in the build manifest.
 */
export function resolveVaultUrl(url) {
  if (!url || typeof url !== "string") {
    return { fetchUrl: url, isVaulted: false };
  }
  if (url.startsWith("blob:") || url.startsWith("data:") || url.startsWith("http")) {
    return { fetchUrl: url, isVaulted: false };
  }
  const cleanPath = url.split("?")[0].split("#")[0];
  const map = getVaultMap();
  if (map && map[cleanPath]) {
    return { fetchUrl: map[cleanPath], isVaulted: true };
  }
  return { fetchUrl: url, isVaulted: false };
}

/**
 * Unscrambles a CGEM-encoded ArrayBuffer back into the original binary asset.
 */
export function unscrambleBuffer(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  if (
    bytes.length < 12 ||
    bytes[0] !== 0x43 ||
    bytes[1] !== 0x47 ||
    bytes[2] !== 0x45 ||
    bytes[3] !== 0x4d
  ) {
    return arrayBuffer;
  }

  const view = new DataView(arrayBuffer);
  const origLen = view.getUint32(4, true);
  const seed = view.getUint32(8, true);

  if (12 + origLen > bytes.length) {
    return arrayBuffer;
  }

  const keyBytes = getKeyBytes();
  const out = new Uint8Array(origLen);
  const shift = seed & 0x1f;

  for (let i = 0; i < origLen; i++) {
    const k = keyBytes[(i + seed) & 31];
    const m = (Math.imul(i, 131) + seed) & 0xff;
    const b = (bytes[12 + i] - shift) & 0xff;
    out[i] = b ^ k ^ m;
  }

  return out.buffer;
}

/**
 * Fetches an asset via XHR (preserving Three.js progress events) and unscrambles if vaulted.
 */
export function fetchUnscrambledBuffer(fetchUrl, isVaulted, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", fetchUrl, true);
    xhr.responseType = "arraybuffer";

    if (onProgress) {
      xhr.onprogress = (event) => {
        onProgress(event);
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
        try {
          const buf = isVaulted ? unscrambleBuffer(xhr.response) : xhr.response;
          resolve(buf);
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error(`HTTP ${xhr.status} loading ${fetchUrl}`));
      }
    };

    xhr.onerror = () => reject(new Error(`Network error loading ${fetchUrl}`));
    xhr.send(null);
  });
}

/**
 * Loads a GLTF/GLB via GLTFLoader, automatically decrypting vaulted binary assets in memory.
 */
export function loadSecureGLTF(gltfLoader, url, onLoad, onProgress, onError) {
  const { fetchUrl, isVaulted } = resolveVaultUrl(url);
  if (!isVaulted) {
    gltfLoader.load(url, onLoad, onProgress, onError);
    return;
  }

  fetchUnscrambledBuffer(fetchUrl, true, onProgress)
    .then((buffer) => {
      gltfLoader.parse(buffer, "", onLoad, onError);
    })
    .catch((err) => {
      if (onError) onError(err);
    });
}

/**
 * Loads an HDR or EXR via RGBELoader / EXRLoader, decrypting vaulted assets into a
 * short-lived Blob URL that is immediately revoked once parsed.
 */
export function loadSecureEnv(loader, url, onLoad, onProgress, onError) {
  const { fetchUrl, isVaulted } = resolveVaultUrl(url);
  if (!isVaulted) {
    loader.load(url, onLoad, onProgress, onError);
    return;
  }

  fetchUnscrambledBuffer(fetchUrl, true, onProgress)
    .then((buffer) => {
      const blobUrl = URL.createObjectURL(
        new Blob([buffer], { type: "application/octet-stream" })
      );
      loader.load(
        blobUrl,
        (texture) => {
          URL.revokeObjectURL(blobUrl);
          onLoad(texture);
        },
        undefined,
        (err) => {
          URL.revokeObjectURL(blobUrl);
          if (onError) onError(err);
        }
      );
    })
    .catch((err) => {
      if (onError) onError(err);
    });
}

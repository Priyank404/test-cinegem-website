import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

/**
 * Checks whether a given URL or data string represents an EXR file.
 */
export function isExrUrl(url) {
  if (!url || typeof url !== "string") return false;
  const lower = url.toLowerCase();
  return (
    lower.includes(".exr") ||
    lower.includes("image/x-exr") ||
    lower.includes("format=exr")
  );
}

/**
 * Loads an HDR or EXR environment map and processes it through Three.js PMREMGenerator
 * so that it is formatted as a CubeUV texture ready for rough refraction / reflection shaders.
 *
 * @param {string} url - HTTP/Blob URL pointing to an .hdr or .exr image
 * @param {THREE.PMREMGenerator} pmrem - Pre-allocated PMREMGenerator
 * @param {Function} [onProgress] - Progress callback (xhr) => void
 * @param {string} [formatHint] - Optional 'exr' | 'hdr' hint for blob URLs
 * @returns {Promise<THREE.Texture>} CubeUV PMREM texture
 */
export function loadEnvironmentTexture(url, pmrem, onProgress, formatHint) {
  if (!url) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const isExr = formatHint === "exr" || isExrUrl(url);
    const loader = isExr ? new EXRLoader() : new RGBELoader();

    if (isExr && loader.setDataType) {
      loader.setDataType(THREE.HalfFloatType);
    }

    loader.load(
      url,
      (texture) => {
        try {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          const envRT = pmrem.fromEquirectangular(texture);
          texture.dispose();
          resolve(envRT.texture);
        } catch (err) {
          reject(new Error(`Failed to generate PMREM from "${url}": ${err?.message || err}`));
        }
      },
      onProgress,
      (err) => {
        reject(
          new Error(
            `Failed to load environment texture at "${url}". Check that the file exists and is a valid ${
              isExr ? "EXR" : "HDR"
            } file. (Original error: ${err?.message || err})`
          )
        );
      }
    );
  });
}/**
 * Loads an HDR or EXR environment map as a raw equirectangular texture (sampler2D),
 * preserving pinpoint resolution without PMREM downsampling/blurring.
 *
 * Used for Octane dual-EXR diamond environment mapping (Base and Spotlight EXRs).
 *
 * @param {string} url - HTTP or Blob URL pointing to an .hdr or .exr image
 * @param {object} [options]
 * @param {boolean} [options.mono=true] - If true, loads as single-channel (RedFormat) half float to save memory (~1/4 RAM)
 * @param {string} [options.formatHint] - Optional 'exr' | 'hdr' hint
 * @param {Function} [options.onProgress] - Progress callback
 * @returns {Promise<{ texture: THREE.Texture, meta: object }>}
 */
export function loadRawEquirect(
  url,
  { mono = true, formatHint = null, fileName = null, onProgress = null } = {}
) {
  if (!url) return Promise.resolve({ texture: null, meta: null });

  return new Promise((resolve, reject) => {
    const isExr = formatHint === "exr" || isExrUrl(url);
    const loader = isExr ? new EXRLoader() : new RGBELoader();

    if (isExr) {
      if (loader.setDataType) loader.setDataType(THREE.HalfFloatType);
      loader.outputFormat = mono ? THREE.RedFormat : THREE.RGBAFormat;
    } else {
      if (loader.setDataType) loader.setDataType(THREE.HalfFloatType);
    }

    loader.load(
      url,
      (loadedTexture) => {
        try {
          let texture = loadedTexture;
          const width = texture.image?.width || 0;
          const height = texture.image?.height || 0;

          // If .hdr was loaded and mono is requested, pack RGBA half-float data to single-channel RedFormat
          if (!isExr && mono && texture.image?.data) {
            const srcData = texture.image.data;
            const pixelCount = width * height;
            const monoData = new Uint16Array(pixelCount);
            for (let i = 0; i < pixelCount; i++) {
              monoData[i] = srcData[i * 4];
            }
            const oldTex = texture;
            texture = new THREE.DataTexture(
              monoData,
              width,
              height,
              THREE.RedFormat,
              THREE.HalfFloatType
            );
            oldTex.dispose();
          }

          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = true;
          texture.colorSpace = THREE.NoColorSpace;
          texture.needsUpdate = true;

          const channels = mono ? 1 : 4;
          const bytesPerPixel = channels * 2; // Half float is 2 bytes/channel
          const totalBytes = width * height * bytesPerPixel * 1.333; // ~1.333x for mipmaps
          const approxMB = (totalBytes / (1024 * 1024)).toFixed(1);

          let resolvedName = fileName;
          if (!resolvedName) {
            try {
              const cleanUrl = url.split("?")[0].split("#")[0];
              resolvedName = cleanUrl.substring(cleanUrl.lastIndexOf("/") + 1) || "custom";
            } catch {
              resolvedName = "custom";
            }
          }

          const meta = {
            name: resolvedName,
            width,
            height,
            channels: mono ? "1 (Mono / Red)" : "4 (RGBA)",
            format: isExr ? "EXR (16-bit Float)" : "HDR (RGBE Float)",
            approxMB: `${approxMB} MB`,
            isMono: mono,
          };

          resolve({ texture, meta });
        } catch (err) {
          reject(new Error(`Failed to configure raw equirect texture "${url}": ${err?.message || err}`));
        }
      },
      onProgress,
      (err) => {
        const rawErrMsg = err?.message || String(err || "");
        let userMsg = `Failed to load ${isExr ? "EXR" : "HDR"} at "${url}".`;
        if (rawErrMsg.toLowerCase().includes("unsupported data channels")) {
          userMsg += " Unsupported data channels (file may contain only an R channel; consider re-exporting as Y or RGB).";
        } else {
          userMsg += ` (Original error: ${rawErrMsg})`;
        }
        reject(new Error(userMsg));
      }
    );
  });
}

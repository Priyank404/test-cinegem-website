/**
 * skinMaterial.js
 * -------------------------------------------------------------------------
 * Procedural "real-looking" skin material for the hand GLB (which ships
 * with no baked texture — just a flat white PBR slot). Built entirely from
 * MeshPhysicalMaterial params + a tiny generated micro-detail/pore texture,
 * so nothing external is required by default.
 *
 * If you later want to swap in a photographed/scanned skin texture, pass
 * `textureUrl` (and optionally `normalUrl` / `roughnessUrl`) — this module
 * will load and use them instead of the generated fallback, same UV set,
 * no other code changes required.
 * -------------------------------------------------------------------------
 */

import * as THREE from "three";

// ---------------------------------------------------------------------------
// Generated fallback maps
// ---------------------------------------------------------------------------
// A small canvas-painted mottled tone map (freckling/warmth variation) and
// a matching roughness map (pores read slightly rougher than surrounding
// skin). Cheap to generate, tiles fine at hand scale, and avoids needing to
// ship/host a real texture file just to not look like a plastic mannequin.

function makeSkinTonalCanvas(size, baseColor) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  const base = new THREE.Color(baseColor);
  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, size, size);

  // Soft warm/cool blotches — the low-frequency variation real skin has
  // (veins, warmer knuckles, cooler fingertip pads) rather than a flat tint.
  const blotchCount = 90;
  for (let i = 0; i < blotchCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = size * (0.03 + Math.random() * 0.09);
    const warm = Math.random() > 0.5;
    const tint = warm ? "rgba(200,110,90,0.05)" : "rgba(140,120,150,0.045)";
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, tint);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine pore/freckle speckle — high-frequency noise so the surface isn't
  // perfectly smooth under close camera moves.
  const speckleCount = size * size * 0.02;
  for (let i = 0; i < speckleCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const shade = Math.random() > 0.5 ? "rgba(90,50,40,0.05)" : "rgba(255,235,220,0.04)";
    ctx.fillStyle = shade;
    ctx.fillRect(x, y, 1, 1);
  }

  return canvas;
}

function makeSkinRoughnessCanvas(size) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Base mid-gray roughness (~0.45 in linear terms once read as a map),
  // then speckled pores that read rougher (brighter) than surrounding skin.
  ctx.fillStyle = "#8f8f8f";
  ctx.fillRect(0, 0, size, size);

  const poreCount = size * size * 0.03;
  for (let i = 0; i < poreCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 150 + Math.floor(Math.random() * 80);
    ctx.fillStyle = `rgba(${v},${v},${v},0.5)`;
    ctx.beginPath();
    ctx.arc(x, y, Math.random() * 1.4 + 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

function makeSkinNormalCanvas(size) {
  // Very subtle bumpiness baked directly as a normal map (flat blue-ish
  // base + faint randomized tilts) — cheap stand-in for pore/wrinkle detail
  // without needing a real height-map bake.
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#8080ff";
  ctx.fillRect(0, 0, size, size);

  const bumps = size * size * 0.015;
  for (let i = 0; i < bumps; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 1.6 + 0.4;
    const dx = 128 + (Math.random() - 0.5) * 40;
    const dy = 128 + (Math.random() - 0.5) * 40;
    ctx.fillStyle = `rgb(${dx | 0},${dy | 0},255)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

let _cachedFallbackTextures = null;
function getFallbackTextures(renderer, baseColor) {
  if (_cachedFallbackTextures) return _cachedFallbackTextures;

  const size = 512;
  const map = new THREE.CanvasTexture(makeSkinTonalCanvas(size, baseColor));
  const roughnessMap = new THREE.CanvasTexture(makeSkinRoughnessCanvas(size));
  const normalMap = new THREE.CanvasTexture(makeSkinNormalCanvas(size));

  [map, roughnessMap, normalMap].forEach((tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = tex === map ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.needsUpdate = true;
  });

  _cachedFallbackTextures = { map, roughnessMap, normalMap };
  return _cachedFallbackTextures;
}

/**
 * buildSkinMaterial
 * -------------------------------------------------------------------------
 * @param {THREE.WebGLRenderer} renderer   used only to size the canvas maps sensibly
 * @param {object} opts
 *   - textureUrl / normalUrl / roughnessUrl: optional real texture overrides
 *   - skinTone: hex base color, default a warm mid tone
 *   - envMap: shared scene env map for reflections
 *   - envMapIntensity
 *
 * Returns { material, applyTextureOverride(loader, urls) } so RingHero can
 * swap in real textures later via a prop without rebuilding the material
 * instance (which would otherwise fight the scroll-driven envMapIntensity
 * ticker's live reference).
 */
export function buildSkinMaterial({
  renderer,
  textureUrl = null,
  normalUrl = null,
  roughnessUrl = null,
  skinTone = 0xe8b898,
  envMap = null,
  envMapIntensity = 1.1,
} = {}) {
  const fallback = getFallbackTextures(renderer, skinTone);

  const material = new THREE.MeshPhysicalMaterial({
    name: "hand-skin",
    color: new THREE.Color(skinTone),
    map: fallback.map,
    roughnessMap: fallback.roughnessMap,
    normalMap: fallback.normalMap,
    normalScale: new THREE.Vector2(0.4, 0.4),
    roughness: 0.55,
    metalness: 0.0,
    // Subsurface-ish softness: a touch of sheen + clearcoat reads as the
    // thin oily/moist top layer of real skin rather than flat plastic.
    sheen: 0.35,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color(0xffddc7),
    clearcoat: 0.06,
    clearcoatRoughness: 0.6,
    envMap,
    envMapIntensity,
    side: THREE.FrontSide,
  });

  // Swap in real texture(s) later (e.g. once the user has an actual scan/
  // photo texture) without touching the rest of RingHero's material wiring.
  function applyTextureOverride(loaderManagerUrls) {
    const { textureUrl: tUrl, normalUrl: nUrl, roughnessUrl: rUrl } = loaderManagerUrls || {};
    const loader = new THREE.TextureLoader();

    if (tUrl) {
      loader.load(tUrl, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        material.map = tex;
        material.needsUpdate = true;
      });
    }
    if (nUrl) {
      loader.load(nUrl, (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        material.normalMap = tex;
        material.needsUpdate = true;
      });
    }
    if (rUrl) {
      loader.load(rUrl, (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        material.roughnessMap = tex;
        material.needsUpdate = true;
      });
    }
  }

  // Apply immediately if URLs were passed at construction time.
  if (textureUrl || normalUrl || roughnessUrl) {
    applyTextureOverride({ textureUrl, normalUrl, roughnessUrl });
  }

  return { material, applyTextureOverride };
}

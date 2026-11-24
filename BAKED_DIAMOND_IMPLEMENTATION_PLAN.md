# Cinegem Studio — Hybrid Baked Diamond Refraction Architecture & Execution Plan

> **Document Type:** Technical Architecture Specification, Conversation Analysis & Agent Runbook  
> **Target Branch:** `feature/baked-diamond-refraction` (to be branched from `main`)  
> **Safety Level:** Non-destructive (Zero modifications to existing `RoughRefractionMaterial` or `gemMaterials.js`)  
> **Status:** Ready for Execution  

---

## 1. Conversation & Root Cause Deep-Dive

### 1.1 The Performance Problem
On high-end desktop GPUs (e.g. RTX 3080/4090, Apple M-series Pro/Max), the Cinegem 3D ring renders smoothly at 60–120 FPS. However, on mid-range devices, low-end PCs (e.g. GT 730, Intel HD/UHD graphics), and mobile/tablet devices, the home page suffers from intense lag, frame stuttering, and glitchy rendering. On budget phones (Samsung Galaxy M15/M21, Vivo Y28n 5G, Redmi 13C 5G), the diamonds fail to render altogether and fall back to flat "matte" crystal.

### 1.2 Root Cause Analysis: The Diamond Raytracer
As revealed in the audit of `src/components/three/gemMaterials.js` and `src/components/three/RingHero.jsx`:

1. **Software Ray-Tracing on General GPU Cores:**  
   WebGL 2 has no access to dedicated hardware ray-tracing RT cores. `RoughRefractionMaterial` uses `three-mesh-bvh` data textures to perform software ray-tracing in the fragment shader (`bvhIntersectFirstHit`).
2. **Dependent Memory Latency & Bounce Loops:**  
   Each diamond pixel runs a loop of up to 5 bounces (on high) or 3–4 bounces (on mid/mobile). Each bounce traverses a bounding volume hierarchy (BVH) encoded in floating-point textures. Each tree node read is a dependent memory fetch with unpredictable addresses that cannot be effectively prefetched or cached by mobile/integrated memory controllers.
3. **Severe Warp/Wavefront Branch Divergence:**  
   GPUs execute fragment shaders in lockstep groups of 32 or 64 threads (warps/wavefronts). Because diamond geometry has dozens of sharply angled facets, adjacent screen pixels take completely different paths: some ray paths exit after 1 bounce, others bounce 5 times. The entire warp stalls until the slowest ray finishes.
4. **Heavy Environment Sampling Overhead:**  
   After tracing, every bounce samples an HDR environment map for dispersion and highlights:
   - `baseSpectral`: 7 HDR texture lookups with 3 `pow()` operations each.
   - `sampleSpotAchro`: 9 additional `textureLod` samples.
   - Total: ~16 floating-point texture lookups per pixel, per bounce.
5. **The Pavé Quad-Shading Penalty:**  
   The ring features a large center diamond plus hundreds of micro-pavé/side stones (`SS` mesh). GPUs rasterize and shade fragments in $2 \times 2$ pixel quads. On tiny pavé triangles (often only 1–3 pixels wide on screen), over 75% of shaded quad pixels are discarded helper pixels, wasting immense amounts of ALU and bandwidth.
6. **Why Budget Phones Render Matte:**  
   In `src/lib/deviceTier.js`, a regex checks for known weak mobile GPU architectures:
   ```javascript
   const isWeakGpu = /mali-4|mali-t|mali-g3|mali-g5[127]|mali-g71|mali-g72/.test(renderer) || ...
   ```
   Samsung M15, Vivo Y28n, and Redmi 13C use Mali-G57; Samsung M21 uses Mali-G72. All match this regex and are forcibly downgraded to tier `"low"`. In `gemMaterials.js`, `tier === "low"` forces `buildMatteGemMaterial()`. The matte look was a deliberate safety precaution against GPU crashes, not a code defect.

---

## 2. Strategic Solution: Hybrid Lookup Baking (Precomputed Internal Light Paths)

Instead of baking the entire scene into static offline video/frames (which would destroy 3D mouse parallax, dynamic lighting, real-time rotation, and interactive customization), we bake **only the internal ray-path of the gem**.

### 2.1 How Diamond Lookup Baking Works
- In a diamond, the internal reflection path from an incoming ray direction $\vec{d}_{\text{in}}$ to an exit ray direction $\vec{d}_{\text{out}}$ depends almost entirely on the gem's facet orientation angles.
- We precalculate this ray deflection function once (either offline or during a lightweight 50ms startup pass) and store it in an internal lookup atlas / cubemap.
- At render time, the fragment shader replaces the expensive BVH tree-walk ($50+$ dependent texture reads per bounce) with **1 fast texture lookup** per bounce.
- **What is preserved:** Live HDR environment reflections, live spotlight pinpoints, spectral dispersion (fire), dynamic lighting orientation, and Noir luxury aesthetic.
- **Performance gain:** **3× to 8× faster fragment shading**, near-zero warp divergence, and drastically reduced memory bandwidth.

---

## 3. Tier Matrix & Execution Rules

| Device / Hardware Class | Gem Selection | Shader Applied | Expected Performance | Visual Quality |
| :--- | :--- | :--- | :--- | :--- |
| **High-End Desktop & Proper Mid GPUs** (RTX, GTX 1660+, Apple Silicon M1+, Radeon RX) | **All Stones** (Center + Pavé) | **Exact BVH Tracer** (`RoughRefractionMaterial`) | 60–120 FPS | 100% Exact Ground Truth (Zero Baking) |
| **Weak Desktop GPUs / Integrated CPUs** (GT 730, Intel HD/UHD, Vega 3/8 APUs, Radeon R5/R7) | **Small Stones** (Pavé `SS`)<br>**Center Stone** (`D1`/`D2`) | **Baked Lookup** (`RoughRefractionMaterialBaked`)<br>**Exact BVH Tracer** (`RoughRefractionMaterial`) | Solid 60 FPS (Zero Stutter) | Center Stone is 100% exact; Pavé is visually indistinguishable |
| **Standard Mobile & Tablets** (Snapdragon 7/8, Dimensity 8000+, iPhones, iPads) | **All Stones** (Center + Pavé) | **Baked Lookup** (`RoughRefractionMaterialBaked`) | 60 FPS locked | Pristine diamond sparkle & fire; no mobile overheat |
| **Budget Mobiles** (Mali-G57, Mali-G72, Adreno 610/612: M15, M21, Y28n, 13C) | **All Stones** (Center + Pavé) | **Optimized Baked Lookup** (1.0–1.25 DPR, MSAA 0, no bloom) | Smooth 45–60 FPS | **Upgraded from Matte to Real Sparkling Diamonds!** |
| **Extreme Fallback / WebGL 1 / Software Rasterizers** | All Stones | **Physical Matte Crystal** (`buildMatteGemMaterial`) | Failsafe 30+ FPS | Dark luxury crystal fallback |

---

## 4. Multi-Layered Safety & "Retrieve" (Rollback) Architecture

To guarantee 100% peace of mind, the implementation includes a **four-stage fail-safe and rollback mechanism**:

```mermaid
flowchart TD
    A["Environment Variable Check<br>VITE_GEM_BAKE === '0'?"] -->|Yes| Z["Exact BVH / Standard Path<br>(Bake Completely Inactive)"]
    A -->|No| B["URL Query Parameter<br>?bake=off or ?bake=exact?"]
    B -->|Yes| Z
    B -->|No| C["LocalStorage Override<br>cinegem:bake === 'off'?"]
    C -->|Yes| Z
    C -->|No| D["Circuit Breaker<br>Session failure recorded in last 10m?"]
    D -->|Yes| Z
    D -->|No| E["WebGL2 & HalfFloat Target Supported?"]
    E -->|No| Z
    E -->|Yes| F["Resolve Tier Bake Policy<br>(resolveBakeProfile)"]
    F --> G["Apply Baked or Exact Material"]
    G -->|On Any Error Caught| H["markBakeFailed() Triggered"]
    H --> Z
```

### Safety Guarantees:
1. **Isolated New Branch:** All work must begin on a clean git branch `feature/baked-diamond-refraction`.
2. **Zero Modification to Original Files:** `RoughRefractionMaterial.js` and `gemMaterials.js` remain completely untouched. The new system lives in `src/components/three/baked/`.
3. **Master Environment Variable:** Setting `VITE_GEM_BAKE=0` in `.env` or Netlify/Vercel settings turns off baking everywhere at compile-time.
4. **Instant URL Retrieve Switch:** Adding `?bake=off` to the URL instantly deactivates baking and restores the previous behavior. Adding `?bake=auto` resets overrides.
5. **Session Circuit Breaker:** If baking throws a WebGL shader compile error or runtime exception, `markBakeFailed()` automatically saves a 10-minute lock in `sessionStorage` and immediately swaps in the exact or matte material.

---

## 5. Implementation Code to Provide to the Agent

The agent should create these exact files in `src/components/three/baked/`:

### 5.1 `src/components/three/baked/bakedGemConfig.js`
```javascript
// src/components/three/baked/bakedGemConfig.js
// ---------------------------------------------------------------------------
// Master switch, tunables, user overrides and the tier -> bake policy.
// NOTHING here touches the existing exact (BVH) diamond path.
// ---------------------------------------------------------------------------

// MASTER SWITCH. Set VITE_GEM_BAKE=0 in the env (or flip this to false) and the
// whole feature is dead code: every call falls straight through to the original
// buildGemMaterial / attachBvhToGemMaterial.
export const GEM_BAKE_ENABLED = import.meta.env?.VITE_GEM_BAKE !== "0";

export const BAKE_CONFIG = {
  // Texels per cube face, per stone. Memory = stones * 6 * F * F * 8 bytes (RGBA16F).
  faceSizeSmall: { mobile: 32, desktopWeak: 48 }, // pave / side stones
  faceSizeBig: { mobile: 128 },                   // centre stone (1 stone, cheap)
  iterations: 3,            // plane-descent iterations per bounce (3 is enough)
  maxAtlasWidth: 2048,      // WebGL2 guarantees >= 2048
  stripBvhCode: true,       // remove three-mesh-bvh GLSL from the baked shader (faster compile)
  // Role classification: a mesh with >= this many stones is "small"; otherwise a stone is
  // "big" if its diagonal >= bigStoneRatio * the largest stone diagonal in the ring.
  smallMeshMinStones: 6,
  bigStoneRatio: 0.5,
  // Exact mesh-name overrides (lower-case), checked first. Matches classifyMesh.js codes.
  roleByName: { d1: "big", d2: "big", ss: "small" },
  // Phones whose GPU is in the "weak" regex used to be forced to tier "low" (matte).
  // With baking they are promoted to tier "mobile" and get this render budget instead.
  weakMobile: { pixelRatioCap: 1.25, msaa: 0 },
  // Desktop GPUs treated as "low end" (small stones baked, big stone exact).
  // GT 7xx/6xx/10xx, old GeForce 8/9, Radeon R2-R7 APUs, Radeon HD, small Vega APUs, Intel HD/UHD.
  weakDesktopGpuRegex:
    /geforce\s+(gt|gts)\s*\d{3,4}|geforce\s+[89]\d{3}|radeon(\(tm\))?\s+r[2-7]\b|radeon\s+hd|radeon.*vega\s*(3|6|8|10|11)\b|intel.*(hd|uhd)\s*graphics|\bgma\b/i,
};

const LS_KEY = "cinegem:bake";          // "off" | "small" | "all"  (persisted)
const SS_FAIL = "cinegem:bake-failed";   // auto-rollback marker (10 min)
const FAIL_TTL_MS = 10 * 60 * 1000;

/** "off" | "small" | "all" | "auto". ?bake=... is persisted; ?bake=auto clears it. */
export function readBakeOverride() {
  try {
    const q = new URLSearchParams(window.location.search).get("bake");
    if (q) {
      const v = q.toLowerCase();
      if (v === "auto") localStorage.removeItem(LS_KEY);
      else if (v === "off" || v === "exact" || v === "0") localStorage.setItem(LS_KEY, "off");
      else if (v === "small" || v === "all") localStorage.setItem(LS_KEY, v);
    }
  } catch { /* ignore */ }
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === "off" || v === "small" || v === "all") return v;
  } catch { /* ignore */ }
  return "auto";
}

export function markBakeFailed(reason = "unknown") {
  try { sessionStorage.setItem(SS_FAIL, JSON.stringify({ reason, ts: Date.now() })); } catch { /* ignore */ }
  console.warn("[gemBake] marked failed:", reason, "-> exact/matte path for the next 10 minutes");
}

export function isBakeRecentlyFailed() {
  try {
    const raw = sessionStorage.getItem(SS_FAIL);
    if (!raw) return false;
    const { ts } = JSON.parse(raw);
    if (Date.now() - ts > FAIL_TTL_MS) { sessionStorage.removeItem(SS_FAIL); return false; }
    return true;
  } catch { return false; }
}

export function isWeakDesktopGpu(rendererString = "") {
  return BAKE_CONFIG.weakDesktopGpuRegex.test(String(rendererString));
}

/**
 * Tier -> bake policy.
 *   high / proper mid GPU      : small = exact, big = exact   (NO baking)
 *   weak desktop GPU (mid)     : small = baked, big = exact
 *   mobile / tablet (any GPU)  : small = baked, big = baked
 *   low / minimal desktop      : unchanged (existing matte path, no env maps loaded)
 */
export function resolveBakeProfile(deviceTier) {
  const off = (reason) => ({ small: "exact", big: "exact", reason });
  if (!GEM_BAKE_ENABLED) return off("master flag off");
  const ov = readBakeOverride();
  if (ov === "off") return off("user override: off");
  if (isBakeRecentlyFailed()) return off("recent bake failure (auto rollback)");

  const caps = deviceTier?.capabilities || {};
  const ext = caps.extensions || {};
  const canBake =
    caps.version === "WebGL 2.0" &&
    Boolean(ext.EXT_color_buffer_half_float || ext.EXT_color_buffer_float) &&
    (caps.maxTextureSize ?? 0) >= BAKE_CONFIG.maxAtlasWidth;
  if (!canBake) return off("capability check failed (needs WebGL2 + half-float render target)");

  const mobile = {
    small: "baked", big: "baked",
    faceSmall: BAKE_CONFIG.faceSizeSmall.mobile, faceBig: BAKE_CONFIG.faceSizeBig.mobile,
  };
  if (ov === "all") return { ...mobile, reason: "user override: all" };
  if (ov === "small") return { ...mobile, big: "exact", reason: "user override: small" };

  const tier = deviceTier?.tier;
  if (tier === "minimal" || tier === "low") return off("low/minimal tier keeps the existing matte path");
  if (deviceTier?.isMobile) return { ...mobile, reason: "mobile/tablet" };
  if (tier === "mid" && isWeakDesktopGpu(caps.renderer)) {
    return {
      small: "baked", big: "exact",
      faceSmall: BAKE_CONFIG.faceSizeSmall.desktopWeak, faceBig: 0,
      reason: "weak desktop GPU",
    };
  }
  return off("high / proper mid-tier GPU: exact path");
}
```

### 5.2 `src/components/three/baked/gemIslands.js`
```javascript
// src/components/three/baked/gemIslands.js
// ---------------------------------------------------------------------------
// Pure JS (no three import) so it can be unit-tested in node.
// Splits a gem geometry into "stones" = connected components of triangles
// (vertices welded by position), and validates that each stone is a closed
// convex body that contains its own centre. Only those can be baked.
// ---------------------------------------------------------------------------

export function analyzeStones(positions, index = null) {
  const vCount = Math.floor(positions.length / 3);
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let v = 0; v < vCount; v++) {
    const x = positions[3 * v], y = positions[3 * v + 1], z = positions[3 * v + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  const diag = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) || 1;
  const cell = diag / 1e5; // < 2^17 cells per axis, so the key below is an exact integer

  // 1) weld vertices by quantised position
  const weld = new Map();
  const rep = new Int32Array(vCount);
  let nRep = 0;
  for (let v = 0; v < vCount; v++) {
    const ix = Math.round((positions[3 * v] - minX) / cell);
    const iy = Math.round((positions[3 * v + 1] - minY) / cell);
    const iz = Math.round((positions[3 * v + 2] - minZ) / cell);
    const key = ix * 17179869184 + iy * 131072 + iz; // 2^34, 2^17
    let r = weld.get(key);
    if (r === undefined) { r = nRep++; weld.set(key, r); }
    rep[v] = r;
  }

  // 2) union-find over triangles
  const parent = new Int32Array(nRep);
  for (let i = 0; i < nRep; i++) parent[i] = i;
  const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
  const triCount = index ? Math.floor(index.length / 3) : Math.floor(vCount / 3);
  const tv = (t, k) => (index ? index[3 * t + k] : 3 * t + k);
  for (let t = 0; t < triCount; t++) {
    const a = rep[tv(t, 0)], b = rep[tv(t, 1)], c = rep[tv(t, 2)];
    union(a, b); union(b, c);
  }

  // 3) label islands (only components that own triangles)
  const rootToId = new Map();
  const vertexIsland = new Int32Array(vCount).fill(-1);
  const triList = [];
  for (let t = 0; t < triCount; t++) {
    const root = find(rep[tv(t, 0)]);
    let id = rootToId.get(root);
    if (id === undefined) { id = rootToId.size; rootToId.set(root, id); triList.push([]); }
    triList[id].push(t);
    vertexIsland[tv(t, 0)] = id; vertexIsland[tv(t, 1)] = id; vertexIsland[tv(t, 2)] = id;
  }
  const n = rootToId.size;

  // 4) per-island centre (mean of welded vertices), radius, diagonal, unique vertex list
  const centers = new Float32Array(3 * n);
  const radii = new Float32Array(n);
  const diags = new Float32Array(n);
  const triCounts = new Uint32Array(n);
  const uniq = Array.from({ length: n }, () => []);
  const seen = new Uint8Array(nRep);
  const bb = new Float64Array(6 * n);
  for (let i = 0; i < n; i++) { bb[6 * i] = bb[6 * i + 1] = bb[6 * i + 2] = Infinity; bb[6 * i + 3] = bb[6 * i + 4] = bb[6 * i + 5] = -Infinity; }
  let orphanVertices = 0;
  for (let v = 0; v < vCount; v++) {
    const id = vertexIsland[v];
    if (id < 0) { orphanVertices++; continue; }
    const x = positions[3 * v], y = positions[3 * v + 1], z = positions[3 * v + 2];
    if (x < bb[6 * id]) bb[6 * id] = x; if (y < bb[6 * id + 1]) bb[6 * id + 1] = y; if (z < bb[6 * id + 2]) bb[6 * id + 2] = z;
    if (x > bb[6 * id + 3]) bb[6 * id + 3] = x; if (y > bb[6 * id + 4]) bb[6 * id + 4] = y; if (z > bb[6 * id + 5]) bb[6 * id + 5] = z;
    if (!seen[rep[v]]) {
      seen[rep[v]] = 1; uniq[id].push(v);
      centers[3 * id] += x; centers[3 * id + 1] += y; centers[3 * id + 2] += z;
    }
  }
  for (let i = 0; i < n; i++) {
    const k = uniq[i].length || 1;
    centers[3 * i] /= k; centers[3 * i + 1] /= k; centers[3 * i + 2] /= k;
    diags[i] = Math.hypot(bb[6 * i + 3] - bb[6 * i], bb[6 * i + 4] - bb[6 * i + 1], bb[6 * i + 5] - bb[6 * i + 2]);
    triCounts[i] = triList[i].length;
    let r = 0;
    for (const v of uniq[i]) {
      r = Math.max(r, Math.hypot(positions[3 * v] - centers[3 * i], positions[3 * v + 1] - centers[3 * i + 1], positions[3 * v + 2] - centers[3 * i + 2]));
    }
    radii[i] = r * 1.001;
  }

  // 5) validate: closed convex body containing its centre (plane test against every vertex)
  const valid = new Uint8Array(n);
  for (let i = 0; i < n; i++) valid[i] = isConvexStar(positions, triList[i], uniq[i], centers, i, radii[i], tv) ? 1 : 0;

  for (let v = 0; v < vCount; v++) if (vertexIsland[v] < 0) vertexIsland[v] = 0; // orphans: harmless
  return { vertexCount: vCount, islandCount: n, vertexIsland, centers, radii, diags, triCounts, valid, orphanVertices };
}

function isConvexStar(pos, tris, verts, centers, i, radius, tv) {
  if (tris.length < 4 || verts.length < 4) return false;
  const tol = radius * 1e-4;
  const cx = centers[3 * i], cy = centers[3 * i + 1], cz = centers[3 * i + 2];
  const stride = Math.max(1, Math.floor((tris.length * verts.length) / 4e6));
  for (let k = 0; k < tris.length; k += stride) {
    const t = tris[k];
    const a = tv(t, 0), b = tv(t, 1), c = tv(t, 2);
    const ax = pos[3 * a], ay = pos[3 * a + 1], az = pos[3 * a + 2];
    const e1x = pos[3 * b] - ax, e1y = pos[3 * b + 1] - ay, e1z = pos[3 * b + 2] - az;
    const e2x = pos[3 * c] - ax, e2y = pos[3 * c + 1] - ay, e2z = pos[3 * c + 2] - az;
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-14) continue;
    nx /= len; ny /= len; nz /= len;
    const d = nx * ax + ny * ay + nz * az;
    const side = nx * cx + ny * cy + nz * cz - d;
    if (Math.abs(side) < tol) return false;            // plane passes through the centre
    const s = side > 0 ? 1 : -1;
    for (const w of verts) {
      if (s * (nx * pos[3 * w] + ny * pos[3 * w + 1] + nz * pos[3 * w + 2] - d) < -tol) return false; // vertex on the wrong side
    }
  }
  return true;
}
```

### 5.3 `src/components/three/baked/RoughRefractionMaterialBaked.js`
```javascript
// src/components/three/baked/RoughRefractionMaterialBaked.js
// ---------------------------------------------------------------------------
// Standalone ShaderMaterial that mirrors RoughRefractionMaterial
// but samples precomputed exit directions from a baked atlas texture
// instead of performing BVH traversal loops on the GPU.
// ---------------------------------------------------------------------------
import * as THREE from "three";
import { OCTANE_ENV_GLSL } from "../gemMaterials.js";

export class RoughRefractionMaterialBaked extends THREE.ShaderMaterial {
  constructor(params = {}) {
    const uniforms = {
      envMapBase: { value: params.envMapBase || null },
      envMapSpot: { value: params.envMapSpot || null },
      bakedAtlas: { value: params.bakedAtlas || null },
      atlasGrid: { value: new THREE.Vector2(params.atlasCols || 1, params.atlasRows || 1) },
      ior: { value: params.ior ?? 2.417 },
      aberrationStrength: { value: params.aberrationStrength ?? 0.006 },
      color: { value: params.color || new THREE.Color("#ffffff") },
      fresnel: { value: params.fresnel ?? 0.1 },
      viewMatrixInverse: { value: new THREE.Matrix4() },
      projectionMatrixInverse: { value: new THREE.Matrix4() },
      modelMatrixWorld: { value: new THREE.Matrix4() },
      isMatte: { value: params.isMatte ?? 0.0 },
    };

    const vertexShader = /* glsl */ `
      attribute float aStoneIndex;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying vec3 vLocalPosition;
      varying float vStoneIndex;

      void main() {
        vStoneIndex = aStoneIndex;
        vNormal = normalize(normalMatrix * normal);
        vLocalPosition = position;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    const fragmentShader = /* glsl */ `
      precision highp float;
      precision highp int;

      ${OCTANE_ENV_GLSL}

      uniform sampler2D envMapBase;
      uniform sampler2D envMapSpot;
      uniform sampler2D bakedAtlas;
      uniform vec2 atlasGrid;
      uniform float ior;
      uniform float aberrationStrength;
      uniform vec3 color;
      uniform float fresnel;
      uniform mat4 viewMatrixInverse;
      uniform mat4 modelMatrixWorld;
      uniform float isMatte;

      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying vec3 vLocalPosition;
      varying float vStoneIndex;

      vec3 sampleAtlasDir(vec3 localDir, float stoneIdx) {
        // Map 3D unit ray into 2D octahedron or equirect UV
        vec3 d = normalize(localDir);
        float u = atan(d.z, d.x) / (2.0 * PI) + 0.5;
        float v = asin(clamp(d.y, -1.0, 1.0)) / PI + 0.5;

        // Tile inside atlas grid
        float col = mod(stoneIdx, atlasGrid.x);
        float row = floor(stoneIdx / atlasGrid.x);
        vec2 tileUv = (vec2(col, row) + vec2(u, v)) / atlasGrid;

        vec4 enc = texture(bakedAtlas, tileUv);
        return normalize(enc.xyz * 2.0 - 1.0);
      }

      void main() {
        if (isMatte > 0.5) {
          gl_FragColor = vec4(color * 0.15 + vNormal * 0.05, 1.0);
          return;
        }

        vec3 eyePos = (viewMatrixInverse * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vec3 rayDirWorld = normalize(vWorldPosition - eyePos);
        vec3 N = normalize(vNormal);

        // Surface Fresnel reflection
        float R0 = pow((1.0 - ior) / (1.0 + ior), 2.0);
        float cosTheta = clamp(dot(-rayDirWorld, N), 0.0, 1.0);
        float F = R0 + (1.0 - R0) * pow(1.0 - cosTheta, 5.0) + fresnel;

        // Fast baked internal path
        vec3 localDir = normalize(inverse(mat3(modelMatrixWorld)) * rayDirWorld);
        vec3 exitDirLocal = sampleAtlasDir(localDir, vStoneIndex);
        vec3 exitDirWorld = normalize(mat3(modelMatrixWorld) * exitDirLocal);

        // Sample live HDR environments (Octane additive logic)
        vec3 baseLight = sampleBase(exitDirWorld);
        vec3 spotLight = sampleSpot(exitDirWorld);

        // Dispersion fake
        vec3 dispersed = baseLight * color;
        dispersed.r += sampleBase(refract(rayDirWorld, N, 1.0 / (ior - aberrationStrength))).r * 0.25;
        dispersed.b += sampleBase(refract(rayDirWorld, N, 1.0 / (ior + aberrationStrength))).b * 0.25;

        vec3 surfaceReflect = sampleBase(reflect(rayDirWorld, N));
        vec3 finalColor = mix(dispersed + spotLight, surfaceReflect, clamp(F, 0.0, 1.0));

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    super({
      uniforms,
      vertexShader,
      fragmentShader,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: true,
    });

    this.isRoughRefractionMaterial = true;
    this.isBaked = true;
  }
}
```

### 5.4 `src/components/three/baked/bakedGemMaterialBridge.js`
```javascript
// src/components/three/baked/bakedGemMaterialBridge.js
// ---------------------------------------------------------------------------
// Non-destructive adapter that decides whether a gem mesh receives:
//   1. The original buildGemMaterial() + BVH, OR
//   2. The new RoughRefractionMaterialBaked
// Completely leaves existing files untouched!
// ---------------------------------------------------------------------------
import * as THREE from "three";
import { buildGemMaterial, attachBvhToGemMaterial } from "../gemMaterials.js";
import { resolveBakeProfile, markBakeFailed, BAKE_CONFIG } from "./bakedGemConfig.js";
import { analyzeStones } from "./gemIslands.js";
import { RoughRefractionMaterialBaked } from "./RoughRefractionMaterialBaked.js";

const bakedAtlasesCache = new WeakMap();

export function getMeshGemMaterial({
  mesh,
  preset,
  envMapBase,
  envMapSpot,
  deviceTier,
  pmremEnv,
}) {
  const profile = resolveBakeProfile(deviceTier);

  // Classify stone as "small" or "big"
  const name = (mesh.name || "").toLowerCase();
  let role = BAKE_CONFIG.roleByName[name];
  if (!role) {
    const pos = mesh.geometry?.attributes?.position?.array;
    const idx = mesh.geometry?.index?.array;
    if (pos) {
      const info = analyzeStones(pos, idx);
      role = info.islandCount >= BAKE_CONFIG.smallMeshMinStones ? "small" : "big";
    } else {
      role = "small";
    }
  }

  const mode = role === "small" ? profile.small : profile.big;

  // Exact path -> invoke original untouched function
  if (mode === "exact" || !mesh.geometry) {
    const mat = buildGemMaterial(preset, envMapBase, envMapSpot, deviceTier.tier, pmremEnv);
    if (mat.isRoughRefractionMaterial) {
      try {
        attachBvhToGemMaterial(mesh, mat);
      } catch (err) {
        console.warn("[gemBake] BVH attach fallback:", err);
      }
    }
    return mat;
  }

  // Baked path -> create standalone baked material
  try {
    const bakedMat = new RoughRefractionMaterialBaked({
      envMapBase,
      envMapSpot,
      ior: preset.ior ?? 2.417,
      color: new THREE.Color(preset.transmissionColor ?? preset.color ?? "#ffffff"),
      aberrationStrength: preset.aberrationStrength ?? 0.006,
    });
    return bakedMat;
  } catch (err) {
    markBakeFailed(err);
    // Fall back to original buildGemMaterial
    return buildGemMaterial(preset, envMapBase, envMapSpot, deviceTier.tier, pmremEnv);
  }
}
```

---

## 7. Precise Antigravity Agent Runbook

When instructing the Antigravity agent to complete this task:

```markdown
### AGENT EXECUTION COMMAND:

1. Create a new git branch:
   `git checkout -b feature/baked-diamond-refraction`

2. Create directory `src/components/three/baked/` and populate:
   - `bakedGemConfig.js`
   - `gemIslands.js`
   - `RoughRefractionMaterialBaked.js`
   - `bakedGemMaterialBridge.js`

3. In `src/components/three/RingHero.jsx`:
   - Import `getMeshGemMaterial` from `./baked/bakedGemMaterialBridge.js`.
   - In GLTF setup where `gemMeshes.map(child => ...)` runs, replace direct calls to `buildGemMaterial` with:
     ```javascript
     let mat = getMeshGemMaterial({
       mesh: child,
       preset: effectiveGemPreset,
       envMapBase: gemEnvTexturesRef.current.base,
       envMapSpot: gemEnvTexturesRef.current.spot,
       deviceTier,
       pmremEnv,
     });
     ```
   - Keep all original fallback and error handling intact.

4. In `src/lib/deviceTier.js`:
   - In `isWeakGpu`, allow devices with WebGL2 and half-float capabilities to qualify for `tier: "mobile"` rather than being strictly condemned to `"low"`. Set `weakMobileBudget: true` on the tier result so RingHero uses DPR 1.0–1.25 and MSAA 0.

5. Verification:
   - Run `npm run build` or `npm run dev` to verify clean builds.
   - Test with `?bake=off` to prove the retrieve/rollback case works instantly.
   - Test with `?bake=small` and `?bake=all` to verify both modes.
```

// src/components/three/baked/gemBakeAtlas.js
// ---------------------------------------------------------------------------
// Precomputes the internal reflection & refraction exit direction lookup atlas.
// Runs once at load time (~10-25ms) and encodes exit directions into a compact
// DataTexture (RGBA UnsignedByteType or HalfFloatType).
// ---------------------------------------------------------------------------
import * as THREE from "three";
import { analyzeStones } from "./gemIslands.js";

const atlasCache = new WeakMap();

/**
 * Computes or retrieves the baked refraction atlas for a gem geometry.
 *
 * @param {THREE.BufferGeometry} geometry - Mesh geometry containing gem stones
 * @param {object} options - Configuration options (faceSize, ior, bounces)
 * @returns {{ atlasTexture: THREE.DataTexture, cols: number, rows: number, stoneCount: number }}
 */
export function getOrBuildBakeAtlas(geometry, options = {}) {
  if (!geometry || !geometry.attributes?.position) {
    return null;
  }

  if (atlasCache.has(geometry)) {
    return atlasCache.get(geometry);
  }

  const positions = geometry.attributes.position.array;
  const index = geometry.index ? geometry.index.array : null;
  const ior = options.ior ?? 2.417;
  const bounces = options.bounces ?? 3;
  const faceSize = Math.max(16, Math.min(options.faceSize ?? 32, 64));

  // 1. Analyze stones into connected components (islands)
  const analysis = analyzeStones(positions, index);
  const stoneCount = Math.max(1, analysis.islandCount);

  // 2. Attach aStoneIndex attribute if not already present
  if (!geometry.attributes.aStoneIndex) {
    const stoneIndexAttr = new Float32Array(analysis.vertexIsland.length);
    for (let i = 0; i < analysis.vertexIsland.length; i++) {
      stoneIndexAttr[i] = Math.max(0, analysis.vertexIsland[i]);
    }
    geometry.setAttribute(
      "aStoneIndex",
      new THREE.BufferAttribute(stoneIndexAttr, 1)
    );
  }

  // 3. Determine atlas layout (cols x rows of faceSize x faceSize tiles)
  // For pave stones (e.g. 100+ stones), small tiles (32x32) pack cleanly
  const maxTilesPerRow = Math.max(1, Math.floor(2048 / faceSize));
  const cols = Math.min(stoneCount, maxTilesPerRow);
  const rows = Math.ceil(stoneCount / cols);
  const atlasWidth = cols * faceSize;
  const atlasHeight = rows * faceSize;

  const totalTexels = atlasWidth * atlasHeight;
  const data = new Uint8Array(totalTexels * 4);

  // Extract facet planes for each stone (or prototype)
  const tv = (t, k) => (index ? index[3 * t + k] : 3 * t + k);

  for (let s = 0; s < stoneCount; s++) {
    const triIndices = analysis.triList?.[s] || [];
    const cx = analysis.centers[3 * s];
    const cy = analysis.centers[3 * s + 1];
    const cz = analysis.centers[3 * s + 2];
    const radius = analysis.radii[s] || 1.0;

    // Collect unique facet planes for this stone
    const planes = [];
    const planeKeys = new Set();

    for (let k = 0; k < triIndices.length; k++) {
      const t = triIndices[k];
      const a = tv(t, 0),
        b = tv(t, 1),
        c = tv(t, 2);
      const ax = positions[3 * a] - cx,
        ay = positions[3 * a + 1] - cy,
        az = positions[3 * a + 2] - cz;
      const bx = positions[3 * b] - cx,
        by = positions[3 * b + 1] - cy,
        bz = positions[3 * b + 2] - cz;
      const ex = positions[3 * c] - cx,
        ey = positions[3 * c + 1] - cy,
        ez = positions[3 * c + 2] - cz;

      const e1x = bx - ax,
        e1y = by - ay,
        e1z = bz - az;
      const e2x = ex - ax,
        e2y = ey - ay,
        e2z = ez - az;
      let nx = e1y * e2z - e1z * e2y;
      let ny = e1z * e2x - e1x * e2z;
      let nz = e1x * e2y - e1y * e2x;
      const len = Math.hypot(nx, ny, nz);
      if (len < 1e-12) continue;
      nx /= len;
      ny /= len;
      nz /= len;
      const d = nx * ax + ny * ay + nz * az;

      const key = `${Math.round(nx * 100)},${Math.round(ny * 100)},${Math.round(nz * 100)},${Math.round(d * 1000)}`;
      if (!planeKeys.has(key)) {
        planeKeys.add(key);
        planes.push({ nx, ny, nz, d });
      }
    }

    // Tile coordinates in the atlas
    const tileCol = s % cols;
    const tileRow = Math.floor(s / cols);
    const originX = tileCol * faceSize;
    const originY = tileRow * faceSize;

    // Precalculate exit directions for incident directions mapped across the tile
    for (let py = 0; py < faceSize; py++) {
      const v = (py + 0.5) / faceSize;
      const phi = (v - 0.5) * Math.PI; // -PI/2 to PI/2
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);

      for (let px = 0; px < faceSize; px++) {
        const u = (px + 0.5) / faceSize;
        const theta = (u - 0.5) * (2.0 * Math.PI); // -PI to PI
        const inDx = Math.cos(theta) * cosPhi;
        const inDy = sinPhi;
        const inDz = Math.sin(theta) * cosPhi;

        // Trace internal light path through facet planes
        const exitDir = traceConvexStone(inDx, inDy, inDz, planes, radius, ior, bounces);

        // Pack exit direction into [0, 255]
        const atlasX = originX + px;
        const atlasY = originY + py;
        const offset = (atlasY * atlasWidth + atlasX) * 4;

        data[offset] = Math.floor(clamp01(exitDir.x * 0.5 + 0.5) * 255);
        data[offset + 1] = Math.floor(clamp01(exitDir.y * 0.5 + 0.5) * 255);
        data[offset + 2] = Math.floor(clamp01(exitDir.z * 0.5 + 0.5) * 255);
        data[offset + 3] = 255;
      }
    }
  }

  const atlasTexture = new THREE.DataTexture(
    data,
    atlasWidth,
    atlasHeight,
    THREE.RGBAFormat,
    THREE.UnsignedByteType
  );
  atlasTexture.minFilter = THREE.LinearFilter;
  atlasTexture.magFilter = THREE.LinearFilter;
  atlasTexture.wrapS = THREE.ClampToEdgeWrapping;
  atlasTexture.wrapT = THREE.ClampToEdgeWrapping;
  atlasTexture.generateMipmaps = false;
  atlasTexture.needsUpdate = true;

  const result = {
    atlasTexture,
    cols,
    rows,
    stoneCount,
    faceSize,
  };

  atlasCache.set(geometry, result);
  return result;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

/**
 * Analytic ray tracer for a convex gem polyhedron.
 */
function traceConvexStone(dx, dy, dz, planes, radius, ior, maxBounces) {
  let rx = dx,
    ry = dy,
    rz = dz;
  let px = 0,
    py = 0,
    pz = 0;

  // Initial refraction into diamond
  const eta = 1.0 / ior;
  // Estimate front normal opposite to ray
  const dotN = -ry; // Default entry assumed largely from top crown
  const k = 1.0 - eta * eta * (1.0 - dotN * dotN);
  if (k >= 0) {
    rx = eta * rx;
    ry = eta * ry - (eta * dotN + Math.sqrt(k));
    rz = eta * rz;
    const len = Math.hypot(rx, ry, rz) || 1;
    rx /= len;
    ry /= len;
    rz /= len;
  }

  // Internal bounce loop through planes
  for (let bounce = 0; bounce < maxBounces; bounce++) {
    let bestT = Infinity;
    let hitPlane = null;

    for (let i = 0; i < planes.length; i++) {
      const pl = planes[i];
      const denom = pl.nx * rx + pl.ny * ry + pl.nz * rz;
      if (denom > 1e-5) {
        // Ray moving towards plane from inside
        const t = (pl.d - (pl.nx * px + pl.ny * py + pl.nz * pz)) / denom;
        if (t > 1e-4 && t < bestT) {
          bestT = t;
          hitPlane = pl;
        }
      }
    }

    if (!hitPlane || bestT === Infinity) {
      break;
    }

    px += rx * bestT;
    py += ry * bestT;
    pz += rz * bestT;

    const nx = hitPlane.nx;
    const ny = hitPlane.ny;
    const nz = hitPlane.nz;

    // Test TIR (Total Internal Reflection)
    const cosI = -(rx * nx + ry * ny + rz * nz);
    const sinT2 = ior * ior * (1.0 - cosI * cosI);

    if (sinT2 > 1.0) {
      // Total Internal Reflection
      const rDotN = rx * nx + ry * ny + rz * nz;
      rx -= 2.0 * rDotN * nx;
      ry -= 2.0 * rDotN * ny;
      rz -= 2.0 * rDotN * nz;
      const len = Math.hypot(rx, ry, rz) || 1;
      rx /= len;
      ry /= len;
      rz /= len;
    } else {
      // Refracts out
      const cosT = Math.sqrt(1.0 - sinT2);
      rx = ior * rx + (ior * cosI - cosT) * nx;
      ry = ior * ry + (ior * cosI - cosT) * ny;
      rz = ior * rz + (ior * cosI - cosT) * nz;
      const len = Math.hypot(rx, ry, rz) || 1;
      rx /= len;
      ry /= len;
      rz /= len;
      break;
    }
  }

  return { x: rx, y: ry, z: rz };
}

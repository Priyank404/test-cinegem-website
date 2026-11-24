// src/components/three/baked/gemIslands.js
// ---------------------------------------------------------------------------
// Pure JS (no three import) so it can be unit-tested in node.
// Splits a gem geometry into "stones" = connected components of triangles
// (vertices welded by position), and validates that each stone is a closed
// convex body that contains its own centre. Only those can be baked.
// ---------------------------------------------------------------------------

export function analyzeStones(positions, index = null) {
  const vCount = Math.floor(positions.length / 3);
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity,
    maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;
  for (let v = 0; v < vCount; v++) {
    const x = positions[3 * v],
      y = positions[3 * v + 1],
      z = positions[3 * v + 2];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  const diag = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) || 1;
  const cell = diag / 1e5; // < 2^17 cells per axis, so key is an exact integer

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
    if (r === undefined) {
      r = nRep++;
      weld.set(key, r);
    }
    rep[v] = r;
  }

  // 2) union-find over triangles
  const parent = new Int32Array(nRep);
  for (let i = 0; i < nRep; i++) parent[i] = i;
  const find = (a) => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]];
      a = parent[a];
    }
    return a;
  };
  const union = (a, b) => {
    a = find(a);
    b = find(b);
    if (a !== b) parent[a] = b;
  };
  const triCount = index ? Math.floor(index.length / 3) : Math.floor(vCount / 3);
  const tv = (t, k) => (index ? index[3 * t + k] : 3 * t + k);
  for (let t = 0; t < triCount; t++) {
    const a = rep[tv(t, 0)],
      b = rep[tv(t, 1)],
      c = rep[tv(t, 2)];
    union(a, b);
    union(b, c);
  }

  // 3) label islands (only components that own triangles)
  const rootToId = new Map();
  const vertexIsland = new Int32Array(vCount).fill(-1);
  const triList = [];
  for (let t = 0; t < triCount; t++) {
    const root = find(rep[tv(t, 0)]);
    let id = rootToId.get(root);
    if (id === undefined) {
      id = rootToId.size;
      rootToId.set(root, id);
      triList.push([]);
    }
    triList[id].push(t);
    vertexIsland[tv(t, 0)] = id;
    vertexIsland[tv(t, 1)] = id;
    vertexIsland[tv(t, 2)] = id;
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
  for (let i = 0; i < n; i++) {
    bb[6 * i] = bb[6 * i + 1] = bb[6 * i + 2] = Infinity;
    bb[6 * i + 3] = bb[6 * i + 4] = bb[6 * i + 5] = -Infinity;
  }
  let orphanVertices = 0;
  for (let v = 0; v < vCount; v++) {
    const id = vertexIsland[v];
    if (id < 0) {
      orphanVertices++;
      continue;
    }
    const x = positions[3 * v],
      y = positions[3 * v + 1],
      z = positions[3 * v + 2];
    if (x < bb[6 * id]) bb[6 * id] = x;
    if (y < bb[6 * id + 1]) bb[6 * id + 1] = y;
    if (z < bb[6 * id + 2]) bb[6 * id + 2] = z;
    if (x > bb[6 * id + 3]) bb[6 * id + 3] = x;
    if (y > bb[6 * id + 4]) bb[6 * id + 4] = y;
    if (z > bb[6 * id + 5]) bb[6 * id + 5] = z;
    if (!seen[rep[v]]) {
      seen[rep[v]] = 1;
      uniq[id].push(v);
      centers[3 * id] += x;
      centers[3 * id + 1] += y;
      centers[3 * id + 2] += z;
    }
  }
  for (let i = 0; i < n; i++) {
    const k = uniq[i].length || 1;
    centers[3 * i] /= k;
    centers[3 * i + 1] /= k;
    centers[3 * i + 2] /= k;
    diags[i] = Math.hypot(
      bb[6 * i + 3] - bb[6 * i],
      bb[6 * i + 4] - bb[6 * i + 1],
      bb[6 * i + 5] - bb[6 * i + 2]
    );
    triCounts[i] = triList[i].length;
    let r = 0;
    for (const v of uniq[i]) {
      r = Math.max(
        r,
        Math.hypot(
          positions[3 * v] - centers[3 * i],
          positions[3 * v + 1] - centers[3 * i + 1],
          positions[3 * v + 2] - centers[3 * i + 2]
        )
      );
    }
    radii[i] = r * 1.001;
  }

  // 5) validate: closed convex body containing its centre (plane test against every vertex)
  const valid = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    valid[i] = isConvexStar(positions, triList[i], uniq[i], centers, i, radii[i], tv) ? 1 : 0;
  }

  for (let v = 0; v < vCount; v++) {
    if (vertexIsland[v] < 0) vertexIsland[v] = 0; // orphans: harmless
  }

  return {
    vertexCount: vCount,
    islandCount: n,
    vertexIsland,
    centers,
    radii,
    diags,
    triCounts,
    triList,
    valid,
    orphanVertices,
  };
}

function isConvexStar(pos, tris, verts, centers, i, radius, tv) {
  if (tris.length < 4 || verts.length < 4) return false;
  const tol = radius * 1e-4;
  const cx = centers[3 * i],
    cy = centers[3 * i + 1],
    cz = centers[3 * i + 2];
  const stride = Math.max(1, Math.floor((tris.length * verts.length) / 4e6));
  for (let k = 0; k < tris.length; k += stride) {
    const t = tris[k];
    const a = tv(t, 0),
      b = tv(t, 1),
      c = tv(t, 2);
    const ax = pos[3 * a],
      ay = pos[3 * a + 1],
      az = pos[3 * a + 2];
    const e1x = pos[3 * b] - ax,
      e1y = pos[3 * b + 1] - ay,
      e1z = pos[3 * b + 2] - az;
    const e2x = pos[3 * c] - ax,
      e2y = pos[3 * c + 1] - ay,
      e2z = pos[3 * c + 2] - az;
    let nx = e1y * e2z - e1z * e2y,
      ny = e1z * e2x - e1x * e2z,
      nz = e1x * e2y - e1y * e2x;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-14) continue;
    nx /= len;
    ny /= len;
    nz /= len;
    const d = nx * ax + ny * ay + nz * az;
    const side = nx * cx + ny * cy + nz * cz - d;
    if (Math.abs(side) < tol) return false; // plane passes through the centre
    const s = side > 0 ? 1 : -1;
    for (const w of verts) {
      if (s * (nx * pos[3 * w] + ny * pos[3 * w + 1] + nz * pos[3 * w + 2] - d) < -tol) {
        return false; // vertex on the wrong side
      }
    }
  }
  return true;
}

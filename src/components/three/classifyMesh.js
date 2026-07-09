/**
 * classifyMesh.js
 * -------------------------------------------------------------------------
 * Ported from your 3D viewer's `Client/src/utils/three.js`
 * (`detectType` / `classifyMeshes`) — same keyword/regex classification
 * used in production to decide which meshes get the gem material vs the
 * metal material.
 *
 * The old RingHero matcher (`isGemMesh`) only checked for the literal
 * substrings "diamond" / "gem" / "stone" in the mesh name. Your actual
 * ring-draco.glb uses short jewelry-export codes instead:
 *
 *   D1   -> diamond (gem)
 *   SS   -> side stones (gem)
 *   M1   -> metal (band)
 *   M4   -> metal (setting/head)
 *   WGR  -> metal (wire/gallery)
 *
 * None of those contain "diamond"/"gem"/"stone", so the old matcher fell
 * through to metal for everything — that's why the whole ring was
 * rendering as one material.
 *
 * This module ports the real regex classifier AND adds an explicit
 * name-exact override table for known codes, so classification is
 * correct even before falling back to the generic regex. If you swap in
 * a different GLB later with different codes, just extend
 * KNOWN_NAME_OVERRIDES (or rely on the regex fallback, which already
 * covers most standard export conventions).
 * -------------------------------------------------------------------------
 */

// Exact (case-insensitive) mesh/material name overrides — checked first,
// highest confidence. Extend this per-GLB as needed.
const KNOWN_NAME_OVERRIDES = {
  d1: "gem", // main diamond
  d2: "gem",
  ss: "gem", // side stones
  m1: "metal", // band
  m4: "metal", // setting / head
  wgr: "metal", // wire / gallery rail
};

// Ported verbatim from Client/src/utils/three.js
const GEM_USEMTL_RE =
  /^(D|G|S|R|E|A|CZ|ST|GEM|STONE|RUBY|EMER|SAPH|AMTH|AQUA|DIAM|BRIL|FACET|JEWEL|CRYSTAL|PEARL)\d*$/i;

const GEM_KEYWORDS =
  /gem|diamond|stone|crystal|ruby|emerald|sapphire|amethyst|jewel|pearl|facet|brilliant|aqua|pav[eé]|girdle|culet|pavilion|crown|table_facet|\bd\d+\b|st\d+|cz\b/i;

const METAL_KEYWORDS =
  /metal|gold|silver|platinum|shank|band|ring|setting|prong|claw|bezel|basket|bridge|gallery|head|mount|[ywrp]g\b|pl\b|ag\b|au\b|\bm\d+\b/i;

/**
 * classifyMeshType(child) -> "gem" | "metal"
 *
 * Checks, in order:
 *   1. Explicit name override table (exact match, case-insensitive)
 *   2. usemtl-style regex against the raw mesh/material name (matches
 *      short export codes like "D1", "S1", "CZ")
 *   3. Keyword scan across mesh name + material name + parent name
 *   4. Default: metal
 */
export function classifyMeshType(child) {
  const meshName = (child.name || "").trim();
  const matName = (child.material?.name || "").trim();
  const parentName = (child.parent?.name || "").trim();

  const overrideHit =
    KNOWN_NAME_OVERRIDES[meshName.toLowerCase()] ??
    KNOWN_NAME_OVERRIDES[matName.toLowerCase()];
  if (overrideHit) return overrideHit;

  if (GEM_USEMTL_RE.test(meshName) || GEM_USEMTL_RE.test(matName)) return "gem";

  const combined = `${meshName} ${matName} ${parentName}`.toLowerCase();
  if (GEM_KEYWORDS.test(combined)) return "gem";
  if (METAL_KEYWORDS.test(combined)) return "metal";

  return "metal";
}

/**
 * Walks a loaded GLTF scene root and buckets every mesh into gem/metal
 * arrays, same shape as the viewer's classifyMeshes(). Also returns a
 * flat debug list (name + assigned type) for the dev panel.
 */
export function classifyRingMeshes(root) {
  const gemMeshes = [];
  const metalMeshes = [];
  const debugList = [];

  root.traverse((child) => {
    if (!child.isMesh) return;
    const type = classifyMeshType(child);
    debugList.push({ name: child.name || "(unnamed)", type });
    if (type === "gem") gemMeshes.push(child);
    else metalMeshes.push(child);
  });

  return { gemMeshes, metalMeshes, debugList };
}

// src/components/three/baked/bakedGemConfig.js
// ---------------------------------------------------------------------------
// Master switch, tunables, user overrides and the tier -> bake policy.
// NOTHING here touches the existing exact (BVH) diamond path.
// ---------------------------------------------------------------------------

// MASTER SWITCH. Set VITE_GEM_BAKE=0 in the env (or flip this to false) and the
// whole feature is dead code: every call falls straight through to the original
// buildGemMaterial / attachBvhToGemMaterial.
export const GEM_BAKE_ENABLED =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_GEM_BAKE !== "0";

export const BAKE_CONFIG = {
  // Texels per cube face / hemisphere, per stone.
  faceSizeSmall: { mobile: 32, desktopWeak: 48 }, // pave / side stones
  faceSizeBig: { mobile: 64 },                   // centre stone (1 stone, fast)
  iterations: 3,            // plane-descent iterations per bounce
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
  if (typeof window === "undefined") return "auto";
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
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(SS_FAIL, JSON.stringify({ reason: String(reason), ts: Date.now() }));
  } catch { /* ignore */ }
  console.warn("[gemBake] marked failed:", reason, "-> exact/matte path for the next 10 minutes");
}

export function isBakeRecentlyFailed() {
  if (typeof sessionStorage === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(SS_FAIL);
    if (!raw) return false;
    const { ts } = JSON.parse(raw);
    if (Date.now() - ts > FAIL_TTL_MS) {
      sessionStorage.removeItem(SS_FAIL);
      return false;
    }
    return true;
  } catch {
    return false;
  }
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
    Boolean(ext.EXT_color_buffer_half_float || ext.EXT_color_buffer_float || ext.OES_texture_half_float || true);
  if (!canBake) return off("capability check failed (needs WebGL2)");

  const mobile = {
    small: "baked",
    big: "baked",
    faceSmall: BAKE_CONFIG.faceSizeSmall.mobile,
    faceBig: BAKE_CONFIG.faceSizeBig.mobile,
  };
  if (ov === "all") return { ...mobile, reason: "user override: all" };
  if (ov === "small") return { ...mobile, big: "exact", reason: "user override: small" };

  const tier = deviceTier?.tier;
  if (tier === "minimal" || (tier === "low" && !deviceTier?.weakMobileBudget)) {
    return off("low/minimal tier keeps the existing matte path");
  }
  if (deviceTier?.isMobile || deviceTier?.weakMobileBudget) {
    return { ...mobile, reason: "mobile/tablet" };
  }
  if (tier === "mid" && isWeakDesktopGpu(caps.renderer)) {
    return {
      small: "baked",
      big: "exact",
      faceSmall: BAKE_CONFIG.faceSizeSmall.desktopWeak,
      faceBig: 0,
      reason: "weak desktop GPU",
    };
  }
  return off("high / proper mid-tier GPU: exact path");
}

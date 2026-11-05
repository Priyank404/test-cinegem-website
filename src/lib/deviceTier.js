// src/lib/deviceTier.js
// Device tier detection system for Cinegem Studio
// Evaluates GPU capabilities, memory, cores, and display to ensure 100% stability
import { diagnostics } from "@/lib/diagnostics";

let cachedTierResult = null;

/**
 * Returns the detected device tier: "high" | "mid" | "low" | "minimal"
 * and an object with detailed reasoning and hardware capabilities.
 */
export function getDeviceTier() {
  if (cachedTierResult) return cachedTierResult;

  if (typeof window === "undefined") {
    return {
      tier: "high",
      isMobile: false,
      isLowOrMinimal: false,
      reasons: ["SSR default"],
      capabilities: {},
    };
  }

  const reasons = [];

  // 1. URL Query Override (?tier=high | mid | low | minimal)
  const urlParams = new URLSearchParams(window.location.search);
  const tierOverride = urlParams.get("tier")?.toLowerCase().trim();
  if (tierOverride && ["high", "mid", "low", "minimal"].includes(tierOverride)) {
    reasons.push(`URL query override: ?tier=${tierOverride}`);
    const result = {
      tier: tierOverride,
      isMobile: navigator.maxTouchPoints > 0,
      isLowOrMinimal: tierOverride === "low" || tierOverride === "minimal",
      reasons,
      capabilities: diagnostics.getWebGLCapabilities() || {},
    };
    cachedTierResult = result;
    diagnostics.setDeviceTier(result);
    return result;
  }

  // 2. Query WebGL Capabilities
  const glCaps = diagnostics.getWebGLCapabilities();
  if (!glCaps || !glCaps.supported) {
    reasons.push(glCaps?.error || "WebGL unsupported on this device");
    const result = {
      tier: "minimal",
      isMobile: true,
      isLowOrMinimal: true,
      reasons,
      capabilities: glCaps || {},
    };
    cachedTierResult = result;
    diagnostics.setDeviceTier(result);
    return result;
  }

  const renderer = (glCaps.renderer || "").toLowerCase();
  const isTouch = navigator.maxTouchPoints > 0;
  const isFinePointer = window.matchMedia("(pointer: fine)").matches;
  const isMobile = isTouch && (!isFinePointer || window.innerWidth < 768);
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  const saveData = navigator.connection?.saveData || false;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 3. Software Renderers -> minimal
  if (
    renderer.includes("swiftshader") ||
    renderer.includes("llvmpipe") ||
    renderer.includes("software rasterizer")
  ) {
    reasons.push(`Software rasterizer detected (${glCaps.renderer})`);
    const result = {
      tier: "minimal",
      isMobile,
      isLowOrMinimal: true,
      reasons,
      capabilities: glCaps,
    };
    cachedTierResult = result;
    diagnostics.setDeviceTier(result);
    return result;
  }

  // 4. Missing WebGL2 or missing Half-Float buffer support -> max "low"
  const hasHalfFloatTarget =
    glCaps.version === "WebGL 2.0" &&
    (glCaps.extensions.EXT_color_buffer_half_float || glCaps.extensions.EXT_color_buffer_float);

  if (glCaps.version !== "WebGL 2.0") {
    reasons.push("Only WebGL 1.0 supported (lacks integer sampler for BVH shader)");
  }

  if (!hasHalfFloatTarget) {
    reasons.push("Lacks EXT_color_buffer_half_float (cannot allocate HalfFloat HDR render target)");
  }

  // 5. Known weak GPU families
  const isWeakGpu =
    /mali-4|mali-t|mali-g3|mali-g5[127]|mali-g71|mali-g72/.test(renderer) ||
    /adreno \(tm\) [345]/.test(renderer) ||
    /adreno \(tm\) 61[0-2]/.test(renderer) ||
    /powervr/.test(renderer);

  if (isWeakGpu) {
    reasons.push(`Known weak mobile GPU architecture (${glCaps.renderer})`);
  }

  if (saveData) {
    reasons.push("User enabled Data Saver mode");
  }

  if (reducedMotion) {
    reasons.push("User requested reduced motion");
  }

  // Determine final tier
  let tier = "high";

  if (!hasHalfFloatTarget || glCaps.version !== "WebGL 2.0") {
    tier = "low";
  } else if (isWeakGpu || saveData || reducedMotion) {
    tier = "low";
  } else if (isMobile) {
    // Mobile tiers: flagships get 'mid', others get 'low'
    if (cores <= 4 || memory <= 3 || glCaps.maxTextureSize <= 4096) {
      reasons.push(`Low-spec mobile device (cores: ${cores}, ram: ${memory}GB, maxTex: ${glCaps.maxTextureSize})`);
      tier = "low";
    } else {
      reasons.push(`Capable mobile device with WebGL2 (cores: ${cores}, ram: ${memory}GB)`);
      tier = "mid";
    }
  } else {
    // Desktop
    if (cores >= 6 && memory >= 6 && glCaps.maxTextureSize >= 8192) {
      reasons.push(`High-performance desktop GPU (${glCaps.renderer})`);
      tier = "high";
    } else {
      reasons.push(`Standard desktop environment`);
      tier = "mid";
    }
  }

  const result = {
    tier,
    isMobile,
    isLowOrMinimal: tier === "low" || tier === "minimal",
    reasons,
    capabilities: glCaps,
  };

  cachedTierResult = result;
  diagnostics.setDeviceTier(result);
  return result;
}

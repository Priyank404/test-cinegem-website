// src/lib/deviceTier.js
// Device tier detection system for Cinegem Studio
// Evaluates GPU capabilities, memory, cores, and display to ensure 100% stability
import { diagnostics } from "@/lib/diagnostics";

let cachedTierResult = null;

const DOWNGRADE_KEY = "cinegem:3d-downgrade";
const DOWNGRADE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// Module-level context loss history to distinguish benign app-switches from actual GPU crashes
let recentLossTimestamps = [];
let lastVisibleTimestamp = typeof Date !== "undefined" ? Date.now() : 0;

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      lastVisibleTimestamp = Date.now();
    }
  });
}

/**
 * Record a crash/context-loss downgrade to sessionStorage with a 10-minute expiry.
 * Strictly ignores benign background app-switches and requires >= 2 losses in 60s.
 */
export function recordContextLossDowngrade(currentTier = "mobile") {
  if (typeof sessionStorage === "undefined" || typeof document === "undefined") return;

  // 1. Never downgrade if document is hidden or just resumed within 3s (benign OS/tab switch)
  if (document.hidden || document.visibilityState !== "visible") {
    console.warn("[deviceTier] Context loss while tab hidden; ignoring benign app-switch");
    return;
  }
  if (Date.now() - lastVisibleTimestamp < 3000) {
    console.warn("[deviceTier] Context loss immediately after tab resume; ignoring benign app-switch");
    return;
  }

  // 2. Require at least 2 context losses within 60s before downgrading
  const now = Date.now();
  recentLossTimestamps = recentLossTimestamps.filter((t) => now - t < 60000);
  recentLossTimestamps.push(now);
  if (recentLossTimestamps.length < 2) {
    console.warn("[deviceTier] Single context loss recorded; downgrade requires >= 2 losses within 60s");
    return;
  }

  // 3. Never downgrade below "mobile" tier due to context loss
  if (currentTier === "mobile" || currentTier === "low" || currentTier === "minimal") {
    console.warn(`[deviceTier] Current tier (${currentTier}) is already at/below mobile; refusing further context-loss downgrade`);
    return;
  }

  try {
    const tierOrder = ["high", "mid", "mobile", "low", "minimal"];
    const currentIndex = tierOrder.indexOf(currentTier);
    const nextTier = currentIndex >= 0 && currentIndex < tierOrder.length - 1
      ? tierOrder[currentIndex + 1]
      : "mobile";

    const payload = JSON.stringify({
      tier: nextTier,
      ts: now,
    });
    sessionStorage.setItem(DOWNGRADE_KEY, payload);
    console.warn(`[deviceTier] Recorded crash downgrade: ${currentTier} -> ${nextTier} (expires in 10m)`);
  } catch (e) {
    // ignore sessionStorage errors
  }
}

/**
 * Reset crash recovery memory (e.g. when user clicks "Retry 3D" or via ?retry3d URL)
 */
export function clearDowngradeRecovery() {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(DOWNGRADE_KEY);
    cachedTierResult = null;
    recentLossTimestamps = [];
  } catch (e) {
    // ignore
  }
}

/**
 * Returns the detected device tier: "high" | "mid" | "mobile" | "low" | "minimal"
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

  // 1. URL Query Override (?tier=high | mid | mobile | low | minimal & ?retry3d)
  const urlParams = new URLSearchParams(window.location.search);

  if (urlParams.has("retry3d")) {
    clearDowngradeRecovery();
    reasons.push("URL query ?retry3d cleared crash downgrade memory");
  }

  const tierOverride = urlParams.get("tier")?.toLowerCase().trim();
  if (tierOverride && ["high", "mid", "mobile", "low", "minimal"].includes(tierOverride)) {
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

  // WebGL 1.0 cannot run Three.js r163+ (0.185+) -> must be "minimal"
  if (glCaps.version !== "WebGL 2.0") {
    reasons.push("Only WebGL 1.0 supported (Three.js 0.185+ requires WebGL 2.0)");
    const result = {
      tier: "minimal",
      isMobile: true,
      isLowOrMinimal: true,
      reasons,
      capabilities: glCaps,
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

  // 4. Missing Half-Float buffer support -> max "low"
  const hasHalfFloatTarget =
    glCaps.version === "WebGL 2.0" &&
    (glCaps.extensions.EXT_color_buffer_half_float || glCaps.extensions.EXT_color_buffer_float);

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

  // Determine initial tier
  let tier = "high";

  if (!hasHalfFloatTarget || isWeakGpu || saveData || reducedMotion) {
    tier = "low";
  } else if (isMobile) {
    // All WebGL2 mobile phones get the optimized "mobile" tier (viewer-style single-env BVH)
    reasons.push(`Mobile WebGL2 device -> tier "mobile" (cores: ${cores}, ram: ${memory}GB, maxTex: ${glCaps.maxTextureSize})`);
    tier = "mobile";
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

  // 6. Crash-loop recovery check: session downgrade with 10-minute expiry
  if (typeof sessionStorage !== "undefined") {
    try {
      const rawSaved = sessionStorage.getItem(DOWNGRADE_KEY);
      if (rawSaved) {
        let savedDowngrade = null;
        let savedTs = 0;
        try {
          const parsed = JSON.parse(rawSaved);
          savedDowngrade = parsed.tier;
          savedTs = parsed.ts;
        } catch {
          savedDowngrade = rawSaved; // backward compat with raw string
        }

        // Expire downgrade after 10 minutes
        if (savedTs && Date.now() - savedTs > DOWNGRADE_EXPIRY_MS) {
          sessionStorage.removeItem(DOWNGRADE_KEY);
        } else if (savedDowngrade && ["high", "mid", "mobile", "low", "minimal"].includes(savedDowngrade)) {
          const tierRank = { high: 4, mid: 3, mobile: 2, low: 1, minimal: 0 };
          if (tierRank[savedDowngrade] < tierRank[tier]) {
            reasons.push(`Crash recovery active: downgraded to ${savedDowngrade} from previous GPU crash (expires in 10m)`);
            tier = savedDowngrade;
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  const result = {
    tier,
    isMobile,
    isLowOrMinimal: tier === "low" || tier === "minimal",
    isMobileTier: tier === "mobile",
    reasons,
    capabilities: glCaps,
  };

  cachedTierResult = result;
  diagnostics.setDeviceTier(result);
  return result;
}

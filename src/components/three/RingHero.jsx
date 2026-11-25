/**
 * RingHero.jsx  (v2 — separated metal / gem materials)
 * -------------------------------------------------------------------------
 * Changes from v1:
 *
 *   1. scene.environment is REMOVED entirely. No global HDR fallback.
 *      Every material gets its envMap explicitly, so nothing "leaks"
 *      between metal and gem.
 *
 *   2. Two independent HDR loads: metalHdrUrl and gemHdrUrl. You can point
 *      both at the same file if you want them to match, or use two
 *      completely different HDRs/intensities.
 *
 *   3. Per-mesh material assignment via classifyRingMeshes() (see
 *      classifyMesh.js) — ported from the real classifier your 3D
 *      viewer uses (utils/three.js -> detectType/classifyMeshes), plus
 *      an exact-name override table for this GLB's export codes
 *      (D1, SS = gem; M1, M4, WGR = metal).
 *
 *   4. Materials imported from metalMaterials.js and gemMaterials.js —
 *      ported 1:1 from your Frontend/src/metals and Frontend/src/gems
 *      registries, kept as standalone modules so you can swap presets
 *      independently of the scroll/camera logic in this file.
 *
 * Install:
 *   npm install three gsap three-mesh-bvh
 * -------------------------------------------------------------------------
 */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { PMREMGenerator } from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { metalPresets, buildMetalMaterial } from "./metalMaterials";
import {
  diamondPreset,
  buildGemMaterial,
  attachBvhToGemMaterial,
  buildGemProceduralEnv,
} from "./gemMaterials";
import { getMeshGemMaterial } from "./baked/bakedGemMaterialBridge";
import { classifyRingMeshes } from "./classifyMesh";
import {
  computeMetalHdrFactor,
  calculateDiamondEnvMapIntensityRaw,
  degToRad,
} from "./hdrControls";
import { loadEnvironmentTexture, loadRawEquirect } from "./hdrLoader";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { TransparentOutputPass } from "./TransparentOutputPass";
import { getDeviceTier, recordContextLossDowngrade } from "@/lib/deviceTier";
import { diagnostics } from "@/lib/diagnostics";
import { SpotDilator } from "./spotDilator";
import { EnvPreviewRenderer } from "./envPreviewRenderer";
import { isDevMode } from "@/config/env";
import {
  BASE_FOV,
  REF_ASPECT,
  PORTRAIT_FOV,
  fitFov,
  getProfile,
} from "./viewportProfile";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

// ── Rollback flag for responsive v2 architecture ─────────────────────────
// Set to true for Phase 1+; rollback to false restores 100% legacy behavior.
export const RESPONSIVE_V2 = true;

// ── Debug: interactive drag-to-rotate diagnostics ───────────────────────
// Set to false to silence. Logs (a) every time the interactive window
// opens/closes with the localFrame that triggered it, and (b) every
// mousedown/touchstart anywhere on the page while that window SHOULD be
// open, including what element actually received the event and what
// document.elementFromPoint() finds there — this is the fastest way to
// tell "event never fired" (canvas pointerEvents stuck at none, or the
// interactive window never actually opened) apart from "event fired on
// the wrong element" (something is covering the canvas).
// Diagnostic logs disabled by default in production to prevent main-thread serialization stalls
const RINGHERO_DEBUG_INTERACTION = false;

// Scroll "beats" — camera + rotation. Material intensities live per-material
// below and are tweened separately so gem and metal can react differently.
//
// 6-beat storyboard:
//   1. Idle ring — no change from load.
//   2. Corner park — cinematic camera move (arc + push-in) carries the
//      ring from its idle hero pose down into the bottom-right corner
//      of the frame, where it stays parked, small, for the rest of the
//      beat.
//   3. A plain camera/ring pose beat.
//   4. Another plain camera/ring pose beat (previously the hand/on-body
//      reveal beat — that logic has been removed; this is now a normal
//      pose target like every other beat).
//   5. Ring returns to center — same camera/pose as Beat 1, giving a
//      "return to home" moment before the closing spin.
//   6. Standing spin — single ring, full 360° turn to close.
//
// Every beat is just camPos/ringRot/ringPosOffset/ringScale (plus
// cornerPark for beat 2's special corner move) — no hand or floor
// geometry involved anymore. The dev "beat coordinate" panel drives
// every beat identically via poseOverrideRef, read every tick below.
export const BEATS = [
  {
    // Keyframe at frame 0
    frame: 0,
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0.00, y: 0.20, z: 4.20, lookAtY: 0.00 },
    ringRot: { x: 1.20, y: -6.30, z: 0.00 },
    metalEnvIntensity: 4.00,
    gemEnvIntensity: 1.20,
    cornerPark: 0.00,
    ringPosOffset: { x: 0.00, y: 0.00, z: 0.00 },
    ringScale: 1.00
  },
  {
    // Keyframe at frame 44
    frame: 44,
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0.00, y: 0.06, z: 3.48, lookAtY: 0.00 },
    ringRot: { x: 0.50, y: 0.10, z: 0.70 },
    metalEnvIntensity: 8.00,
    gemEnvIntensity: 2.00,
    cornerPark: 1.00,
    ringPosOffset: { x: 0.90, y: -0.10, z: 0.50 },
    ringScale: 0.85
  },
  {
    // Keyframe at frame 52
    frame: 52,
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0.00, y: 0.06, z: 3.48, lookAtY: 0.00 },
    ringRot: { x: 0.50, y: 0.10, z: 0.70 },
    metalEnvIntensity: 8.00,
    gemEnvIntensity: 2.00,
    cornerPark: 1.00,
    ringPosOffset: { x: 0.90, y: -0.10, z: 0.50 },
    ringScale: 0.85
  },
  {
    // Keyframe at frame 63
    frame: 63,
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0.00, y: 0.77, z: 8.00, lookAtY: 0.00 },
    ringRot: { x: 0.00, y: -6.30, z: 0.00 },
    metalEnvIntensity: 8.00,
    gemEnvIntensity: 2.00,
    cornerPark: 1.00,
    ringPosOffset: { x: -0.29, y: 0.68, z: 1.34 },
    ringScale: 0.85
  },
  {
    // Keyframe at frame 83
    frame: 83,
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0.03, y: 0.00, z: 3.48, lookAtY: 0.00 },
    ringRot: { x: -0.89, y: -12.71, z: -0.47 },
    metalEnvIntensity: 8.00,
    gemEnvIntensity: 2.00,
    cornerPark: 1.00,
    ringPosOffset: { x: -1.26, y: -0.13, z: 0.92 },
    ringScale: 0.83
  },
  {
    // Keyframe at frame 105
    frame: 105,
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0.03, y: 0.00, z: 3.48, lookAtY: 0.00 },
    ringRot: { x: -0.89, y: -12.71, z: -0.47 },
    metalEnvIntensity: 8.00,
    gemEnvIntensity: 2.00,
    cornerPark: 1.00,
    ringPosOffset: { x: -1.26, y: -0.13, z: 0.92 },
    ringScale: 0.83
  },
  {
    // Keyframe at frame 113
    frame: 113,
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0.00, y: 0.77, z: 8.00, lookAtY: 0.00 },
    ringRot: { x: 0.00, y: -4.78, z: 0.00 },
    metalEnvIntensity: 8.00,
    gemEnvIntensity: 2.00,
    cornerPark: 1.00,
    ringPosOffset: { x: -0.18, y: 0.68, z: 0.00 },
    ringScale: 0.85
  },
  {
    // Keyframe at frame 131
    frame: 131,
    bgTop: "#0d0d10",
    bgBottom: "#19191e",
    camPos: { x: 0.00, y: 0.77, z: 8.00, lookAtY: 0.00 },
    ringRot: { x: 1.06, y: -2.94, z: -0.09 },
    metalEnvIntensity: 7.84,
    gemEnvIntensity: 1.97,
    cornerPark: 0.99,
    ringPosOffset: { x: -0.18, y: 0.68, z: 0.00 },
    ringScale: 0.38
  },
  {
    // Keyframe at frame 156
    frame: 156,
    bgTop: "#0d0d10",
    bgBottom: "#19191e",
    camPos: { x: 0.00, y: 0.77, z: 8.00, lookAtY: 0.00 },
    ringRot: { x: 1.06, y: -2.94, z: -0.09 },
    metalEnvIntensity: 7.84,
    gemEnvIntensity: 1.97,
    cornerPark: 0.99,
    ringPosOffset: { x: -0.18, y: 0.68, z: 0.00 },
    ringScale: 0.38
  },
  {
    // Keyframe at frame 214
    frame: 214,
    bgTop: "#0d0d10",
    bgBottom: "#19191e",
    camPos: { x: 0.00, y: 0.77, z: 8.00, lookAtY: 0.00 },
    ringRot: { x: 0.00, y: 4.84, z: 0.00 },
    metalEnvIntensity: 7.84,
    gemEnvIntensity: 1.97,
    cornerPark: 0.99,
    ringPosOffset: { x: -0.18, y: 0.21, z: 0.00 },
    ringScale: 1.44
  },
  {
    // Keyframe at frame 260
    frame: 260,
    bgTop: "#0d0d10",
    bgBottom: "#19191e",
    camPos: { x: 0.00, y: 0.77, z: 8.00, lookAtY: 0.00 },
    ringRot: { x: 0.00, y: 4.84, z: 0.00 },
    metalEnvIntensity: 7.84,
    gemEnvIntensity: 1.97,
    cornerPark: 0.99,
    ringPosOffset: { x: -0.18, y: 0.21, z: 0.00 },
    ringScale: 1.44
  }
];

// Helper function to clone a beats timeline array (so mobile timeline inherits directly from main timeline)
export function cloneBeatsTimeline(sourceBeats = BEATS) {
  return sourceBeats.map((beat) => ({
    ...beat,
    camPos: { ...beat.camPos },
    ringRot: { ...beat.ringRot },
    ringPosOffset: beat.ringPosOffset ? { ...beat.ringPosOffset } : { x: 0, y: 0, z: 0 },
  }));
}

/**
 * @deprecated (dev panel only)
 * Mobile Timeline — retained for dev-panel manual tuning only.
 * Production uses the single unified BEATS timeline retargeted via viewportProfile.
 */
export const MOBILE_BEATS = [
  {
    frame: 0,
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0.0, y: 0.2, z: 4.2, lookAtY: 0.0 },
    ringRot: { x: 1.2, y: -6.3, z: 0.0 },
    metalEnvIntensity: 4.0,
    gemEnvIntensity: 1.2,
    cornerPark: 0.0,
    ringPosOffset: { x: 0.0, y: 0.0, z: 0.0 },
    ringScale: 0.85,
  },
  {
    frame: 44,
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0.0, y: 0.06, z: 3.48, lookAtY: 0.0 },
    ringRot: { x: 0.3, y: -0.11, z: 0.87 },
    metalEnvIntensity: 8.0,
    gemEnvIntensity: 2.0,
    cornerPark: 1.0,
    ringPosOffset: { x: 0.72, y: -0.38, z: 0.42 },
    ringScale: 0.80,
  },
  {
    frame: 260,
    bgTop: "#101014",
    bgBottom: "#000000",
    camPos: { x: 0.0, y: 0.0, z: 3.4, lookAtY: 0.0 },
    ringRot: { x: 0.12, y: 6.28, z: 0.0 },
    metalEnvIntensity: 5.0,
    gemEnvIntensity: 1.4,
    cornerPark: 0.0,
    ringPosOffset: { x: 0.0, y: 0.0, z: 0.0 },
    ringScale: 0.90,
  },
];

// Fallback diamond HDR base slot calibrations
export const FALLBACK_DEFAULT_GEM_BASE_ENV = {
  power: 0.69,
  gamma: 1.21,
  rot: 0,
  scaleU: 1.01,
  scaleV: 1.01,
  lockScale: true,
  transU: 0.798,
  transV: 0.514,
  lod: 0.5,
  mono: true,
  scaleInvert: false,
};

export const FALLBACK_INTERACTIVE_GEM_BASE_ENV = {
  power: 2.59,
  gamma: 0.78,
  rot: 63,
  scaleU: 1.554,
  scaleV: 3.601,
  lockScale: false,
  transU: -0.083,
  transV: 0.0,
  lod: 0.5,
  mono: true,
  scaleInvert: false,
};

export function computeBlendedGemBaseEnv(
  baseEnv = FALLBACK_DEFAULT_GEM_BASE_ENV,
  targetEnv = FALLBACK_INTERACTIVE_GEM_BASE_ENV,
  localFrame = 0
) {
  let blendT = 0;
  if (localFrame <= 156) {
    blendT = 0;
  } else if (localFrame >= 214) {
    blendT = 1;
  } else {
    const rawT = (localFrame - 156) / (214 - 156);
    blendT = rawT * rawT * (3 - 2 * rawT); // smoothstep
  }

  const b = baseEnv || FALLBACK_DEFAULT_GEM_BASE_ENV;
  const t = targetEnv || FALLBACK_INTERACTIVE_GEM_BASE_ENV;

  return {
    blendT,
    power: THREE.MathUtils.lerp(b.power ?? 0.69, t.power ?? 2.59, blendT),
    gamma: THREE.MathUtils.lerp(b.gamma ?? 1.21, t.gamma ?? 0.78, blendT),
    rot: THREE.MathUtils.lerp(b.rot ?? 0, t.rot ?? 63, blendT),
    scaleU: THREE.MathUtils.lerp(b.scaleU ?? 1.01, t.scaleU ?? 1.554, blendT),
    scaleV: THREE.MathUtils.lerp(b.scaleV ?? 1.01, t.scaleV ?? 3.601, blendT),
    transU: THREE.MathUtils.lerp(b.transU ?? 0.798, t.transU ?? -0.083, blendT),
    transV: THREE.MathUtils.lerp(b.transV ?? 0.514, t.transV ?? 0.0, blendT),
    scaleInvert: blendT > 0.5 ? (t.scaleInvert ? 1.0 : 0.0) : (b.scaleInvert ? 1.0 : 0.0),
    lod: THREE.MathUtils.lerp(b.lod ?? 0.5, t.lod ?? 0.5, blendT),
    mono: blendT > 0.5 ? (t.mono ? 1.0 : 0.0) : (b.mono ? 1.0 : 0.0),
  };
}

export function applyGemBaseEnvToMaterial(mat, blended) {
  if (!mat) return;
  if (mat.isRoughRefractionMaterial) {
    mat.basePower = blended.power;
    mat.baseGamma = blended.gamma;
    mat.baseRot = degToRad(blended.rot);
    if (mat.baseScale) {
      if (typeof mat.baseScale.set === "function") {
        mat.baseScale.set(blended.scaleU, blended.scaleV);
      } else {
        mat.baseScale = new THREE.Vector2(blended.scaleU, blended.scaleV);
      }
    }
    if (mat.baseTrans) {
      if (typeof mat.baseTrans.set === "function") {
        mat.baseTrans.set(blended.transU, blended.transV);
      } else {
        mat.baseTrans = new THREE.Vector2(blended.transU, blended.transV);
      }
    }
    mat.baseScaleInvert = blended.scaleInvert;
    mat.baseLod = blended.lod;
    if (mat.isOctaneDualExr) {
      mat.baseMono = blended.mono;
    }
  }
}

// Fallback metal HDR base slot calibrations
export const FALLBACK_DEFAULT_METAL_BASE_ENV = {
  rot: 0,
  rotation: -65,
  rotationY: -57,
  scale: 45,
  scaleU: 1.0,
  scaleV: 1.0,
  lockScale: true,
  transU: 0.0,
  transV: 0.0,
  scaleInvert: false,
  power: 7,
  gamma: 144,
  saturation: 100,
};

export const FALLBACK_INTERACTIVE_METAL_BASE_ENV = {
  rotation: 0,
  rotationY: 0,
  rot: 0,
  scale: 27,
  scaleU: 0.876,
  scaleV: 0.194,
  lockScale: false,
  transU: -0.045,
  transV: 0.0,
  scaleInvert: false,
  power: 300,
  gamma: 15,
  saturation: 21,
};

// Fallback metal spotlight calibrations
export const FALLBACK_DEFAULT_METAL_SPOT_ENV = {
  enabled: true,
  power: 16.5,
  gamma: 2.05,
  size: 2,
  rot: 0,
  scaleU: 1.01,
  scaleV: 1.01,
  lockScale: true,
  transU: 0.0,
  transV: 0.0,
  scaleInvert: false,
};

export const FALLBACK_INTERACTIVE_METAL_SPOT_ENV = {
  enabled: true,
  power: 16.5,
  gamma: 2.05,
  size: 2,
  rot: 0,
  scaleU: 1.01,
  scaleV: 1.01,
  lockScale: true,
  transU: -0.083,
  transV: -0.248,
  scaleInvert: false,
};

export function computeBlendedMetalEnv(
  baseEnv = FALLBACK_DEFAULT_METAL_BASE_ENV,
  targetEnv = FALLBACK_INTERACTIVE_METAL_BASE_ENV,
  localFrame = 0
) {
  let blendT = 0;
  if (localFrame <= 156) {
    blendT = 0;
  } else if (localFrame >= 214) {
    blendT = 1;
  } else {
    const rawT = (localFrame - 156) / (214 - 156);
    blendT = rawT * rawT * (3 - 2 * rawT); // smoothstep
  }

  const b = baseEnv || FALLBACK_DEFAULT_METAL_BASE_ENV;
  const t = targetEnv || FALLBACK_INTERACTIVE_METAL_BASE_ENV;

  const blendedScale = THREE.MathUtils.lerp(b.scale ?? 45, t.scale ?? 27, blendT);
  const blendedPower = THREE.MathUtils.lerp(b.power ?? 7, t.power ?? 300, blendT);
  const blendedGamma = THREE.MathUtils.lerp(b.gamma ?? 144, t.gamma ?? 15, blendT);

  const trim = computeMetalHdrFactor({
    scale: blendedScale,
    power: blendedPower,
    gamma: blendedGamma,
  });

  return {
    blendT,
    rotation: THREE.MathUtils.lerp(b.rotation ?? -65, t.rotation ?? 0, blendT),
    rotationY: THREE.MathUtils.lerp(b.rotationY ?? -57, t.rotationY ?? 0, blendT),
    rot: THREE.MathUtils.lerp(b.rot ?? 0, t.rot ?? 0, blendT),
    scale: blendedScale,
    scaleU: THREE.MathUtils.lerp(b.scaleU ?? 1.0, t.scaleU ?? 0.876, blendT),
    scaleV: THREE.MathUtils.lerp(b.scaleV ?? 1.0, t.scaleV ?? 0.194, blendT),
    transU: THREE.MathUtils.lerp(b.transU ?? 0.0, t.transU ?? -0.045, blendT),
    transV: THREE.MathUtils.lerp(b.transV ?? 0.0, t.transV ?? 0.0, blendT),
    scaleInvert: blendT > 0.5 ? (t.scaleInvert ? 1.0 : 0.0) : (b.scaleInvert ? 1.0 : 0.0),
    power: blendedPower,
    gamma: blendedGamma,
    saturation: THREE.MathUtils.lerp(b.saturation ?? 100, t.saturation ?? 21, blendT),
    trim,
  };
}

export function computeBlendedMetalSpotEnv(
  baseSpot = FALLBACK_DEFAULT_METAL_SPOT_ENV,
  targetSpot = FALLBACK_INTERACTIVE_METAL_SPOT_ENV,
  localFrame = 0
) {
  let blendT = 0;
  if (localFrame <= 156) {
    blendT = 0;
  } else if (localFrame >= 214) {
    blendT = 1;
  } else {
    const rawT = (localFrame - 156) / (214 - 156);
    blendT = rawT * rawT * (3 - 2 * rawT); // smoothstep
  }

  const b = baseSpot || FALLBACK_DEFAULT_METAL_SPOT_ENV;
  const t = targetSpot || FALLBACK_INTERACTIVE_METAL_SPOT_ENV;

  return {
    blendT,
    enabled: blendT > 0.5 ? (t.enabled !== false) : (b.enabled !== false),
    power: THREE.MathUtils.lerp(b.power ?? 16.5, t.power ?? 16.5, blendT),
    gamma: THREE.MathUtils.lerp(b.gamma ?? 2.05, t.gamma ?? 2.05, blendT),
    rot: THREE.MathUtils.lerp(b.rot ?? 0, t.rot ?? 0, blendT),
    scaleU: THREE.MathUtils.lerp(b.scaleU ?? 1.01, t.scaleU ?? 1.01, blendT),
    scaleV: THREE.MathUtils.lerp(b.scaleV ?? 1.01, t.scaleV ?? 1.01, blendT),
    transU: THREE.MathUtils.lerp(b.transU ?? 0.0, t.transU ?? -0.083, blendT),
    transV: THREE.MathUtils.lerp(b.transV ?? 0.0, t.transV ?? -0.248, blendT),
    scaleInvert: blendT > 0.5 ? (t.scaleInvert ? 1.0 : 0.0) : (b.scaleInvert ? 1.0 : 0.0),
  };
}

export function applyMetalEnvToMaterial(metalMat, blendedMetal, blendedSpot, curBeatIntensity) {
  if (!metalMat) return;

  if (blendedMetal) {
    metalMat.userData._hdrTrim = blendedMetal.trim;
    if (metalMat.userData?.envSaturation) {
      metalMat.userData.envSaturation.value = blendedMetal.saturation / 100;
    }
    if (metalMat.userData?.metalScale) {
      metalMat.userData.metalScale.value.set(blendedMetal.scaleU, blendedMetal.scaleV);
    }
    if (metalMat.userData?.metalTrans) {
      metalMat.userData.metalTrans.value.set(blendedMetal.transU, blendedMetal.transV);
    }
    if (metalMat.userData?.metalRot) {
      metalMat.userData.metalRot.value = degToRad(blendedMetal.rot ?? blendedMetal.rotation ?? 0);
    }
    if (metalMat.userData?.metalScaleInvert) {
      metalMat.userData.metalScaleInvert.value = blendedMetal.scaleInvert;
    }
    if (metalMat.envMapRotation) {
      metalMat.envMapRotation.y = degToRad(blendedMetal.rotation);
      metalMat.envMapRotation.x = degToRad(blendedMetal.rotationY);
    }
    if (typeof curBeatIntensity === "number") {
      metalMat.envMapIntensity = curBeatIntensity * blendedMetal.trim;
    }
  }

  if (blendedSpot) {
    if (metalMat.userData?.hasMetalSpot && metalMat.userData?.envMapMetalSpot?.value) {
      metalMat.userData.hasMetalSpot.value = (blendedSpot.enabled !== false) ? 1.0 : 0.0;
    }
    if (metalMat.userData?.metalSpotPower) {
      metalMat.userData.metalSpotPower.value = blendedSpot.power;
    }
    if (metalMat.userData?.metalSpotGamma) {
      metalMat.userData.metalSpotGamma.value = blendedSpot.gamma;
    }
    if (metalMat.userData?.metalSpotRot) {
      metalMat.userData.metalSpotRot.value = degToRad(blendedSpot.rot ?? 0);
    }
    if (metalMat.userData?.metalSpotScale) {
      metalMat.userData.metalSpotScale.value.set(blendedSpot.scaleU, blendedSpot.scaleV);
    }
    if (metalMat.userData?.metalSpotTrans) {
      metalMat.userData.metalSpotTrans.value.set(blendedSpot.transU, blendedSpot.transV);
    }
    if (metalMat.userData?.metalSpotScaleInvert) {
      metalMat.userData.metalSpotScaleInvert.value = blendedSpot.scaleInvert;
    }
  }
}

/**
 * Wraps an angle in radians to the shortest angular path [-π, +π].
 * Guarantees that rotational unwinding never executes multi-turn helicopter spins.
 */
function wrapAngle(rad) {
  if (!Number.isFinite(rad)) return 0;
  let a = rad % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

export default function RingHero({
  // 3D Model GLB URL (null = auto-routes based on device tier: mobile/cpu -> 420KB, desktop/gpu -> 2.69MB)
  glbUrl = null,
  metalHdrUrl = "/hdr/env_metal_029_1798f1cf07-metal.hdr",
  gemHdrUrl = "/hdr/env_metal_029_1798f1cf07.hdr",
  gemBaseHdrUrl = "/hdr/env_metal_029_1798f1cf07.hdr",
  gemSpotHdrUrl = "/hdr/Diamond-Spotlight-HDRI.exr",
  metalPreset = metalPresets.yellowGold,
  gemPreset = diamondPreset,
  gemMaterialTypeOverride = null,
  dracoDecoderPath = "/draco/",
  scrollContainerSelector = "#scroll-content",
  onMeshesClassified = null,
  customBeats = null,
  customMobileBeats = null,
  activeTimelineMode = "auto", // "auto" | "desktop" | "mobile"

  // Dev-panel HDR controls tuned to production studio defaults
  metalHdrRotation = -65,
  metalHdrRotationY = -57,
  metalHdrRot = 0,
  metalHdrScale = 45,
  metalHdrScaleU = 1.0,
  metalHdrScaleV = 1.0,
  metalHdrTransU = 0.0,
  metalHdrTransV = 0.0,
  metalHdrScaleInvert = false,
  metalHdrPower = 7,
  metalHdrGamma = 144,
  metalHdrSaturation = 100,

  // Metal Spotlight HDR controls (Independent controls, reusing diamond spotlight asset)
  metalSpotEnv = null,
  interactiveMetalSpotEnv = null,
  interactiveMetalHdrConfig = null,
  metalEnvView = 0,
  metalSpotHdrUrl = "/hdr/Metal-Spotlight-HDRI.hdr",
  metalSpotFileNameHint = "Metal-Spotlight-HDRI.hdr",
  onMetalSpotMetaUpdate = null,

  // Three.js Scene Directional Lights
  sceneLightsConfig = null,

  // Diamond Octane Dual-EXR controls (Base & Spotlight slots, View, Gamma Mode)
  gemBaseEnv = null,
  interactiveGemBaseEnv = null,
  gemSpotEnv = null,
  gemEnvView = 0,
  gemGammaMode = 0,
  dispersionStrength = 0.006,
  diamondConfig = null,
  bloomConfig = null,
  bloomIntensity = 0.15,
  bloomThreshold = 0.95,
  glareConfig = null,
  postFxConfig = null,
  onBaseMetaUpdate = null,
  onSpotMetaUpdate = null,
  onRegisterEnvPreview = null,
  onRefreshPreviews = null,
  baseFileNameHint = null,
  spotFileNameHint = null,
  postFxEnabled = false,
  // [EXPERIMENTAL_ATMOSPHERE] Atmospheric depth fog & idle weightless float at frame 0
  experimentalAtmosphere = true,

  // Live pose-override API for the dev "beat coordinate" panel — lets you
  // tune camera position / ring rotation / floor rest height while
  // previewing ANY beat (not just the on-body one), and jump the scroll
  // position straight to a given beat's label. See onPoseOverrideReady
  // below and RingCoordPanel in HeroPage2.jsx.
  onPoseOverrideReady = null,
  onKeyframesUpdate = null,
  onLoadingProgress = null,
  onLoaded = null,

  // Fires every scroll-scrubbed frame with the current beat-to-beat blend
  // state: { fromIndex, toIndex, weight } where weight is 0 (fully on
  // fromIndex) -> 1 (fully on toIndex). Same source data that drives the
  // gradient's bgState/applyBackground tween below, just exposed outward
  // so a background layer (see BeatBackground.jsx) can crossfade its own
  // per-beat scenes in sync with the ring's scroll position.
  onBeatBlendUpdate = null,

  // Fires every scroll-scrubbed frame with overall page scroll debug info:
  // { progress, beatIndex, beatCount, scrollY, docHeight }. progress is
  // 0->1 across the whole scrollContainerSelector timeline (same value
  // ScrollTrigger tracks internally) — purely a read-out, doesn't affect
  // anything. See ScrollDebugHud.jsx for a ready-made on-screen display.
  onScrollDebugUpdate = null,

  // Auto-rotate is active only while the scroll-tweened local frame (0–50
  // scale, same as BEATS[].frame) is within [autoRotateStartFrame,
  // autoRotateEndFrame] — i.e. only during its own beat. Scrolling back up
  // past autoRotateStartFrame, or forward past autoRotateEndFrame, turns
  // it back off. Set autoRotateStartFrame to null/undefined to disable
  // entirely (default — fully backward compatible).
  autoRotateStartFrame = null,
  autoRotateEndFrame = null,
  // Radians/second of the auto-rotate spin while active.
  autoRotateSpeed = 0.35,
  // External control to pause/resume auto-rotation
  autoRotateEnabled = true,

  // Interactive drag-to-rotate — active only while the scroll-tweened
  // local frame is within [interactiveRotateStartFrame,
  // interactiveRotateEndFrame] (same range-gating as auto-rotate above).
  // While active: canvas pointer events are turned on (normally "none" so
  // scroll passes through) and dragging horizontally spins the ring
  // around Y, dragging vertically tilts it around X (clamped) — same
  // math as the standalone 3D viewer's orbit drag, but with NO panning
  // and NO way to move the ring's on-screen position, only its
  // rotation. Auto-rotate (if also active in this range) pauses while
  // the user is actively dragging and resumes once they release.
  interactiveRotateStartFrame = null,
  interactiveRotateEndFrame = null,
  // Drag pixels -> radians. Matches the viewer's onMouseMove feel
  // (theta -= dx * 0.008) for horizontal; vertical uses the same
  // constant for a consistent 1:1 drag feel in both axes.
  interactiveDragSensitivity = 0.008,
  // Clamp on the manual X tilt so drag can't flip the ring upside down —
  // this is an offset ON TOP OF the beat's own scroll-tweened effRotX
  // (±1.35 rad ≈ ±77° allows wide top-table to bottom-shank inspection).
  interactiveTiltClamp = 1.35,
  onDragStateChange = null,
}) {
  const canvasRef = useRef(null);
  const interactiveBoxRef = useRef(null);
  const bgOverlayRef = useRef(null);
  // True only while the scroll-tweened frame is inside the auto-rotate
  // range — re-evaluated every scroll tick below, NOT a one-way latch.
  const autoRotateActiveRef = useRef(false);
  const autoRotateEnabledRef = useRef(autoRotateEnabled);
  autoRotateEnabledRef.current = autoRotateEnabled;
  // Accumulated auto-rotate angle, added on top of the scroll-tweened
  // rotState.y once latched, so the spin continues smoothly from wherever
  // scroll left off instead of snapping to a fixed angle.
  const autoRotateAngleRef = useRef(0);
  const currentSpinYRef = useRef(0);
  // Latched offset when exiting the 360 spin window, wrapped to the shortest
  // angular path [-π, +π] so scroll-up never helicopter-spins or unwinds multi-turn rotations.
  const exitOffsetRef = useRef(0);
  const exitTiltXRef = useRef(0);
  const interactiveOffsetYRef = useRef(0);
  const wasInSpinSectionRef = useRef(false);
  // True only while the scroll-tweened frame is inside the interactive
  // drag-to-rotate range — same range-check pattern as auto-rotate.
  const interactiveActiveRef = useRef(false);
  // Manual rotation offset accumulated from drag input, added on top of
  // the scroll-tweened / auto-rotate rotation. { y: spin, x: tilt }.
  const manualRotRef = useRef({ x: 0, y: 0 });
  // Pointer-drag bookkeeping for the interactive rotate handlers below —
  // mirrors the standalone 3D viewer's dragRef shape (dragging/prevX/
  // prevY), minus anything pan-related since this ring can only be
  // spun/zoomed, never moved.
  const dragStateRef = useRef({ dragging: false, prevX: 0, prevY: 0 });
  // "Drag to rotate" hint badge shown at the bottom of the viewport during
  // the interactive window (Beat 5). Remains visible throughout the section.
  const [showDragHint, setShowDragHint] = useState(false);
  const dismissedOnceRef = useRef(false);
  const [isMobileMode, setIsMobileMode] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [gpuUnsupported, setGpuUnsupported] = useState(false);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [sceneStatus, setSceneStatus] = useState("loading"); // "loading" | "ready" | "failed"
  const [sceneEpoch, setSceneEpoch] = useState(0);
  const rebuildCountRef = useRef(0);
  const deviceTier = getDeviceTier();
  const isFallbackDevice = deviceTier.isFallbackDevice;
  const isWeakDesktop = Boolean(deviceTier.isWeakDesktop);
  const isMobileTier = Boolean(deviceTier.tier === "mobile" || deviceTier.isMobile || isWeakDesktop);
  const isLowOrCpu = Boolean(deviceTier.isLowOrMinimal || deviceTier.tier === "minimal" || deviceTier.tier === "low");
  const defaultGlbUrl = (isMobileTier || isLowOrCpu)
    ? "/models/ring-draco-mobile.glb?v=420k"
    : "/models/ring-draco.glb?v=quality";
  const effectiveGlbUrl = glbUrl || defaultGlbUrl;
  // ── Debug-only diagnostics for the interactive drag window ────────────
  // Keeps the last computed localFrame / range values around so the
  // window-level diagnostic listener below (RINGHERO_DEBUG_INTERACTION)
  // can report them even though it fires outside the scroll callback.
  const debugFrameStateRef = useRef({ localFrame: 0, inRange: false });
  // Holds the active list of beats/keyframes (cloned from exported BEATS and MOBILE_BEATS arrays,
  // continuously updated as the single source of truth for all timeline edits)
  const beatsRef = useRef(cloneBeatsTimeline(BEATS));
  const mobileBeatsRef = useRef(cloneBeatsTimeline(MOBILE_BEATS));

  // Refs the ticker/apply-config code below read from every frame, plus
  // a "live materials" ref so a separate lightweight effect (below) can
  // push new HDR-config values onto already-built materials without
  // reloading the GLB/HDR.
  const metalMaterialRef = useRef(null);
  const gemMaterialsRef = useRef([]);
  const gemMeshesRef = useRef([]);
  const spotDilatorRef = useRef(null);
  const envPreviewRendererRef = useRef(null);
  const noiseEffectRef = useRef(null);
  const vignetteEffectRef = useRef(null);
  const keyLightRef = useRef(null);
  const fillLightRef = useRef(null);
  const gemEnvTexturesRef = useRef({
    base: null,
    rawSpot: null,
    spot: null,
    metalEnvMap: null,
    metalRaw: null,
    metalSpotRaw: null,
    metalSpot: null,
    baseMeta: null,
    spotMeta: null,
    metalSpotMeta: null,
    prevBaseBlobUrl: null,
    prevSpotBlobUrl: null,
    prevMetalBlobUrl: null,
    prevMetalSpotBlobUrl: null,
  });
  const bloomEffectRef = useRef(null);
  const pmremRef = useRef(null);
  const lastAppliedGemBlendRef = useRef(-1);
  const lastAppliedMetalBlendRef = useRef(-1);
  const lastAppliedMetalSpotBlendRef = useRef(-1);
  const metalEnvStateRef = useRef({ value: BEATS[0].metalEnvIntensity });

  const effectiveBaseHdrUrl = gemBaseHdrUrl || gemHdrUrl;

  const hdrConfigRef = useRef({
    metalHdrRotation,
    metalHdrRotationY,
    metalHdrRot,
    metalHdrScale,
    metalHdrScaleU,
    metalHdrScaleV,
    metalHdrTransU,
    metalHdrTransV,
    metalHdrScaleInvert,
    metalHdrPower,
    metalHdrGamma,
    metalHdrSaturation,
    interactiveMetalHdrConfig,

    metalSpotEnv,
    interactiveMetalSpotEnv,
    metalEnvView,

    gemBaseEnv,
    interactiveGemBaseEnv,
    gemSpotEnv,
    gemEnvView,
    gemGammaMode,

    dispersionStrength,
    bloomConfig,
    bloomIntensity,
    bloomThreshold,
    glareConfig,
    postFxConfig,
    sceneLightsConfig,
  });

  // Live pose-override state — null fields mean "use the scroll-tweened
  // value as normal"; a non-null field wins over the tween every frame,
  // regardless of which beat is currently active. This is what makes the
  // dev panel work "in all beats": you don't have to scroll-scrub a beat
  // to preview a change, you just flip override on and drag sliders.
  const poseOverrideRef = useRef({
    camPos: null, // { x, y, z } | null
    ringRot: null, // { x, y, z } | null
    ringPosOffset: null, // { x, y, z } | null — added on top of the beat's own ring position
    ringScale: null, // number | null — multiplier on top of the beat's own ring scale
    cornerPark: null,
  });

  // [EXPERIMENTAL_ATMOSPHERE] Refs tracking atmosphere weight, stillness, phase & mouse parallax across beats 1–4
  const mouseParallaxRef = useRef({ x: 0, y: 0 });
  const atmosphereWeightRef = useRef(1.0);
  const idlePhaseRef = useRef(0);
  const lastMotionFrameRef = useRef(0);
  const lastMotionTimeRef = useRef(0);
  const settleFramesRef = useRef(0);

  // Mobile mode detection and automatic dismissal of interaction on scroll / wheel
  useEffect(() => {
    const updateProfile = () => {
      const isP =
        typeof window !== "undefined" &&
        (window.innerWidth < 768 || window.innerHeight > window.innerWidth);
      setIsMobileMode(isP);
    };
    updateProfile();
    window.addEventListener("resize", updateProfile);
    window.addEventListener("orientationchange", updateProfile);

    return () => {
      window.removeEventListener("resize", updateProfile);
      window.removeEventListener("orientationchange", updateProfile);
    };
  }, []);

  // Keep the ref current and re-apply immediately
  useEffect(() => {
    hdrConfigRef.current = {
      metalHdrRotation,
      metalHdrRotationY,
      metalHdrRot,
      metalHdrScale,
      metalHdrScaleU,
      metalHdrScaleV,
      metalHdrTransU,
      metalHdrTransV,
      metalHdrScaleInvert,
      metalHdrPower,
      metalHdrGamma,
      metalHdrSaturation,

      metalSpotEnv,
      interactiveMetalSpotEnv,
      interactiveMetalHdrConfig,
      metalEnvView,

      gemBaseEnv,
      interactiveGemBaseEnv,
      gemSpotEnv,
      gemEnvView,
      gemGammaMode,

      dispersionStrength,
      diamondConfig,
      bloomConfig,
      bloomIntensity,
      bloomThreshold,
      glareConfig,
      postFxConfig,
      sceneLightsConfig,
    };
    applyHdrConfigToLiveMaterials();
    onRefreshPreviews?.();
  }, [
    metalHdrRotation,
    metalHdrRotationY,
    metalHdrRot,
    metalHdrScale,
    metalHdrScaleU,
    metalHdrScaleV,
    metalHdrTransU,
    metalHdrTransV,
    metalHdrScaleInvert,
    metalHdrPower,
    metalHdrGamma,
    metalHdrSaturation,
    metalSpotEnv,
    interactiveMetalSpotEnv,
    interactiveMetalHdrConfig,
    metalEnvView,
    sceneLightsConfig,
    gemBaseEnv,
    interactiveGemBaseEnv,
    gemSpotEnv,
    gemEnvView,
    gemGammaMode,
    dispersionStrength,
    diamondConfig,
    bloomConfig,
    bloomIntensity,
    bloomThreshold,
    glareConfig,
    postFxConfig,
  ]);

  function applyHdrConfigToLiveMaterials(customCfg) {
    const cfg = customCfg || hdrConfigRef.current;
    lastAppliedGemBlendRef.current = -1;
    lastAppliedMetalBlendRef.current = -1;
    lastAppliedMetalSpotBlendRef.current = -1;

    // Diamond Octane Dual-EXR & Optical Physics Settings
    const localFrame = debugFrameStateRef.current?.localFrame ?? 0;

    // Metal HDR & Spotlight
    const baseMetalEnv = {
      rotation: cfg.metalHdrRotation,
      rotationY: cfg.metalHdrRotationY,
      rot: cfg.metalHdrRot,
      scale: cfg.metalHdrScale,
      scaleU: cfg.metalHdrScaleU,
      scaleV: cfg.metalHdrScaleV,
      transU: cfg.metalHdrTransU,
      transV: cfg.metalHdrTransV,
      scaleInvert: cfg.metalHdrScaleInvert,
      power: cfg.metalHdrPower,
      gamma: cfg.metalHdrGamma,
      saturation: cfg.metalHdrSaturation,
    };
    const blendedMetal = computeBlendedMetalEnv(
      baseMetalEnv,
      cfg.interactiveMetalHdrConfig,
      localFrame
    );
    const blendedMetalSpot = computeBlendedMetalSpotEnv(
      cfg.metalSpotEnv,
      cfg.interactiveMetalSpotEnv,
      localFrame
    );

    const metalMat = metalMaterialRef.current;
    if (metalMat) {
      const curBeatIntensity = metalEnvStateRef.current?.value ?? BEATS[0].metalEnvIntensity;
      applyMetalEnvToMaterial(
        metalMat,
        blendedMetal,
        blendedMetalSpot,
        curBeatIntensity
      );

      // Metal Spotlight texture configuration (Independent controls & separate HDR/EXR asset)
      const spotTex = gemEnvTexturesRef.current.metalSpot || gemEnvTexturesRef.current.metalSpotRaw || gemEnvTexturesRef.current.spot || gemEnvTexturesRef.current.rawSpot;
      const mSpot = cfg.metalSpotEnv || {};
      const spotEnabled = (blendedMetalSpot.enabled !== false && mSpot.enabled !== false) && Boolean(spotTex);

      if (metalMat.userData?.envMapMetalSpot && spotTex) {
        metalMat.userData.envMapMetalSpot.value = spotTex;
      }
      if (metalMat.userData?.hasMetalSpot) {
        metalMat.userData.hasMetalSpot.value = spotEnabled ? 1.0 : 0.0;
      }
      if (metalMat.userData?.metalEnvView) {
        metalMat.userData.metalEnvView.value = cfg.metalEnvView ?? 0;
      }
    }

    // Diamond Octane Dual-EXR & Optical Physics Settings
    const blendedBase = computeBlendedGemBaseEnv(
      cfg.gemBaseEnv,
      cfg.interactiveGemBaseEnv,
      localFrame
    );
    const spotEnv = cfg.gemSpotEnv || {};
    const debugView = cfg.gemEnvView ?? 0;
    const gammaMode = cfg.gemGammaMode ?? 0;
    const dCfg = cfg.diamondConfig || {};
    const dispersion = typeof dCfg.dispersion === "number" ? dCfg.dispersion : (typeof cfg.dispersionStrength === "number" ? cfg.dispersionStrength : 0.006);
    const roughness = typeof dCfg.roughness === "number" ? dCfg.roughness : 0.0;
    const ior = typeof dCfg.ior === "number" ? dCfg.ior : 2.417;
    const bounces = typeof dCfg.bounces === "number" ? dCfg.bounces : 5;
    const fresnel = typeof dCfg.fresnel === "number" ? dCfg.fresnel : 0.15;
    const color = dCfg.color || "#ffffff";
    const envMapIntensity = typeof dCfg.envMapIntensity === "number" ? dCfg.envMapIntensity : 1.0;
    const opacity = typeof dCfg.opacity === "number" ? dCfg.opacity : 1.0;

    gemMaterialsRef.current.forEach((mat) => {
      if (!mat) return;
      mat.userData = mat.userData || {};
      mat.userData._hdrTrim = 1.0;

      if (mat.isRoughRefractionMaterial) {
        mat.aberrationStrength = dispersion;
        mat.roughness = roughness;
        mat.ior = ior;
        mat.bounces = bounces;
        mat.fresnel = fresnel;
        mat.color = color;
        mat.envMapIntensity = envMapIntensity;
        mat.opacity = opacity;

        applyGemBaseEnvToMaterial(mat, blendedBase);

        if (mat.isOctaneDualExr) {
          // Desktop Octane dual-EXR material
          mat.debugView = debugView;
          mat.gammaMode = gammaMode;
          if (typeof mat.updateDefines === "function") {
            try {
              mat.updateDefines(dispersion);
            } catch {
              /* ignore */
            }
          }

          mat.spotPower = typeof spotEnv.power === "number" ? spotEnv.power : 4.0;
          mat.spotGamma = typeof spotEnv.gamma === "number" ? spotEnv.gamma : 1.8;
          mat.spotRot = degToRad(spotEnv.rot ?? 0);
          mat.spotScale.set(spotEnv.scaleU ?? 1.0, spotEnv.scaleV ?? 1.0);
          mat.spotTrans.set(spotEnv.transU ?? 0.0, spotEnv.transV ?? 0.0);
          mat.spotScaleInvert = spotEnv.scaleInvert ? 1.0 : 0.0;
          mat.spotLod = typeof spotEnv.lod === "number" ? spotEnv.lod : 0.0;
          mat.spotMono = spotEnv.mono ? 1.0 : 0.0;
        }
      } else if (mat.isMatteGemMaterial || mat.isMeshPhysicalMaterial) {
        mat.roughness = roughness;
        mat.ior = ior;
        if (color && mat.color) mat.color.set(color);
        mat.envMapIntensity = envMapIntensity;
        mat.opacity = opacity;
        if (typeof dCfg.transmission === "number") mat.transmission = dCfg.transmission;
        if (typeof dCfg.thickness === "number") mat.thickness = dCfg.thickness;
        if (typeof dCfg.attenuationDistance === "number") mat.attenuationDistance = dCfg.attenuationDistance;
        if (dCfg.attenuationColor && mat.attenuationColor) mat.attenuationColor.set(dCfg.attenuationColor);
        if (typeof dCfg.clearcoat === "number") mat.clearcoat = dCfg.clearcoat;
        if (typeof dCfg.clearcoatRoughness === "number") mat.clearcoatRoughness = dCfg.clearcoatRoughness;
        mat.needsUpdate = true;
      }
    });

    // Update Bloom effect live (iJewel soft white spill)
    if (bloomEffectRef.current) {
      const bCfg = cfg.bloomConfig;
      if (bCfg) {
        if ("intensity" in bCfg && bloomEffectRef.current.strength !== undefined) {
          bloomEffectRef.current.strength = bCfg.intensity;
        }
        if ("threshold" in bCfg && bloomEffectRef.current.threshold !== undefined) {
          bloomEffectRef.current.threshold = bCfg.threshold;
        }
        if ("radius" in bCfg && bloomEffectRef.current.radius !== undefined) {
          bloomEffectRef.current.radius = bCfg.radius;
        }
        if ("enabled" in bCfg) {
          bloomEffectRef.current.enabled = bCfg.enabled;
        }
      }
    }

    // Three.js Scene Directional Lights
    const lCfg = cfg.sceneLightsConfig || {};
    const lightsOn = Boolean(lCfg.enabled);
    if (keyLightRef.current) {
      keyLightRef.current.visible = lightsOn && lCfg.keyLightEnabled !== false;
      keyLightRef.current.intensity = typeof lCfg.keyLightIntensity === "number" ? lCfg.keyLightIntensity : 1.2;
    }
    if (fillLightRef.current) {
      fillLightRef.current.visible = lightsOn && lCfg.fillLightEnabled !== false;
      fillLightRef.current.intensity = typeof lCfg.fillLightIntensity === "number" ? lCfg.fillLightIntensity : 0.4;
    }
  }

  // Pre-pass spot size dilation effect (Task C2)
  const prevSpotSizeRef = useRef(gemSpotEnv?.size ?? 2);
  useEffect(() => {
    const currentSize = gemSpotEnv?.size ?? 2;
    if (prevSpotSizeRef.current !== currentSize) {
      prevSpotSizeRef.current = currentSize;
      if (spotDilatorRef.current && gemEnvTexturesRef.current.rawSpot) {
        let effectiveSpot = gemEnvTexturesRef.current.rawSpot;
        if (currentSize > 0) {
          effectiveSpot = spotDilatorRef.current.dilate(gemEnvTexturesRef.current.rawSpot, currentSize);
        }
        gemEnvTexturesRef.current.spot = effectiveSpot;
        gemMaterialsRef.current.forEach((mat) => {
          if (mat && mat.isRoughRefractionMaterial) {
            mat.envMapSpot = effectiveSpot;
            mat.needsUpdate = true;
          }
        });
        onRefreshPreviews?.();
      }
    }
  }, [gemSpotEnv?.size, onRefreshPreviews]);

  // Live dynamic hot-swapping for Base EXR, Spotlight EXR, Metal HDR, and Metal Spotlight HDR/EXR
  const liveLoadedTexturesRef = useRef({
    baseHdrUrl: effectiveBaseHdrUrl,
    baseMono: gemBaseEnv?.mono ?? true,
    spotHdrUrl: gemSpotHdrUrl,
    spotMono: gemSpotEnv?.mono ?? true,
    metalHdrUrl,
    metalSpotHdrUrl,
  });

  useEffect(() => {
    // 1. Base EXR swap or Mono toggle
    const baseMono = gemBaseEnv?.mono ?? true;
    if (
      liveLoadedTexturesRef.current.baseHdrUrl !== effectiveBaseHdrUrl ||
      liveLoadedTexturesRef.current.baseMono !== baseMono
    ) {
      liveLoadedTexturesRef.current.baseHdrUrl = effectiveBaseHdrUrl;
      liveLoadedTexturesRef.current.baseMono = baseMono;
      if (effectiveBaseHdrUrl) {
        loadRawEquirect(effectiveBaseHdrUrl, { mono: baseMono, fileName: baseFileNameHint })
          .then(({ texture, meta }) => {
            if (gemEnvTexturesRef.current.base && gemEnvTexturesRef.current.base !== texture) {
              gemEnvTexturesRef.current.base.dispose();
            }
            if (
              gemEnvTexturesRef.current.prevBaseBlobUrl &&
              gemEnvTexturesRef.current.prevBaseBlobUrl !== effectiveBaseHdrUrl &&
              gemEnvTexturesRef.current.prevBaseBlobUrl.startsWith("blob:")
            ) {
              URL.revokeObjectURL(gemEnvTexturesRef.current.prevBaseBlobUrl);
            }
            if (effectiveBaseHdrUrl.startsWith("blob:")) {
              gemEnvTexturesRef.current.prevBaseBlobUrl = effectiveBaseHdrUrl;
            }

            gemEnvTexturesRef.current.base = texture;
            gemEnvTexturesRef.current.baseMeta = meta;
            onBaseMetaUpdate?.(meta);

            gemMaterialsRef.current.forEach((mat) => {
              if (mat && mat.isRoughRefractionMaterial) {
                mat.envMapBase = texture;
                mat.baseMono = baseMono ? 1.0 : 0.0;
                mat.needsUpdate = true;
              }
            });
            onRefreshPreviews?.();
          })
          .catch((err) => {
            console.error(
              "[RingHero] Failed to dynamically hot-swap Base EXR:",
              err,
            );
            onBaseMetaUpdate?.({ error: err?.message || String(err) });
          });
      }
    }

    // 2. Spotlight EXR swap or Mono toggle
    const spotMono = gemSpotEnv?.mono ?? true;
    if (
      liveLoadedTexturesRef.current.spotHdrUrl !== gemSpotHdrUrl ||
      liveLoadedTexturesRef.current.spotMono !== spotMono
    ) {
      liveLoadedTexturesRef.current.spotHdrUrl = gemSpotHdrUrl;
      liveLoadedTexturesRef.current.spotMono = spotMono;
      if (gemSpotHdrUrl) {
        loadRawEquirect(gemSpotHdrUrl, { mono: spotMono, fileName: spotFileNameHint })
          .then(({ texture, meta }) => {
            if (gemEnvTexturesRef.current.rawSpot && gemEnvTexturesRef.current.rawSpot !== texture) {
              gemEnvTexturesRef.current.rawSpot.dispose();
            }
            if (
              gemEnvTexturesRef.current.prevSpotBlobUrl &&
              gemEnvTexturesRef.current.prevSpotBlobUrl !== gemSpotHdrUrl &&
              gemEnvTexturesRef.current.prevSpotBlobUrl.startsWith("blob:")
            ) {
              URL.revokeObjectURL(gemEnvTexturesRef.current.prevSpotBlobUrl);
            }
            if (gemSpotHdrUrl.startsWith("blob:")) {
              gemEnvTexturesRef.current.prevSpotBlobUrl = gemSpotHdrUrl;
            }

            gemEnvTexturesRef.current.rawSpot = texture;
            const spotSize = gemSpotEnv?.size ?? 2;
            let effectiveSpot = texture;
            if (spotDilatorRef.current && spotSize > 0) {
              effectiveSpot = spotDilatorRef.current.dilate(texture, spotSize);
            }
            gemEnvTexturesRef.current.spot = effectiveSpot;
            gemEnvTexturesRef.current.spotMeta = meta;
            onSpotMetaUpdate?.(meta);

            gemMaterialsRef.current.forEach((mat) => {
              if (mat && mat.isRoughRefractionMaterial) {
                mat.envMapSpot = effectiveSpot;
                mat.hasSpotMap = true;
                mat.spotMono = spotMono ? 1.0 : 0.0;
                mat.needsUpdate = true;
              }
            });
            if (metalMaterialRef.current?.userData?.envMapMetalSpot) {
              metalMaterialRef.current.userData.envMapMetalSpot.value = effectiveSpot;
              metalMaterialRef.current.userData.hasMetalSpot.value = (hdrConfigRef.current.metalSpotEnv?.enabled !== false && effectiveSpot) ? 1.0 : 0.0;
            }
            onRefreshPreviews?.();
          })
          .catch((err) => {
            console.error(
              "[RingHero] Failed to dynamically hot-swap Spotlight EXR:",
              err,
            );
            onSpotMetaUpdate?.({ error: err?.message || String(err) });
          });
      } else {
        if (gemEnvTexturesRef.current.rawSpot) {
          gemEnvTexturesRef.current.rawSpot.dispose();
          gemEnvTexturesRef.current.rawSpot = null;
        }
        if (gemEnvTexturesRef.current.spot) {
          gemEnvTexturesRef.current.spot = null;
        }
        spotDilatorRef.current?.disposeRenderTargets();
        gemEnvTexturesRef.current.spotMeta = null;
        onSpotMetaUpdate?.(null);

        gemMaterialsRef.current.forEach((mat) => {
          if (mat && mat.isRoughRefractionMaterial) {
            mat.envMapSpot = null;
            mat.hasSpotMap = false;
            mat.needsUpdate = true;
          }
        });
        if (metalMaterialRef.current?.userData?.hasMetalSpot) {
          metalMaterialRef.current.userData.hasMetalSpot.value = 0.0;
        }
      }
    }

    // 3. Metal HDR/EXR swap
    if (liveLoadedTexturesRef.current.metalHdrUrl !== metalHdrUrl) {
      liveLoadedTexturesRef.current.metalHdrUrl = metalHdrUrl;
      if (metalHdrUrl && pmremRef.current) {
        loadEnvironmentTexture(metalHdrUrl, pmremRef.current)
          .then((tex) => {
            if (metalMaterialRef.current) {
              const oldEnv = metalMaterialRef.current.envMap;
              if (oldEnv && oldEnv !== tex) {
                oldEnv.dispose?.();
              }
              if (
                gemEnvTexturesRef.current.prevMetalBlobUrl &&
                gemEnvTexturesRef.current.prevMetalBlobUrl !== metalHdrUrl &&
                gemEnvTexturesRef.current.prevMetalBlobUrl.startsWith("blob:")
              ) {
                URL.revokeObjectURL(gemEnvTexturesRef.current.prevMetalBlobUrl);
              }
              if (metalHdrUrl.startsWith("blob:")) {
                gemEnvTexturesRef.current.prevMetalBlobUrl = metalHdrUrl;
              }

              gemEnvTexturesRef.current.metalEnvMap = tex;
              gemEnvTexturesRef.current.metalRaw = tex?._rawTexture || null;
              metalMaterialRef.current.envMap = tex;
              metalMaterialRef.current.needsUpdate = true;
              gemMaterialsRef.current.forEach((mat) => {
                if (mat && mat.isMatteGemMaterial) {
                  mat.envMap = tex;
                  mat.needsUpdate = true;
                }
              });
              applyHdrConfigToLiveMaterials();
              onRefreshPreviews?.();
            }
          })
          .catch((err) => {
            console.error(
              "[RingHero] Failed to dynamically hot-swap Metal HDR/EXR:",
              err,
            );
          });
      }
    }

    // 4. Metal Spotlight separate HDR/EXR swap
    if (liveLoadedTexturesRef.current.metalSpotHdrUrl !== metalSpotHdrUrl) {
      liveLoadedTexturesRef.current.metalSpotHdrUrl = metalSpotHdrUrl;
      if (metalSpotHdrUrl) {
        loadRawEquirect(metalSpotHdrUrl, { mono: false, fileName: metalSpotFileNameHint })
          .then(({ texture, meta }) => {
            if (
              gemEnvTexturesRef.current.metalSpotRaw &&
              gemEnvTexturesRef.current.metalSpotRaw !== texture &&
              gemEnvTexturesRef.current.metalSpotRaw !== gemEnvTexturesRef.current.rawSpot
            ) {
              gemEnvTexturesRef.current.metalSpotRaw.dispose();
            }
            if (
              gemEnvTexturesRef.current.prevMetalSpotBlobUrl &&
              gemEnvTexturesRef.current.prevMetalSpotBlobUrl !== metalSpotHdrUrl &&
              gemEnvTexturesRef.current.prevMetalSpotBlobUrl.startsWith("blob:")
            ) {
              URL.revokeObjectURL(gemEnvTexturesRef.current.prevMetalSpotBlobUrl);
            }
            if (metalSpotHdrUrl.startsWith("blob:")) {
              gemEnvTexturesRef.current.prevMetalSpotBlobUrl = metalSpotHdrUrl;
            }

            gemEnvTexturesRef.current.metalSpotRaw = texture;
            gemEnvTexturesRef.current.metalSpot = texture;
            gemEnvTexturesRef.current.metalSpotMeta = meta;
            onMetalSpotMetaUpdate?.(meta);

            if (metalMaterialRef.current?.userData?.envMapMetalSpot) {
              metalMaterialRef.current.userData.envMapMetalSpot.value = texture;
              metalMaterialRef.current.userData.hasMetalSpot.value =
                (hdrConfigRef.current.metalSpotEnv?.enabled !== false && texture) ? 1.0 : 0.0;
            }
            onRefreshPreviews?.();
          })
          .catch((err) => {
            console.error(
              "[RingHero] Failed to dynamically hot-swap Metal Spotlight HDR/EXR:",
              err,
            );
            onMetalSpotMetaUpdate?.({ error: err?.message || String(err) });
          });
      } else {
        if (
          gemEnvTexturesRef.current.metalSpotRaw &&
          gemEnvTexturesRef.current.metalSpotRaw !== gemEnvTexturesRef.current.rawSpot
        ) {
          gemEnvTexturesRef.current.metalSpotRaw.dispose();
        }
        gemEnvTexturesRef.current.metalSpotRaw = null;
        gemEnvTexturesRef.current.metalSpot = null;
        gemEnvTexturesRef.current.metalSpotMeta = null;
        onMetalSpotMetaUpdate?.(null);

        const fallbackTex = gemEnvTexturesRef.current.spot || gemEnvTexturesRef.current.rawSpot;
        if (metalMaterialRef.current?.userData?.envMapMetalSpot) {
          metalMaterialRef.current.userData.envMapMetalSpot.value = fallbackTex || null;
          metalMaterialRef.current.userData.hasMetalSpot.value =
            (hdrConfigRef.current.metalSpotEnv?.enabled !== false && fallbackTex) ? 1.0 : 0.0;
        }
        onRefreshPreviews?.();
      }
    }
  }, [effectiveBaseHdrUrl, gemBaseEnv?.mono, gemSpotHdrUrl, gemSpotEnv?.mono, metalHdrUrl, metalSpotHdrUrl, onRefreshPreviews]);

  // Live dynamic hot-swapping for Metal Preset (virus/fog spreading transition)
  const activeMetalKeyRef = useRef(metalPreset?.key);
  useEffect(() => {
    const metalMat = metalMaterialRef.current;
    if (!metalMat || !metalPreset) return;

    if (activeMetalKeyRef.current === metalPreset.key) return;
    activeMetalKeyRef.current = metalPreset.key;

    const targetColor = new THREE.Color(metalPreset.color);
    const targetSpecular =
      metalPreset.specularColor !== undefined
        ? new THREE.Color(metalPreset.specularColor)
        : null;
    const targetRoughness = Math.max(
      metalPreset.roughness ?? 0.08,
      metalPreset.minRoughness ?? 0.045
    );

    const uProgress = metalMat.userData?.metalTransitionProgress;
    const uFrom = metalMat.userData?.metalFromColor;
    const uTo = metalMat.userData?.metalToColor;
    const uSeed = metalMat.userData?.metalTransitionSeed;

    gsap.killTweensOf(metalMat);
    if (metalMat.specularColor) gsap.killTweensOf(metalMat.specularColor);

    if (uProgress && uFrom && uTo) {
      gsap.killTweensOf(uProgress);

      // Anchor from-color at current visual midpoint so rapid clicks never pop
      const currentBlended = uFrom.value.clone().lerp(uTo.value, uProgress.value);
      uFrom.value.copy(currentBlended);
      uTo.value.copy(targetColor);

      // Gentle horizontal lean for bottom-to-top upward mist sweep
      if (uSeed) {
        if (metalPreset.key === "yellow_gold") {
          uSeed.value.set(0.08, -1.0, 0.0);
        } else if (metalPreset.key === "white_gold") {
          uSeed.value.set(0.0, -1.0, 0.0);
        } else {
          uSeed.value.set(-0.08, -1.0, 0.0);
        }
      }

      metalMat.color.copy(targetColor);
      uProgress.value = 0.0;

      gsap.to(uProgress, {
        value: 1.0,
        duration: 2.4,
        ease: "sine.inOut",
      });
    } else {
      gsap.to(metalMat.color, {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b,
        duration: 1.2,
        ease: "sine.inOut",
      });
    }

    if (metalMat.specularColor && targetSpecular) {
      gsap.to(metalMat.specularColor, {
        r: targetSpecular.r,
        g: targetSpecular.g,
        b: targetSpecular.b,
        duration: 2.4,
        ease: "sine.inOut",
      });
    }

    gsap.to(metalMat, {
      roughness: targetRoughness,
      clearcoat: metalPreset.clearcoat ?? 0.25,
      clearcoatRoughness: metalPreset.clearcoatRoughness ?? 0.14,
      duration: 2.4,
      ease: "sine.inOut",
      onComplete: () => {
        applyHdrConfigToLiveMaterials();
      },
    });
  }, [metalPreset]);

  // Live dynamic hot-swapping for Gem Material Mode (refraction / matte) & gemPreset
  useEffect(() => {
    if (!gemMeshesRef.current || gemMeshesRef.current.length === 0) return;

    const isFallbackDevice = Boolean(
      deviceTier.tier === "low" ||
      deviceTier.tier === "minimal" ||
      deviceTier.isLowOrMinimal
    );
    const isMatteMode = isFallbackDevice || gemMaterialTypeOverride === "matte";

    // Fast path: if meshes already have RoughRefractionMaterial with isMatte support, simply toggle live!
    let allUpdated = true;
    for (const child of gemMeshesRef.current) {
      if (child.material && "isMatte" in child.material) {
        child.material.isMatte = isMatteMode ? 1.0 : 0.0;
        child.material.ior = isMatteMode ? (diamondConfig?.ior ?? 1.5) : (diamondConfig?.ior ?? gemPreset.ior ?? 2.417);
        child.material.needsUpdate = true;
      } else {
        allUpdated = false;
        break;
      }
    }

    if (allUpdated) {
      applyHdrConfigToLiveMaterials();
      return;
    }

    const effectiveGemPreset = isMatteMode
      ? { ...gemPreset, ...diamondConfig, materialType: "matte", ior: diamondConfig?.ior ?? 1.5 }
      : { ...gemPreset, ...diamondConfig, ...(gemMaterialTypeOverride ? { materialType: gemMaterialTypeOverride } : {}) };

    const pmremEnv = gemEnvTexturesRef.current.metalEnvMap || null;

    const newMaterials = gemMeshesRef.current.map((child) => {
      let mat = getMeshGemMaterial({
        mesh: child,
        preset: effectiveGemPreset,
        envMapBase: gemEnvTexturesRef.current.base,
        envMapSpot: gemEnvTexturesRef.current.spot,
        deviceTier,
        pmremEnv,
      });
      if ("envMapIntensity" in mat) {
        const intensityScale = mat.isMobileGemMaterial ? 2.0 : 1.0;
        mat.envMapIntensity = BEATS[0].gemEnvIntensity * intensityScale;
      }
      mat.fog = false;

      if (child.material && child.material !== mat) {
        child.material.dispose?.();
      }

      child.material = mat;

      if (mat.isRoughRefractionMaterial && !mat.isBaked) {
        try {
          attachBvhToGemMaterial(child, mat);
        } catch (bvhErr) {
          console.warn("RingHero: BVH attach failed on material switch:", bvhErr);
        }
      }

      child.castShadow = false;
      child.receiveShadow = false;
      return mat;
    });

    gemMaterialsRef.current = newMaterials;
    applyHdrConfigToLiveMaterials();
  }, [gemMaterialTypeOverride, gemPreset, deviceTier.tier]);

  useEffect(() => {
    const canvas = canvasRef.current;
    // pointerEvents starts "none" (scroll/clicks pass through to the page,
    // same as before) and is only ever flipped to "auto" by the
    // interactive-rotate range-check further down — set imperatively here
    // (not via the JSX style prop) so a React re-render elsewhere in this
    // component (e.g. the dev-panel state updates) can never stomp it
    // back to "none" while a drag-to-rotate window is active.
    if (canvas) canvas.style.pointerEvents = "none";
    if (interactiveBoxRef.current) {
      interactiveBoxRef.current.style.pointerEvents = "none";
      interactiveBoxRef.current.style.display = "none";
    }
    interactiveActiveRef.current = false;

    let renderer, scene, camera, ring;
    let metalMaterial;
    let gemMaterials = []; // one instance per gem mesh — see note above
    let metalEnvMap, gemEnvBaseMap, gemEnvSpotMap, proceduralGemEnv = null;
    let disposed = false;
    let camState = null;
    let rotState = null;
    let ringPosOffsetState = null;
    let ringScaleState = null;
    let metalEnvState = null;
    let gemEnvState = null;
    let bgState = null;
    let cornerParkState = null;

    // Ring's hero-scene resting transform — captured right after the
    // existing auto-fit logic runs.
    const ringHeroTransform = {
      position: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      scale: 1,
      diameter: 1,
    };

    // Shared last-frame timestamp used by the unified gsap.ticker callback
    // (see currentTickerFn below) for dt-based DOF easing. Declared at
    // effect scope so it survives timeline rebuilds without resetting.
    let lastFrameTime = performance.now();

    // setupScrollTimeline() is re-invoked whenever a beat keyframe is
    // saved/cleared from the dev panel, so the scrub timeline picks up
    // the new target values immediately instead of only on next reload.
    // currentTickerFn tracks the previous gsap.ticker callback so it can
    // be removed before a fresh one is added — otherwise every rebuild
    // would stack another ticker callback on top of the old one.
    let currentTickerFn = null;

    let ringBS = null;
    const deskCam = new THREE.PerspectiveCamera(BASE_FOV, 16 / 9, 0.1, 100);
    deskCam.updateProjectionMatrix();

    const smooth = (a, b, x) => {
      const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
      return t * t * (3 - 2 * t);
    };
    function portraitParams(aspect) {
      const t = smooth(0.50, 0.85, aspect); // 0 = tall phone, 1 = iPad portrait
      return {
        kx: THREE.MathUtils.lerp(0.50, 0.80, t), // compress desktop's horizontal travel
        ky: THREE.MathUtils.lerp(0.75, 0.90, t), // compress vertical travel
        maxRadiusX: THREE.MathUtils.lerp(0.96, 0.88, t), // generous radius budget on mobile phones & tablets
        margin: 0.05, // safe margin in NDC
      };
    }

    function retargetForPortrait(localFrame = 0) {
      if (!ring || !ringBS || !camera) return;
      camera.updateMatrixWorld(true);
      ring.updateMatrixWorld(true);

      // 1. Where would the desktop camera put the ring?
      deskCam.position.copy(camera.position);
      deskCam.quaternion.copy(camera.quaternion);
      deskCam.updateMatrixWorld(true);
      const wc = ring.localToWorld(ringBS.c.clone());
      const nd = wc.clone().project(deskCam); // desktop NDC of the ring centre
      const dist = -wc.clone().applyMatrix4(camera.matrixWorldInverse).z; // depth along view axis

      // 2. Frame size at that depth for the REAL (portrait) camera
      const p = portraitParams(camera.aspect);
      const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
      const halfW = halfH * camera.aspect;

      // 3. Sizing budget:
      // Hero beat (frames 0–30) budget: prominent presence on all portrait devices (phones & iPads)
      // Small beat (frames 131–156) budget: scaled up on mobile so details remain crystal clear
      const t = smooth(0.50, 0.85, camera.aspect);
      const heroFactor = 1 - smooth(22, 44, localFrame);
      const isMobilePortrait = camera.aspect < 0.95 && (typeof window !== "undefined" && window.innerWidth <= 640);
      const minHeroRadiusX = isMobilePortrait ? 0.82 : THREE.MathUtils.lerp(0.62, 0.68, t);
      const minSmallRadiusX = isMobilePortrait ? 0.50 : 0.27;
      const minRadiusX = THREE.MathUtils.lerp(minSmallRadiusX, minHeroRadiusX, heroFactor);

      const R0 = ringBS.r * ring.scale.x;
      const maxS = (p.maxRadiusX * halfW) / R0;
      const minS = (minRadiusX * halfW) / R0;
      let s = 1.0;
      if (maxS < 1.0) {
        s = maxS;
      } else if (s < minS) {
        s = Math.min(minS, maxS);
      }
      // Sizing in Beat 5 (Interactive 3D Viewer & Footer Reveal):
      // - 3D Viewer (frames 205–245): comfortable scale with clear gap below the top explore card
      // - Footer Reveal (frames 245–260): scale comfortably so ring is centered in canvas above footer
      const isViewerSection = smooth(205, 218, localFrame) * (1 - smooth(245, 255, localFrame));
      const footerFactor = smooth(245, 260, localFrame);
      const mobileViewerScale = 0.82; // Sized so ring sits with generous ~30px breathing room in inner box
      const tabletViewerScale = 0.70; // Sized so ring frames with clean 35px+ clearance in perspective box on tablet
      const viewerScaleFactor = camera.aspect < 0.95
        ? THREE.MathUtils.lerp(1.0, isMobilePortrait ? mobileViewerScale : tabletViewerScale, isViewerSection)
        : 1.0;
      const portraitFooterScale = isMobilePortrait ? 0.90 : 0.84;
      const footerScaleFactor = camera.aspect < 0.95
        ? THREE.MathUtils.lerp(1.0, portraitFooterScale, footerFactor)
        : 1.0;
      s *= viewerScaleFactor * footerScaleFactor;

      // Overall boost for mobile phone viewports:
      if (isMobilePortrait) {
        s *= 1.25;
      }

      ring.scale.multiplyScalar(s);
      ring.updateMatrixWorld(true);
      const R = R0 * s;

      // 4. Compress the desktop screen position, then clamp so the whole ring stays inside
      const rx = R / halfW, ry = R / halfH;
      const limX = Math.max(0, 1 - p.margin - rx), limY = Math.max(0, 1 - p.margin - ry);

      // In Beats 2 & 3 (frames ~20 to ~120), portrait column mode places the Title Card
      // centered across the top and dedicates the entire lower viewport (y NDC ~ -0.22) to the ring,
      // centered horizontally (nx = 0), matching the user's red box column layout.
      const isColumnBeats = smooth(18, 32, localFrame) * (1 - smooth(115, 128, localFrame));
      // In Beat 5 (frames ~205 to 245, Interactive 3D Viewer), on portrait screens
      // center the ring vertically in the open viewport between the top card and the bottom button
      const tPortrait = smooth(0.55, 0.75, camera.aspect);
      const portraitViewerShift = isMobilePortrait ? -0.27 : THREE.MathUtils.lerp(-0.20, -0.25, tPortrait);
      const viewerShiftY = (camera.aspect < 0.95 ? portraitViewerShift : -0.06) * isViewerSection;

      // Dynamic Beat 2 to 3 motion arc and breathing scale (mobile & tablet)
      const t23 = smooth(52, 85, localFrame);
      const arc23 = Math.sin(Math.PI * t23);
      const bowX23 = 0.08 * arc23;
      const bowY23 = 0.03 * arc23;
      const scalePulse23 = 1.0 + 0.06 * arc23;
      s *= isColumnBeats > 0.0001 ? scalePulse23 : 1.0;

      // In Footer Reveal (frames 245–260), dynamically target the exact NDC center of the
      // viewable open canvas above the 30% footer:
      const winH = typeof window !== "undefined" ? window.innerHeight : 844;
      const targetFooterNy = isMobilePortrait
        ? Math.min(0.28, Math.max(0.16, 160 / winH))
        : Math.min(0.24, Math.max(0.10, 135 / winH));

      const targetNx = THREE.MathUtils.lerp(nd.x * p.kx, bowX23, Math.max(isColumnBeats, footerFactor));
      const baseNy = THREE.MathUtils.lerp(nd.y * p.ky, -0.22 + bowY23, isColumnBeats) + viewerShiftY;
      const targetNy = camera.aspect < 0.95
        ? THREE.MathUtils.lerp(baseNy, targetFooterNy, footerFactor)
        : baseNy + 0.04 * footerFactor;

      const nx = THREE.MathUtils.clamp(targetNx, -limX, limX);
      const ny = THREE.MathUtils.clamp(targetNy, -limY, limY);

      // 5. NDC -> world at the same depth, then move the ring there
      const target = new THREE.Vector3(nx * halfW, ny * halfH, -dist).applyMatrix4(camera.matrixWorld);
      const now = ring.localToWorld(ringBS.c.clone());
      ring.position.add(target.sub(now));
      ring.updateMatrixWorld(true);
    }

    function retargetForLandscape(localFrame = 0) {
      if (!ring || !ringBS || !camera) return;

      // Active during Beat 5 (Interactive 3D Viewer & Footer Reveal, frames 205–260)
      if (localFrame < 205) return;

      const isViewerSection = smooth(205, 218, localFrame) * (1 - smooth(245, 255, localFrame));
      const footerFactor = smooth(245, 260, localFrame);
      const beat5Factor = Math.max(isViewerSection, footerFactor);
      if (beat5Factor < 0.001) return;

      camera.updateMatrixWorld(true);
      ring.updateMatrixWorld(true);

      const wc = ring.localToWorld(ringBS.c.clone());
      const dist = -wc.clone().applyMatrix4(camera.matrixWorldInverse).z;
      const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
      const halfW = halfH * camera.aspect;

      const winH = typeof window !== "undefined" ? window.innerHeight : 1080;
      const headerH = 80;
      const footerEl = typeof document !== "undefined" ? document.querySelector(".hero2-footer-reveal") : null;
      const footerH = footerEl ? footerEl.getBoundingClientRect().height : 273;

      // 1. Center calculation:
      // Open canvas height between top header and bottom footer:
      const openH = winH - headerH - footerH * footerFactor;
      // Optical centroid compensation for the ring (diamond + shank) in Beat 5 & footer:
      const opticalShift = THREE.MathUtils.lerp(0.01, 0.02, footerFactor);
      const targetFooterNy = (footerH * footerFactor - headerH) / winH + opticalShift;

      // 2. Adaptive scale calculation:
      // Ensure the ring fits within the open canvas with clean, balanced margins.
      // On MacBook (1440x900) or laptops with shorter height, scale to ~370px for balanced perspective cube
      const currentRingHeightPx = (ringBS.r * 2 * ring.scale.y / halfH) * (winH / 2);
      const maxRingHeightPx = winH < 950 ? Math.max(160, openH * 0.50) : Math.max(160, openH * 0.58);
      
      let scaleMult = 1.0;
      if (currentRingHeightPx > maxRingHeightPx) {
        scaleMult = maxRingHeightPx / currentRingHeightPx;
      }
      
      if (scaleMult < 1.0) {
        const blendScale = THREE.MathUtils.lerp(
          1.0,
          scaleMult,
          Math.max(footerFactor, isViewerSection * (winH < 950 ? 0.75 : 0.4))
        );
        ring.scale.multiplyScalar(blendScale);
        ring.updateMatrixWorld(true);
      }

      // 3. Smoothly reposition ring to target NDC coordinates:
      const currentNDC = ring.localToWorld(ringBS.c.clone()).project(camera);
      const targetNx = THREE.MathUtils.lerp(currentNDC.x, 0.0, beat5Factor);
      const targetNy = THREE.MathUtils.lerp(currentNDC.y, targetFooterNy, beat5Factor);

      // Clamp so ring stays within viewport margins
      const margin = 0.04;
      const R = ringBS.r * ring.scale.x;
      const rx = R / halfW, ry = R / halfH;
      const limX = Math.max(0, 1 - margin - rx);
      const limY = Math.max(0, 1 - margin - ry);

      const nx = THREE.MathUtils.clamp(targetNx, -limX, limX);
      const ny = THREE.MathUtils.clamp(targetNy, -limY, limY);

      const targetWorld = new THREE.Vector3(nx * halfW, ny * halfH, -dist).applyMatrix4(camera.matrixWorld);
      const now = ring.localToWorld(ringBS.c.clone());
      ring.position.add(targetWorld.sub(now));
      ring.updateMatrixWorld(true);
    }

    const initW = window.innerWidth;
    const initH = window.innerHeight;
    const initAspect = initW / initH;
    const viewport = {
      w: initW,
      h: initH,
      aspect: initAspect,
      profile: getProfile(initW, initH),
    };
    window.__ringProfile = viewport.profile;

    function applyViewport() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h || (w === viewport.w && h === viewport.h)) return;
      viewport.w = w;
      viewport.h = h;
      viewport.aspect = w / h;
      viewport.profile = getProfile(w, h, viewport.profile);
      window.__ringProfile = viewport.profile;
      if (camera) {
        camera.aspect = viewport.aspect;
        camera.fov = viewport.profile === "landscape"
          ? fitFov(BASE_FOV, viewport.aspect)
          : PORTRAIT_FOV;
        camera.updateProjectionMatrix();
      }
      if (renderer) {
        renderer.setPixelRatio(
          Math.min(window.devicePixelRatio, viewport.profile === "landscape" ? 2 : 1.5)
        );
        renderer.setSize(w, h, false);
      }
      composer?.setSize(w, h);
      settleFramesRef.current = 0;
    }

    scene = new THREE.Scene();
    // NOTE: no scene.environment assignment here — intentionally removed.
    // Each material below gets its own envMap explicitly.

    const initialFov = RESPONSIVE_V2
      ? (viewport.profile === "landscape" ? fitFov(BASE_FOV, viewport.aspect) : PORTRAIT_FOV)
      : 35;
    camera = new THREE.PerspectiveCamera(
      initialFov,
      viewport.aspect,
      0.1,
      100,
    );
    camera.position.set(0, 0.2, 4.2);

    // Progressive WebGLRenderer creation retry chain (Fix B6)
    const creationErrors = [];
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        depth: true,
        stencil: true,
        powerPreference: deviceTier.tier === "low" ? "default" : "high-performance",
      });
    } catch (e1) {
      creationErrors.push("Stage 1 (high-perf): " + e1.message);
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: false,
          alpha: true,
          depth: true,
          stencil: true,
          powerPreference: "default",
        });
      } catch (e2) {
        creationErrors.push("Stage 2 (default, no AA): " + e2.message);
        try {
          renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            alpha: true,
            depth: true,
            stencil: false,
            powerPreference: "default",
          });
        } catch (e3) {
          creationErrors.push("Stage 3 (no stencil): " + e3.message);
          try {
            renderer = new THREE.WebGLRenderer({
              canvas,
              antialias: false,
              alpha: true,
              depth: false,
              stencil: false,
              powerPreference: "low-power",
            });
          } catch (fatalErr) {
            creationErrors.push("Stage 4 (low-power): " + fatalErr.message);
            console.error("RingHero: WebGL context creation failed across all retry tiers:", creationErrors.join("; "));
            diagnostics.recordCreationFailure(fatalErr);
            setGpuUnsupported(true);
            setIsSceneReady(true);
            onLoaded?.();
            return;
          }
        }
      }
    }

    renderer.debug.onShaderError = (gl, prog, vs, fs) => {
      diagnostics.logShaderError(gl, prog, vs, fs);
      if (gemMeshesRef.current?.length) {
        console.warn("RingHero: Shader error caught, recovering with physical diamond material");
        gemMeshesRef.current.forEach((child) => {
          child.material = buildGemMaterial(diamondPreset, null, null, "low", metalEnvMap);
        });
      }
    };

    const handleContextLost = (e) => {
      e.preventDefault();
      console.warn("RingHero: WebGL context lost!");
      diagnostics.logContextLost("RingHero");
      recordContextLossDowngrade(deviceTier.tier);
      setContextLost(true);
    };

    const handleContextRestored = () => {
      console.log("RingHero: WebGL context restored, attempting in-place recovery");
      setContextLost(false);
      if (rebuildCountRef.current < 2) {
        rebuildCountRef.current++;
        setSceneEpoch((n) => n + 1);
      }
    };

    canvas.addEventListener("webglcontextlost", handleContextLost, false);
    canvas.addEventListener("webglcontextrestored", handleContextRestored, false);

    renderer.setSize(window.innerWidth, window.innerHeight, !RESPONSIVE_V2);
    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        deviceTier.tier === "high"
          ? (RESPONSIVE_V2 && viewport.profile === "portrait" ? 1.5 : 2)
          : deviceTier.weakMobileBudget
          ? 1.25
          : (deviceTier.tier === "mid" || deviceTier.tier === "mobile" ? 1.5 : 1.0)
      )
    );
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const isDesktopTier = deviceTier.tier === "high" || deviceTier.tier === "mid" || isDevMode();
    if (isDesktopTier) {
      try {
        spotDilatorRef.current = new SpotDilator(renderer);
      } catch (e) {
        console.warn("RingHero: SpotDilator init failed, continuing without dilation:", e);
      }

      try {
        envPreviewRendererRef.current = new EnvPreviewRenderer(renderer);
      } catch (e) {
        console.warn("RingHero: EnvPreviewRenderer init failed:", e);
      }
    }

    if (onRegisterEnvPreview) {
      onRegisterEnvPreview((c, opts) => {
        if (envPreviewRendererRef.current) {
          const mEnv = {
            rot: hdrConfigRef.current.metalHdrRot ?? hdrConfigRef.current.metalHdrRotation ?? 0,
            rotation: hdrConfigRef.current.metalHdrRotation,
            rotationY: hdrConfigRef.current.metalHdrRotationY,
            scale: hdrConfigRef.current.metalHdrScale,
            scaleU: hdrConfigRef.current.metalHdrScaleU ?? 1.0,
            scaleV: hdrConfigRef.current.metalHdrScaleV ?? 1.0,
            transU: hdrConfigRef.current.metalHdrTransU ?? 0.0,
            transV: hdrConfigRef.current.metalHdrTransV ?? 0.0,
            scaleInvert: hdrConfigRef.current.metalHdrScaleInvert ?? false,
            power: hdrConfigRef.current.metalHdrPower,
            gamma: hdrConfigRef.current.metalHdrGamma,
            saturation: hdrConfigRef.current.metalHdrSaturation ?? 100,
            ...(opts?.metalEnv || {}),
          };
          envPreviewRendererRef.current.requestPreview(c, {
            ...opts,
            baseTexture: gemEnvTexturesRef.current.base,
            spotTexture: gemEnvTexturesRef.current.rawSpot || gemEnvTexturesRef.current.spot,
            metalTexture: gemEnvTexturesRef.current.metalRaw || gemEnvTexturesRef.current.metalEnvMap?._rawTexture,
            metalSpotTexture: gemEnvTexturesRef.current.metalSpot || gemEnvTexturesRef.current.metalSpotRaw || gemEnvTexturesRef.current.spot || gemEnvTexturesRef.current.rawSpot,
            baseEnv: hdrConfigRef.current.gemBaseEnv,
            spotEnv: hdrConfigRef.current.gemSpotEnv,
            metalEnv: mEnv,
            metalSpotEnv: opts?.metalSpotEnv || hdrConfigRef.current.metalSpotEnv,
            metalEnvView: opts?.metalEnvView ?? hdrConfigRef.current.metalEnvView ?? 0,
            gammaMode: hdrConfigRef.current.gemGammaMode,
          });
        }
      });
    }

    // ── EffectComposer (matching Cinegem 3DViewer reference post-processing) ───
    let composer = null;
    let bloomPass = null;
    function buildComposer() {
      try {
        const w = viewport.w || canvas.clientWidth || window.innerWidth;
        const h = viewport.h || canvas.clientHeight || window.innerHeight;
        const glCaps = diagnostics.getWebGLCapabilities();
        const hasHalfFloatTarget = Boolean(glCaps?.extensions?.EXT_color_buffer_half_float || glCaps?.extensions?.EXT_color_buffer_float);
        const isLowTier = deviceTier.tier === "low" || deviceTier.tier === "minimal" || !hasHalfFloatTarget;
        const isMobileTier = deviceTier.tier === "mobile";
        const msaa = deviceTier.tier === "high"
          ? (RESPONSIVE_V2 && viewport.profile === "portrait" ? 2 : 4)
          : deviceTier.weakMobileBudget
          ? 0
          : (deviceTier.tier === "mid" || deviceTier.tier === "mobile" ? 2 : 0);
        const targetType = (!hasHalfFloatTarget || deviceTier.tier === "low" || deviceTier.tier === "minimal") ? THREE.UnsignedByteType : THREE.HalfFloatType;
        const stencil = !isLowTier && !isMobileTier;

        let composerTarget;
        try {
          composerTarget = new THREE.WebGLRenderTarget(w, h, {
            type: targetType,
            samples: msaa,
            stencilBuffer: stencil,
          });
          composer = new EffectComposer(renderer, composerTarget);
        } catch (rtErr) {
          console.warn("RingHero: MSAA/Float render target failed, falling back to 0-sample UnsignedByteType:", rtErr);
          composerTarget = new THREE.WebGLRenderTarget(w, h, {
            type: THREE.UnsignedByteType,
            samples: 0,
          });
          composer = new EffectComposer(renderer, composerTarget);
        }

        composer.addPass(new RenderPass(scene, camera));

        const bCfg = hdrConfigRef.current.bloomConfig || {
          enabled: true,
          threshold: 0.96,
          intensity: 0.035,
          radius: 0.28,
        };

        bloomPass = new UnrealBloomPass(
          new THREE.Vector2(w, h),
          bCfg.intensity ?? 0.035,
          bCfg.radius ?? 0.28,
          bCfg.threshold ?? 0.96
        );
        bloomPass.materialHighPassFilter.uniforms.smoothWidth.value = 0.2;
        bloomPass.enabled = (isLowTier || isMobileTier) ? false : (bCfg.enabled ?? true);
        if (bloomPass.blendMaterial) {
          bloomPass.blendMaterial.blending = THREE.CustomBlending;
          bloomPass.blendMaterial.blendSrc = THREE.OneFactor;
          bloomPass.blendMaterial.blendDst = THREE.OneFactor;
          bloomPass.blendMaterial.blendEquation = THREE.AddEquation;
          bloomPass.blendMaterial.blendSrcAlpha = THREE.ZeroFactor;
          bloomPass.blendMaterial.blendDstAlpha = THREE.OneFactor;
          bloomPass.blendMaterial.blendEquationAlpha = THREE.AddEquation;
        }
        composer.addPass(bloomPass);

        composer.addPass(new TransparentOutputPass());
        bloomEffectRef.current = bloomPass;
      } catch (compErr) {
        console.warn("RingHero: EffectComposer setup failed, will use direct forward renderer:", compErr);
        composer = null;
        bloomEffectRef.current = null;
      }
    }
    buildComposer();

    // ── Cursor / pointer NDC tracking for mouse parallax ───────────────
    const pointerNDC = new THREE.Vector2(0, 0);

    function onPointerMove(e) {
      const rect = canvas.getBoundingClientRect();
      pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }
    window.addEventListener("pointermove", onPointerMove);

    // ── Interactive drag-to-rotate (Beat 5 "explore" window) ────────────
    // Only ever attached to the canvas itself (not window), and the
    // canvas only receives pointer events while interactiveActiveRef is
    // true (pointerEvents is flipped to "auto"/"none" in the
    // ScrollTrigger onUpdate above) — so outside that frame range these
    // listeners simply never fire, and scroll/clicks pass through to the
    // page exactly as before. No panning, no zoom, no way to move the
    // ring's position — horizontal drag spins it (Y), vertical drag
    // tilts it (X, clamped), same feel as the standalone viewer's orbit
    // drag with the pan/zoom stripped out.
    function onInteractiveDown(clientX, clientY) {
      if (!interactiveActiveRef.current) return;
      dragStateRef.current = {
        pending: true,
        dragging: false,
        startX: clientX,
        startY: clientY,
        prevX: clientX,
        prevY: clientY,
      };
      // Do NOT fire onDragStateChange(true) here: a stationary tap/click must never stop Lenis scroll.
      if (RINGHERO_DEBUG_INTERACTION) {
        // eslint-disable-next-line no-console
        console.log(
          `[RingHero] drag PENDING at (${clientX}, ${clientY}) — reached canvas fine.`,
        );
      }
    }
    function onInteractiveMove(clientX, clientY) {
      if (!interactiveActiveRef.current || !dragStateRef.current.pending)
        return;

      if (!dragStateRef.current.dragging) {
        const totalDx = clientX - dragStateRef.current.startX;
        const totalDy = clientY - dragStateRef.current.startY;
        if (Math.abs(totalDx) > 3 || Math.abs(totalDy) > 3) {
          dragStateRef.current.dragging = true;
          onDragStateChange?.(true);
          if (canvas) canvas.style.cursor = "grabbing";
          if (interactiveBoxRef.current) interactiveBoxRef.current.style.cursor = "grabbing";
        } else {
          return;
        }
      }

      const dx = clientX - dragStateRef.current.prevX;
      const dy = clientY - dragStateRef.current.prevY;
      dragStateRef.current.prevX = clientX;
      dragStateRef.current.prevY = clientY;
      if (dx === 0 && dy === 0) return;

      currentSpinYRef.current = wrapAngle(
        currentSpinYRef.current + dx * interactiveDragSensitivity,
      );
      manualRotRef.current.y = currentSpinYRef.current;
      autoRotateAngleRef.current = currentSpinYRef.current;
      manualRotRef.current.x = Math.max(
        -interactiveTiltClamp,
        Math.min(
          interactiveTiltClamp,
          manualRotRef.current.x + dy * interactiveDragSensitivity,
        ),
      );
    }
    function onInteractiveUp() {
      const wasDragging = dragStateRef.current.dragging;
      dragStateRef.current = {
        pending: false,
        dragging: false,
        startX: 0,
        startY: 0,
        prevX: 0,
        prevY: 0,
      };
      if (wasDragging) {
        onDragStateChange?.(false);
      }
      if (canvas && interactiveActiveRef.current) {
        canvas.style.cursor = "grab";
      }
      if (interactiveBoxRef.current && interactiveActiveRef.current) {
        interactiveBoxRef.current.style.cursor = "grab";
      }
    }
    function onCanvasPointerDown(e) {
      if (!interactiveActiveRef.current) return;
      if (e.cancelable) e.preventDefault();
      onInteractiveDown(e.clientX, e.clientY);
    }
    function onWindowPointerMove(e) {
      if (
        !interactiveActiveRef.current ||
        (!dragStateRef.current.pending && !dragStateRef.current.dragging)
      ) {
        return;
      }
      if (dragStateRef.current.dragging && e.cancelable) e.preventDefault();
      onInteractiveMove(e.clientX, e.clientY);
    }

    canvas.addEventListener("pointerdown", onCanvasPointerDown);
    window.addEventListener("pointermove", onWindowPointerMove, { passive: false });
    window.addEventListener("pointerup", onInteractiveUp);
    window.addEventListener("pointercancel", onInteractiveUp);

    // Dedicated 360-degree invisible interaction box matched to PerspectiveBox bounds
    // for mobile & tablet portrait: dragging inside rotates, outside scrolls normally.
    const box = interactiveBoxRef.current;
    function onBoxPointerDown(e) {
      if (!interactiveActiveRef.current) return;
      if (e.cancelable) e.preventDefault();
      onInteractiveDown(e.clientX, e.clientY);
    }
    function onBoxTouchPrevent(e) {
      if (!interactiveActiveRef.current) return;
      if (e.cancelable) e.preventDefault();
    }
    if (box) {
      box.addEventListener("pointerdown", onBoxPointerDown);
      box.addEventListener("touchstart", onBoxTouchPrevent, { passive: false });
      box.addEventListener("touchmove", onBoxTouchPrevent, { passive: false });
    }

    // ── Debug-only: always-on diagnostic pointerdown listener ───────────
    // Unlike onCanvasMouseDown (bound to the canvas, only fires if the
    // canvas itself receives the event), this listens on window so it
    // ALWAYS fires — including when something is covering the canvas and
    // stealing the click before it gets there. Compare the two logs:
    //   - if THIS fires but "[RingHero] drag START" never does, something
    //     else (e.target below) is intercepting the press
    //   - if THIS never fires at all, the press isn't landing in the
    //     canvas's screen area, or debugFrameStateRef never went in-range
    //     (scroll never reached the interactive frame window)
    let debugPointerDown = null;
    if (RINGHERO_DEBUG_INTERACTION) {
      debugPointerDown = (e) => {
        const { localFrame, inRange } = debugFrameStateRef.current;
        const elAtPoint = document.elementFromPoint(e.clientX, e.clientY);
        // eslint-disable-next-line no-console
        console.log(
          `[RingHero][diag] pointerdown at (${e.clientX}, ${e.clientY}) — localFrame=${localFrame.toFixed(1)} inRange=${inRange} interactiveActiveRef=${interactiveActiveRef.current} canvas.pointerEvents="${canvas.style.pointerEvents}" e.target=${e.target?.tagName}${e.target?.className ? "." + e.target.className : ""} elementFromPoint=${elAtPoint?.tagName}${elAtPoint?.className ? "." + elAtPoint.className : ""}`,
        );
        if (elAtPoint && elAtPoint !== canvas) {
          // eslint-disable-next-line no-console
          console.warn(
            "[RingHero][diag] Something other than the canvas is on top at that point — that element is stealing the drag. Give it pointer-events:none or lower its z-index.",
            elAtPoint,
          );
        }
      };
      window.addEventListener("pointerdown", debugPointerDown, {
        capture: true,
      });
    }

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(3, 4, 5);
    keyLight.visible = false;
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-4, -1, -3);
    fillLight.visible = false;
    scene.add(fillLight);
    fillLightRef.current = fillLight;

    const lCfg = hdrConfigRef.current?.sceneLightsConfig || {};
    const lightsOn = Boolean(lCfg.enabled);
    keyLight.visible = lightsOn && lCfg.keyLightEnabled !== false;
    keyLight.intensity = typeof lCfg.keyLightIntensity === "number" ? lCfg.keyLightIntensity : 1.2;
    fillLight.visible = lightsOn && lCfg.fillLightEnabled !== false;
    fillLight.intensity = typeof lCfg.fillLightIntensity === "number" ? lCfg.fillLightIntensity : 0.4;

    const pmrem = new PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    pmremRef.current = pmrem;

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(dracoDecoderPath);

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    // Progress tracking for GLB & HDRs/EXRs
    const isMobileModel = effectiveGlbUrl.includes("mobile") || effectiveGlbUrl.includes("420k");
    const progressMap = {
      glb: { loaded: 0, total: isMobileModel ? 420028 : 2695680 },
      metalHdr: { loaded: 0, total: 661971 },
      gemBaseHdr: { loaded: 0, total: 7533766 },
      gemSpotHdr: { loaded: 0, total: 844667 },
    };

    function updateOverallProgress(stageText) {
      const glbRatio = progressMap.glb.total > 0 ? Math.min(1, progressMap.glb.loaded / progressMap.glb.total) : 0;
      const metalRatio = progressMap.metalHdr.total > 0 ? Math.min(1, progressMap.metalHdr.loaded / progressMap.metalHdr.total) : 0;
      const gemBaseRatio = progressMap.gemBaseHdr.total > 0 ? Math.min(1, progressMap.gemBaseHdr.loaded / progressMap.gemBaseHdr.total) : 0;
      const gemSpotRatio = progressMap.gemSpotHdr.total > 0 ? Math.min(1, progressMap.gemSpotHdr.loaded / progressMap.gemSpotHdr.total) : 0;

      // Weight assets: GLB = 30%, Metal HDR = 15%, Gem Base EXR = 30%, Gem Spot EXR = 10% (total 85% for network fetch)
      const downloadPct = (glbRatio * 0.30 + metalRatio * 0.15 + gemBaseRatio * 0.30 + gemSpotRatio * 0.10) * 100;
      const progressValue = Math.min(85, Math.max(8, Math.round(downloadPct)));
      onLoadingProgress?.(progressValue, stageText || "Loading 3D assets...");
    }

    onLoadingProgress?.(10, "Fetching 3D assets...");

    const hardTimeoutMs = (deviceTier.tier === "low" || deviceTier.tier === "minimal") ? 10000 : 16000;
    const safetyTimeout = setTimeout(() => {
      console.warn("RingHero: Asset loading timed out, dismissing loading screen");
      diagnostics.recordLog({
        type: "warning",
        source: "RingHero.safetyTimeout",
        message: "Asset load exceeded time limit",
        time: new Date().toLocaleTimeString(),
      });
      onLoadingProgress?.(100, "Loaded");
      onLoaded?.();
    }, hardTimeoutMs);

    const isFallbackDevice = Boolean(
      deviceTier.tier === "low" ||
      deviceTier.tier === "minimal" ||
      deviceTier.isLowOrMinimal
    );
    const FALLBACK_HDR_URL = "/hdr/env_metal_029_1798f1cf07.hdr";

    // When on fallback devices, default to env_metal_029 for metal & diamond
    const effectiveMetalHdrUrl = isFallbackDevice
      ? (metalHdrUrl && metalHdrUrl !== "/hdr/env_metal_001_d01c4504e0.hdr" ? metalHdrUrl : FALLBACK_HDR_URL)
      : metalHdrUrl;

    Promise.all([
      new Promise((resolve, reject) => {
        const loadWithFallback = (decoderPath, isRetry = false) => {
          const dLoader = new DRACOLoader();
          dLoader.setDecoderPath(decoderPath);
          const gLoader = new GLTFLoader();
          gLoader.setDRACOLoader(dLoader);

          gLoader.load(
            effectiveGlbUrl,
            (gltf) => {
              progressMap.glb.loaded = progressMap.glb.total;
              updateOverallProgress("Ring geometry downloaded");
              resolve(gltf);
            },
            (xhr) => {
              if (xhr.lengthComputable && xhr.total > 0) {
                progressMap.glb.loaded = xhr.loaded;
                progressMap.glb.total = xhr.total;
              } else if (xhr.loaded) {
                progressMap.glb.loaded = xhr.loaded;
              }
              updateOverallProgress("Loading 3D ring model...");
            },
            (err) => {
              if (!isRetry) {
                console.warn("RingHero: Local draco decoder failed, retrying with official CDN decoder...", err);
                loadWithFallback("https://www.gstatic.com/draco/versioned/decoders/1.5.7/", true);
              } else {
                reject(err);
              }
            }
          );
        };
        loadWithFallback(dracoDecoderPath);
      }),
      loadEnvironmentTexture(effectiveMetalHdrUrl, pmrem, (xhr) => {
        if (xhr.loaded) progressMap.metalHdr.loaded = xhr.loaded;
        updateOverallProgress("Studio lighting loaded");
      }).catch((err) => {
        console.warn("RingHero: Metal HDR failed to load, continuing with ambient fallback:", err);
        return null;
      }),
      isFallbackDevice ? Promise.resolve({ texture: null, meta: null }) : loadRawEquirect(((deviceTier.tier === "mobile" && effectiveBaseHdrUrl?.includes("Diamond-Base-HDRI.exr")) ? "/hdr/Diamond-Base-HDRI-mobile.exr" : effectiveBaseHdrUrl), {
        mono: gemBaseEnv?.mono ?? true,
        fileName: ((deviceTier.tier === "mobile" && effectiveBaseHdrUrl?.includes("Diamond-Base-HDRI.exr")) ? "Diamond-Base-HDRI-mobile.exr" : (baseFileNameHint || "env_metal_029_1798f1cf07.hdr")),
        onProgress: (xhr) => {
          if (xhr.loaded) progressMap.gemBaseHdr.loaded = xhr.loaded;
          updateOverallProgress("Diamond base environment loaded");
        },
      }).catch((err) => {
        console.warn("RingHero: Diamond base HDRI failed to load, continuing with fallback:", err);
        return { texture: null, meta: null };
      }),
      (isFallbackDevice || !gemSpotHdrUrl) ? Promise.resolve({ texture: null, meta: null }) : loadRawEquirect((deviceTier.tier === "mobile" ? "/hdr/Diamond-Spotlight-HDRI-mobile.exr" : gemSpotHdrUrl), {
        mono: gemSpotEnv?.mono ?? true,
        fileName: (deviceTier.tier === "mobile" ? "Diamond-Spotlight-HDRI-mobile.exr" : spotFileNameHint),
        onProgress: (xhr) => {
          if (xhr.loaded) progressMap.gemSpotHdr.loaded = xhr.loaded;
          updateOverallProgress("Diamond spotlight environment loaded");
        },
      }).catch((err) => {
        console.warn("RingHero: Diamond spot HDRI failed to load, continuing with fallback:", err);
        return { texture: null, meta: null };
      }),
      (isFallbackDevice || !metalSpotHdrUrl)
        ? Promise.resolve({ texture: null, meta: null })
        : (metalSpotHdrUrl === gemSpotHdrUrl
            ? Promise.resolve(null)
            : loadRawEquirect(metalSpotHdrUrl, {
                mono: false,
                fileName: metalSpotFileNameHint || "Metal-Spotlight-HDRI.hdr",
              }).catch((err) => {
                console.warn("RingHero: Metal spot HDRI failed to load, continuing with fallback:", err);
                return { texture: null, meta: null };
              })),
    ])
      .then(([gltf, loadedMetalEnv, loadedBaseResult, loadedSpotResult, loadedMetalSpotResult]) => {
        clearTimeout(safetyTimeout);
        if (disposed) return;

        metalEnvMap = loadedMetalEnv;
        gemEnvTexturesRef.current.metalEnvMap = loadedMetalEnv;
        gemEnvTexturesRef.current.metalRaw = loadedMetalEnv?._rawTexture || null;
        gemEnvTexturesRef.current.base = loadedBaseResult?.texture || null;
        gemEnvTexturesRef.current.baseMeta = loadedBaseResult?.meta || null;
        gemEnvTexturesRef.current.rawSpot = loadedSpotResult?.texture || null;

        const effectiveMetalSpotResult = loadedMetalSpotResult || loadedSpotResult;
        gemEnvTexturesRef.current.metalSpotRaw = effectiveMetalSpotResult?.texture || null;
        gemEnvTexturesRef.current.metalSpot = effectiveMetalSpotResult?.texture || null;
        gemEnvTexturesRef.current.metalSpotMeta = effectiveMetalSpotResult?.meta || null;
        onMetalSpotMetaUpdate?.(effectiveMetalSpotResult?.meta || null);

        if (deviceTier.tier === "mobile" && !loadedMetalEnv) {
          try {
            proceduralGemEnv = buildGemProceduralEnv(renderer);
          } catch (pErr) {
            console.warn("RingHero: buildGemProceduralEnv failed, falling back to metalEnvMap:", pErr);
          }
        }

        const spotSize = gemSpotEnv?.size ?? 2;
        let effectiveSpot = loadedSpotResult?.texture || null;
        if (spotDilatorRef.current && loadedSpotResult?.texture && spotSize > 0) {
          try {
            effectiveSpot = spotDilatorRef.current.dilate(loadedSpotResult.texture, spotSize);
          } catch (e) {
            console.warn("RingHero: Dilate failed, using raw texture:", e);
            effectiveSpot = loadedSpotResult.texture;
          }
        }
        gemEnvTexturesRef.current.spot = effectiveSpot;
        gemEnvTexturesRef.current.spotMeta = loadedSpotResult?.meta || null;
        onBaseMetaUpdate?.(loadedBaseResult?.meta || null);
        onSpotMetaUpdate?.(loadedSpotResult?.meta || null);
        onRefreshPreviews?.();

        metalMaterial = buildMetalMaterial(
          metalPreset,
          metalEnvMap,
          null,
          BEATS[0].metalEnvIntensity,
          deviceTier.isMobile || deviceTier.tier === "mobile" || Boolean(deviceTier.weakMobileBudget)
        );
        metalMaterial.fog = false;
        metalMaterialRef.current = metalMaterial;

        // On fallback devices: diamond is strictly matte with IOR 1.5, and spotlight is none/off
        const forcedMatte = isFallbackDevice || gemMaterialTypeOverride === "matte";
        const effectiveGemPreset = forcedMatte
          ? { ...gemPreset, ...diamondConfig, materialType: "matte", ior: diamondConfig?.ior ?? 1.5 }
          : { ...gemPreset, ...diamondConfig, ...(gemMaterialTypeOverride ? { materialType: gemMaterialTypeOverride } : {}) };

        ring = gltf.scene;

        const { gemMeshes, metalMeshes, debugList } = classifyRingMeshes(ring);
        gemMeshesRef.current = gemMeshes;

        const effectiveGemEnv = metalEnvMap || proceduralGemEnv;
        gemMaterials = gemMeshes.map((child) => {
          let mat = getMeshGemMaterial({
            mesh: child,
            preset: effectiveGemPreset,
            envMapBase: isFallbackDevice ? null : gemEnvTexturesRef.current.base,
            envMapSpot: isFallbackDevice ? null : effectiveSpot,
            deviceTier,
            pmremEnv: effectiveGemEnv,
          });
          if ("envMapIntensity" in mat) {
            const intensityScale = mat.isMobileGemMaterial ? 2.0 : 1.0;
            mat.envMapIntensity = BEATS[0].gemEnvIntensity * intensityScale;
          }
          mat.fog = false;
          child.material = mat;
          if (mat.isRoughRefractionMaterial && !mat.isBaked) {
            try {
              attachBvhToGemMaterial(child, mat);
            } catch (bvhErr) {
              console.warn("RingHero: BVH build failed, using physical fallback:", bvhErr);
              diagnostics.logAssetFailure("attachBvhToGemMaterial", bvhErr);
              mat = buildGemMaterial(effectiveGemPreset, null, null, "low", metalEnvMap);
              child.material = mat;
            }
          }
          child.castShadow = false;
          child.receiveShadow = false;
          return mat;
        });
        gemMaterialsRef.current = gemMaterials;
        applyHdrConfigToLiveMaterials();

        metalMeshes.forEach((child) => {
          child.material = metalMaterial;
          child.castShadow = false;
          child.receiveShadow = false;
        });

        if (import.meta.env.DEV) {
          console.table(debugList);
        }
        onMeshesClassified?.(debugList);

        const box = new THREE.Box3().setFromObject(ring);
        const _sphere = new THREE.Sphere();
        box.getBoundingSphere(_sphere);
        ringBS = { c: _sphere.center.clone(), r: _sphere.radius };

        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const rawCenter = center.clone();
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.4 / maxDim;
        ring.scale.setScalar(scale);
        ring.position.sub(center.multiplyScalar(scale));

        scene.add(ring);

        if (metalMaterial?.userData?.metalBoundsCenter) {
          metalMaterial.userData.metalBoundsCenter.value.copy(rawCenter);
          metalMaterial.userData.metalBoundsHalfExtent.value = Math.max(maxDim * 0.5, 1e-4);
          ring.updateMatrixWorld();
          metalMaterial.userData.metalRingInvMatrix.value.copy(ring.matrixWorld).invert();
        }

        ringHeroTransform.position.copy(ring.position);
        ringHeroTransform.rotation.copy(ring.rotation);
        ringHeroTransform.scale = ring.scale.x;
        // Ring's outer diameter (world units, at hero scale) — used later
        // to size it correctly against the hand's actual finger width,
        // instead of guessing an absolute scale that has no relation to
        // either model's real proportions (this was the cause of the
        // ring rendering many times too large on the hand).
        ringHeroTransform.diameter = Math.max(size.x, size.z) * scale;

        // Apply whatever HDR-panel values are already sitting in state
        // (e.g. if the user moved a slider before the async load resolved).
        applyHdrConfigToLiveMaterials();

        onLoadingProgress?.(96, "Configuring scene timeline...");
        setupScrollTimeline();

        // Model, materials, BVH, and initial scene frame are 100% ready
        onLoadingProgress?.(100, "Experience ready");
        setSceneStatus("ready");
        setIsSceneReady(true);
        onLoaded?.();
      })
      .catch((err) => {
        console.error("RingHero: failed to load assets", err);
        diagnostics.recordLog({
          type: "asset-load-failure",
          source: "RingHero.catch",
          message: err?.message || String(err),
          stack: err?.stack,
          time: new Date().toLocaleTimeString(),
        });
        setSceneStatus("failed");
        onLoadingProgress?.(100, "Failed to load 3D scene");
        onLoaded?.();
      });

    function notifyKeyframesUpdate(targetTimeline = activeTimelineMode) {
      if (!onKeyframesUpdate) return;
      const beats = getTimelineBeats(targetTimeline);
      if (beats) {
        onKeyframesUpdate(new Set(beats.map((b) => b.frame)));
      }
    }

    function getTimelineBeats(targetTimeline = activeTimelineMode) {
      if (RESPONSIVE_V2) {
        return targetTimeline === "mobile"
          ? mobileBeatsRef.current
          : beatsRef.current;
      }
      const isMobileViewport =
        typeof window !== "undefined" &&
        (window.innerWidth < 768 ||
          window.innerWidth / window.innerHeight < 1.0);
      const isMobile =
        targetTimeline === "mobile" ||
        (targetTimeline === "auto" && isMobileViewport);
      return isMobile ? mobileBeatsRef.current : beatsRef.current;
    }

    function getBaseValuesForFrame(frame, targetTimeline = activeTimelineMode) {
      const beatsSource = getTimelineBeats(targetTimeline);
      if (!beatsSource || beatsSource.length === 0) {
        return {
          frame,
          bgTop: "#0d0d10",
          bgBottom: "#1a1a1f",
          camPos: { x: 0, y: 0.2, z: 4.2, lookAtY: 0 },
          ringRot: { x: 0.15, y: 0, z: 0 },
          ringPosOffset: { x: 0, y: 0, z: 0 },
          ringScale: 1,
          metalEnvIntensity: 4,
          gemEnvIntensity: 1.2,
          cornerPark: 0,
        };
      }

      const defaultBeats = beatsSource
        .map((beat, index) => ({
          frame: beat.frame !== undefined ? beat.frame : index * 20,
          beat,
        }))
        .sort((a, b) => a.frame - b.frame);

      const exact = defaultBeats.find((b) => b.frame === frame);
      if (exact) {
        return {
          ...exact.beat,
          camPos: { ...exact.beat.camPos },
          ringRot: { ...exact.beat.ringRot },
          ringPosOffset: { ...(exact.beat.ringPosOffset || { x: 0, y: 0, z: 0 }) },
        };
      }

      let lower = defaultBeats[0];
      let upper = defaultBeats[defaultBeats.length - 1];
      for (let i = 0; i < defaultBeats.length; i++) {
        if (defaultBeats[i].frame <= frame) lower = defaultBeats[i];
        if (defaultBeats[i].frame > frame) {
          upper = defaultBeats[i];
          break;
        }
      }

      if (lower.frame === upper.frame) {
        return {
          ...lower.beat,
          camPos: { ...lower.beat.camPos },
          ringRot: { ...lower.beat.ringRot },
          ringPosOffset: { ...(lower.beat.ringPosOffset || { x: 0, y: 0, z: 0 }) },
        };
      }

      const t = (frame - lower.frame) / (upper.frame - lower.frame);

      const lerpColor = (c1, c2, factor) => {
        const parse = (hex) => {
          const num = parseInt(hex.slice(1), 16);
          return [num >> 16, (num >> 8) & 0xff, num & 0xff];
        };
        const rgb1 = parse(c1);
        const rgb2 = parse(c2);
        const r = Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * factor);
        const g = Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * factor);
        const b = Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * factor);
        const toHex = (n) =>
          Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      };

      const lerpNum = (n1, n2, factor) => n1 + (n2 - n1) * factor;

      const lerpVec3 = (v1, v2, factor) => ({
        x: lerpNum(v1.x, v2.x, factor),
        y: lerpNum(v1.y, v2.y, factor),
        z: lerpNum(v1.z, v2.z, factor),
        lookAtY: lerpNum(v1.lookAtY ?? 0, v2.lookAtY ?? 0, factor),
      });

      return {
        bgTop: lerpColor(lower.beat.bgTop ?? "#0d0d10", upper.beat.bgTop ?? "#0d0d10", t),
        bgBottom: lerpColor(lower.beat.bgBottom ?? "#1a1a1f", upper.beat.bgBottom ?? "#1a1a1f", t),
        camPos: lerpVec3(lower.beat.camPos, upper.beat.camPos, t),
        ringRot: lerpVec3(lower.beat.ringRot, upper.beat.ringRot, t),
        ringPosOffset: lerpVec3(
          lower.beat.ringPosOffset ?? { x: 0, y: 0, z: 0 },
          upper.beat.ringPosOffset ?? { x: 0, y: 0, z: 0 },
          t,
        ),
        ringScale: lerpNum(
          lower.beat.ringScale ?? 1,
          upper.beat.ringScale ?? 1,
          t,
        ),
        metalEnvIntensity: lerpNum(
          lower.beat.metalEnvIntensity ?? 4,
          upper.beat.metalEnvIntensity ?? 4,
          t,
        ),
        gemEnvIntensity: lerpNum(
          lower.beat.gemEnvIntensity ?? 1.2,
          upper.beat.gemEnvIntensity ?? 1.2,
          t,
        ),
        cornerPark: (() => {
          if ((lower.beat.cornerPark ?? 0) >= 0.95 && (upper.beat.cornerPark ?? 0) === 0) {
            if (frame <= 210) return 1.0;
            const unparkT = Math.max(0, Math.min(1, (frame - 210) / (260 - 210)));
            return 1.0 - unparkT;
          }
          return lerpNum(lower.beat.cornerPark ?? 0, upper.beat.cornerPark ?? 0, t);
        })(),
      };
    }

    function resolveTargetForFrame(frame, targetTimeline = activeTimelineMode) {
      return getBaseValuesForFrame(frame, targetTimeline);
    }

    function setupScrollTimeline() {
      const activeBeats = getTimelineBeats();
      // Keep keyframes sorted strictly by frame number
      activeBeats.sort((a, b) => (a.frame ?? 0) - (b.frame ?? 0));

      console.log(
        "[RingHero] setupScrollTimeline called! Active keyframes count:",
        activeBeats.length,
        "Frames:",
        activeBeats.map((b) => b.frame),
      );

      // Preserve current scroll/playhead progress across timeline rebuild
      const allTriggers = ScrollTrigger.getAll();
      const prevProgress = allTriggers.length > 0 ? allTriggers[0].progress : 0;

      allTriggers.forEach((st) => st.kill());
      if (currentTickerFn) {
        gsap.ticker.remove(currentTickerFn);
        currentTickerFn = null;
      }

      notifyKeyframesUpdate();

      const baselineTarget = activeBeats[0];
      if (!camState) {
        camState = { ...baselineTarget.camPos };
        rotState = { ...baselineTarget.ringRot };
        ringPosOffsetState = { ...(baselineTarget.ringPosOffset || { x: 0, y: 0, z: 0 }) };
        ringScaleState = { value: baselineTarget.ringScale ?? 1 };
        metalEnvState = { value: baselineTarget.metalEnvIntensity ?? 4 };
        metalEnvStateRef.current = metalEnvState;
        gemEnvState = { value: baselineTarget.gemEnvIntensity ?? 1.2 };
        bgState = { top: baselineTarget.bgTop ?? "#0d0d10", bottom: baselineTarget.bgBottom ?? "#1a1a1f" };
        cornerParkState = { value: baselineTarget.cornerPark ?? 0 };
      } else {
        camState.x = baselineTarget.camPos.x;
        camState.y = baselineTarget.camPos.y;
        camState.z = baselineTarget.camPos.z;
        camState.lookAtY = baselineTarget.camPos.lookAtY ?? 0;
        rotState.x = baselineTarget.ringRot.x;
        rotState.y = baselineTarget.ringRot.y;
        rotState.z = baselineTarget.ringRot.z;
        ringPosOffsetState.x = baselineTarget.ringPosOffset?.x ?? 0;
        ringPosOffsetState.y = baselineTarget.ringPosOffset?.y ?? 0;
        ringPosOffsetState.z = baselineTarget.ringPosOffset?.z ?? 0;
        ringScaleState.value = baselineTarget.ringScale ?? 1;
        metalEnvState.value = baselineTarget.metalEnvIntensity ?? 4;
        gemEnvState.value = baselineTarget.gemEnvIntensity ?? 1.2;
        bgState.top = baselineTarget.bgTop ?? "#0d0d10";
        bgState.bottom = baselineTarget.bgBottom ?? "#1a1a1f";
        cornerParkState.value = baselineTarget.cornerPark ?? 0;
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: scrollContainerSelector,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.2,
          onUpdate: (self) => {
            const progress = self.progress;
            const beatPosition = progress * (activeBeats.length - 1);
            const beatIndex = Math.floor(beatPosition);
            const beatFraction = beatPosition - beatIndex;

            const maxFrame = activeBeats[activeBeats.length - 1]?.frame || 260;
            const localFrame = progress * maxFrame;
            debugFrameStateRef.current.localFrame = localFrame;
            if (autoRotateStartFrame != null) {
              const inRange =
                localFrame >= (autoRotateStartFrame - 0.25) &&
                (autoRotateEndFrame == null ||
                  localFrame <= autoRotateEndFrame);
              autoRotateActiveRef.current = inRange;
            }
            if (interactiveRotateStartFrame != null) {
              const inInteractiveRange =
                localFrame >= (interactiveRotateStartFrame - 0.25) &&
                (interactiveRotateEndFrame == null ||
                  localFrame <= interactiveRotateEndFrame);
              debugFrameStateRef.current.inRange = inInteractiveRange;
              const rangeChanged =
                inInteractiveRange !== interactiveActiveRef.current;
              interactiveActiveRef.current = inInteractiveRange;

              const isPortrait = RESPONSIVE_V2 && viewport.profile === "portrait";

              if (canvas) {
                // On portrait (mobile/tablet), canvas stays pointerEvents: none so outside touches scroll page;
                // on desktop landscape, canvas handles full-screen drag in interactive section only.
                canvas.style.pointerEvents =
                  inInteractiveRange && !isPortrait ? "auto" : "none";
                canvas.style.cursor = inInteractiveRange ? "grab" : "";
                canvas.style.touchAction = inInteractiveRange ? "none" : (RESPONSIVE_V2 ? "pan-y" : "auto");
              }

              if (interactiveBoxRef.current) {
                const boxActive = inInteractiveRange && isPortrait;
                interactiveBoxRef.current.style.pointerEvents = boxActive
                  ? "auto"
                  : "none";
                interactiveBoxRef.current.style.display = boxActive
                  ? "block"
                  : "none";
              }

              if (rangeChanged) {
                setIsMobileMode(isPortrait);
                if (RINGHERO_DEBUG_INTERACTION) {
                  console.log(
                    `[RingHero] interactive window ${inInteractiveRange ? "OPENED" : "CLOSED"} — localFrame=${localFrame.toFixed(1)} range=[${interactiveRotateStartFrame}, ${interactiveRotateEndFrame}] isPortrait=${isPortrait}`,
                  );
                }
                if (!inInteractiveRange) {
                  dragStateRef.current.dragging = false;
                  if (interactiveBoxRef.current) {
                    interactiveBoxRef.current.style.cursor = "grab";
                  }
                }
                setShowDragHint(inInteractiveRange);
              }
            }

            if (!onScrollDebugUpdate) return;

            onScrollDebugUpdate({
              progress,
              beatIndex,
              beatFraction,
              beatCount: activeBeats.length,
              scrollY: window.scrollY,
              docHeight: document.documentElement.scrollHeight,
            });

            if (onBeatBlendUpdate) {
              onBeatBlendUpdate({
                fromIndex: beatIndex,
                toIndex: Math.min(beatIndex + 1, activeBeats.length - 1),
                weight: beatFraction,
              });
            }
          },
        },
      });

      if (onPoseOverrideReady) {
        onPoseOverrideReady({
          jumpToBeat: (frame, smooth = false) => {
            const st = tl.scrollTrigger;
            if (!st) return;
            debugFrameStateRef.current.localFrame = frame;
            const maxFrame = 260;
            const progress = Math.max(0, Math.min(maxFrame, frame)) / maxFrame;
            const targetY = st.start + (st.end - st.start) * progress;
            window.scrollTo({
              top: targetY,
              behavior: smooth ? "smooth" : "auto",
            });
          },
          jumpToProgress: (progress, smooth = false) => {
            const st = tl.scrollTrigger;
            if (!st) return;
            const targetY = st.start + (st.end - st.start) * progress;
            window.scrollTo({
              top: targetY,
              behavior: smooth ? "smooth" : "auto",
            });
          },
          setCamOverride: (partial) => {
            poseOverrideRef.current.camPos = partial
              ? { ...poseOverrideRef.current.camPos, ...partial }
              : null;
          },
          setRingRotOverride: (partial) => {
            poseOverrideRef.current.ringRot = partial
              ? {
                  x: 0,
                  y: 0,
                  z: 0,
                  ...poseOverrideRef.current.ringRot,
                  ...partial,
                }
              : null;
          },
          setRingPosOffsetOverride: (partial) => {
            poseOverrideRef.current.ringPosOffset = partial
              ? { ...poseOverrideRef.current.ringPosOffset, ...partial }
              : null;
          },
          setRingScaleOverride: (value) => {
            poseOverrideRef.current.ringScale = value ?? null;
          },
          reloadRingModel: (newBeats, targetTimeline = "desktop") => {
            console.log(`[RingHero] API reloadRingModel called for ${targetTimeline}!`);

            if (newBeats) {
              if (targetTimeline === "mobile") {
                mobileBeatsRef.current = cloneBeatsTimeline(newBeats);
              } else {
                beatsRef.current = cloneBeatsTimeline(newBeats);
              }
            }

            if (ring) {
              scene.remove(ring);
              ring.traverse((obj) => {
                if (obj.geometry) obj.geometry.dispose();
              });
              gemMaterials.forEach((mat) => mat?.dispose?.());
              gemMaterials = [];
              ring = null;
            }

            gltfLoader.load(
              effectiveGlbUrl,
              (gltf) => {
                if (disposed) return;
                ring = gltf.scene;

                const effectiveGemPreset = {
                  ...gemPreset,
                  ...diamondConfig,
                  ...(gemMaterialTypeOverride ? { materialType: gemMaterialTypeOverride } : {}),
                };

                const { gemMeshes, metalMeshes, debugList } =
                  classifyRingMeshes(ring);
                gemMeshesRef.current = gemMeshes;

                const effectiveGemEnv = metalEnvMap || proceduralGemEnv;
                gemMaterials = gemMeshes.map((child) => {
                  let mat = getMeshGemMaterial({
                    mesh: child,
                    preset: effectiveGemPreset,
                    envMapBase: gemEnvTexturesRef.current.base,
                    envMapSpot: gemEnvTexturesRef.current.spot,
                    deviceTier,
                    pmremEnv: effectiveGemEnv,
                  });
                  if ("envMapIntensity" in mat) {
                    const intensityScale = mat.isMobileGemMaterial ? 2.0 : 1.0;
                    mat.envMapIntensity =
                      ((getTimelineBeats()[0].gemEnvIntensity *
                        calculateDiamondEnvMapIntensityRaw({})) /
                      5.0) * intensityScale;
                  }
                  child.material = mat;
                  if (mat.isRoughRefractionMaterial && !mat.isBaked) {
                    try {
                      attachBvhToGemMaterial(child, mat);
                    } catch (bvhErr) {
                      console.warn("RingHero: BVH reload failed, using physical fallback:", bvhErr);
                      diagnostics.logAssetFailure("attachBvhToGemMaterial", bvhErr);
                      mat = buildGemMaterial(effectiveGemPreset, null, null, "low", metalEnvMap);
                      child.material = mat;
                    }
                  }
                  child.castShadow = false;
                  child.receiveShadow = false;
                  return mat;
                });
                gemMaterialsRef.current = gemMaterials;
                applyHdrConfigToLiveMaterials();

                metalMeshes.forEach((child) => {
                  child.material = metalMaterial;
                  child.castShadow = false;
                  child.receiveShadow = false;
                });

                if (import.meta.env.DEV) {
                  console.table(debugList);
                }
                onMeshesClassified?.(debugList);

                const box = new THREE.Box3().setFromObject(ring);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 1.4 / maxDim;
                ring.scale.setScalar(scale);
                ring.position.sub(center.multiplyScalar(scale));

                scene.add(ring);

                ringHeroTransform.position.copy(ring.position);
                ringHeroTransform.rotation.copy(ring.rotation);
                ringHeroTransform.scale = ring.scale.x;
                ringHeroTransform.diameter = Math.max(size.x, size.z) * scale;

                applyHdrConfigToLiveMaterials();
                setupScrollTimeline();
              },
              undefined,
              (err) => {
                console.error("[RingHero] failed to reload GLB:", err);
              },
            );
          },
          inheritMobileFromMain: () => {
            mobileBeatsRef.current = cloneBeatsTimeline(beatsRef.current);
            setupScrollTimeline();
            notifyKeyframesUpdate("mobile");
            return mobileBeatsRef.current;
          },
          loadTimeline: (targetTimeline, newBeats) => {
            if (!newBeats || !Array.isArray(newBeats) || newBeats.length === 0) return;
            if (targetTimeline === "mobile") {
              mobileBeatsRef.current = cloneBeatsTimeline(newBeats);
            } else {
              beatsRef.current = cloneBeatsTimeline(newBeats);
            }
            setupScrollTimeline();
            notifyKeyframesUpdate(targetTimeline);
          },
          getCurrentPose: () => ({
            camPos: { ...camState },
            ringRot: { ...rotState },
            ringPosOffset: { ...ringPosOffsetState },
            ringScale: ringScaleState?.value ?? 1,
            cornerPark: cornerParkState?.value ?? 0,
          }),
          saveKeyframe: (frame, data, target = "desktop") => {
            const beats = getTimelineBeats(target);
            const idx = beats.findIndex((b) => b.frame === frame);
            if (idx !== -1) {
              beats[idx] = {
                ...beats[idx],
                ...data,
                frame,
              };
            } else {
              const base = getBaseValuesForFrame(frame, target);
              const newBeat = {
                ...base,
                ...data,
                frame,
              };
              beats.push(newBeat);
              beats.sort((a, b) => a.frame - b.frame);
            }
            setupScrollTimeline();
            notifyKeyframesUpdate(target);
          },
          clearKeyframe: (frame, target = "desktop") => {
            const beats = getTimelineBeats(target);
            if (beats.length <= 2) {
              alert("A timeline must have at least 2 keyframes (start and end)!");
              return;
            }
            const idx = beats.findIndex((b) => b.frame === frame);
            if (idx !== -1) {
              beats.splice(idx, 1);
              setupScrollTimeline();
              notifyKeyframesUpdate(target);
            }
          },
          moveKeyframe: (oldFrame, newFrame, target = "desktop") => {
            if (oldFrame === newFrame) return;
            const beats = getTimelineBeats(target);
            const idx = beats.findIndex((b) => b.frame === oldFrame);
            if (idx !== -1) {
              const existingIdx = beats.findIndex((b) => b.frame === newFrame);
              if (existingIdx !== -1 && existingIdx !== idx) {
                beats.splice(existingIdx, 1);
              }
              const targetIdx = beats.findIndex((b) => b.frame === oldFrame);
              if (targetIdx !== -1) {
                beats[targetIdx].frame = newFrame;
                beats.sort((a, b) => a.frame - b.frame);
                setupScrollTimeline();
                notifyKeyframesUpdate(target);
              }
            }
          },
          getKeyframeSnapshot: (target = "desktop") => {
            const beats = getTimelineBeats(target);
            const map = {};
            beats.forEach((b) => {
              map[b.frame] = {
                ...b,
                camPos: { ...b.camPos },
                ringRot: { ...b.ringRot },
                ringPosOffset: { ...(b.ringPosOffset || { x: 0, y: 0, z: 0 }) },
              };
            });
            return map;
          },
          getBaseValuesForFrame: (frame, targetTimeline = "desktop") =>
            getBaseValuesForFrame(frame, targetTimeline),
          getFullTimeline: (targetTimeline = "desktop") => {
            const beats = getTimelineBeats(targetTimeline);
            return cloneBeatsTimeline(beats);
          },
          setCornerParkOverride: (value) => {
            poseOverrideRef.current.cornerPark = value;
          },
        });
      }

      // Build GSAP tweens between each keyframe in activeBeats
      for (let i = 1; i < activeBeats.length; i++) {
        const prevTarget = activeBeats[i - 1];
        const currTarget = activeBeats[i];
        const prevFrame = prevTarget.frame;
        const currFrame = currTarget.frame;
        const duration = currFrame - prevFrame;
        if (duration <= 0) continue;

        tl.fromTo(
          camState,
          {
            x: prevTarget.camPos.x,
            y: prevTarget.camPos.y,
            z: prevTarget.camPos.z,
            lookAtY: prevTarget.camPos.lookAtY ?? 0,
          },
          {
            x: currTarget.camPos.x,
            y: currTarget.camPos.y,
            z: currTarget.camPos.z,
            lookAtY: currTarget.camPos.lookAtY ?? 0,
            duration: duration,
            ease: "power1.inOut",
            immediateRender: false,
          },
          prevFrame,
        )
          .fromTo(
            rotState,
            {
              x: prevTarget.ringRot.x,
              y: prevTarget.ringRot.y,
              z: prevTarget.ringRot.z,
            },
            {
              x: currTarget.ringRot.x,
              y: currTarget.ringRot.y,
              z: currTarget.ringRot.z,
              duration: duration,
              ease: "power1.inOut",
              immediateRender: false,
            },
            prevFrame,
          )
          .fromTo(
            ringPosOffsetState,
            {
              x: prevTarget.ringPosOffset?.x ?? 0,
              y: prevTarget.ringPosOffset?.y ?? 0,
              z: prevTarget.ringPosOffset?.z ?? 0,
            },
            {
              x: currTarget.ringPosOffset?.x ?? 0,
              y: currTarget.ringPosOffset?.y ?? 0,
              z: currTarget.ringPosOffset?.z ?? 0,
              duration: duration,
              ease: "power1.inOut",
              immediateRender: false,
            },
            prevFrame,
          )
          .fromTo(
            ringScaleState,
            {
              value: prevTarget.ringScale ?? 1,
            },
            {
              value: currTarget.ringScale ?? 1,
              duration: duration,
              ease: "power1.inOut",
              immediateRender: false,
            },
            prevFrame,
          )
          .fromTo(
            metalEnvState,
            {
              value: prevTarget.metalEnvIntensity ?? 4,
            },
            {
              value: currTarget.metalEnvIntensity ?? 4,
              duration: duration,
              ease: "power1.inOut",
              immediateRender: false,
            },
            prevFrame,
          )
          .fromTo(
            gemEnvState,
            {
              value: prevTarget.gemEnvIntensity ?? 1.2,
            },
            {
              value: currTarget.gemEnvIntensity ?? 1.2,
              duration: duration,
              ease: "power1.inOut",
              immediateRender: false,
            },
            prevFrame,
          )
          .fromTo(
            cornerParkState,
            {
              value: prevTarget.cornerPark ?? 0,
            },
            {
              value: currTarget.cornerPark ?? 0,
              duration: duration,
              ease: "power1.inOut",
              immediateRender: false,
            },
            prevFrame,
          )
          .fromTo(
            bgState,
            {
              top: prevTarget.bgTop ?? "#0d0d10",
              bottom: prevTarget.bgBottom ?? "#1a1a1f",
            },
            {
              top: currTarget.bgTop ?? "#0d0d10",
              bottom: currTarget.bgBottom ?? "#1a1a1f",
              duration: duration,
              ease: "power1.inOut",
              immediateRender: false,
              onUpdate: applyBackground,
            },
            prevFrame,
          );
      }

      // Restore timeline progress to where user currently was
      if (prevProgress > 0) {
        tl.progress(prevProgress, true);
      } else {
        tl.progress(0, true);
        const frame0Target = baselineTarget;
        camState.x = frame0Target.camPos.x;
        camState.y = frame0Target.camPos.y;
        camState.z = frame0Target.camPos.z;
        camState.lookAtY = frame0Target.camPos.lookAtY ?? 0;
        rotState.x = frame0Target.ringRot.x;
        rotState.y = frame0Target.ringRot.y;
        rotState.z = frame0Target.ringRot.z;
        ringPosOffsetState.x = frame0Target.ringPosOffset?.x ?? 0;
        ringPosOffsetState.y = frame0Target.ringPosOffset?.y ?? 0;
        ringPosOffsetState.z = frame0Target.ringPosOffset?.z ?? 0;
        ringScaleState.value = frame0Target.ringScale ?? 1;
        metalEnvState.value = frame0Target.metalEnvIntensity ?? 4;
        gemEnvState.value = frame0Target.gemEnvIntensity ?? 1.2;
        cornerParkState.value = frame0Target.cornerPark ?? 0;
        bgState.top = frame0Target.bgTop ?? "#0d0d10";
        bgState.bottom = frame0Target.bgBottom ?? "#1a1a1f";
        applyBackground();
      }

      function applyBackground() {
        if (bgOverlayRef.current) {
          bgOverlayRef.current.style.background = `linear-gradient(180deg, ${bgState.top} 0%, ${bgState.bottom} 100%)`;
        }
      }

      // ── Unified gsap.ticker callback ─────────────────────────────────
      // Previously this file ran TWO separate loops: a requestAnimationFrame
      // loop for THREE.js rendering (animate()), and a gsap.ticker callback
      // (currentTickerFn) to write the scroll-tweened pose. They were not
      // guaranteed to fire in the same order every frame — occasionally the
      // rAF render could execute BEFORE gsap.ticker had written the new pose,
      // showing one frame of the stale position. That one-frame lag is
      // exactly what looks like a "jump". Merging both into the SAME
      // gsap.ticker callback guarantees: pose write → THREE.js render,
      // atomically, every frame. The rAF loop is removed entirely.
      currentTickerFn = () => {
        if (disposed) return;

        // ── Delta time for frame-rate-independent DOF easing ─────────────
        const now = performance.now();
        const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
        lastFrameTime = now;

        // Live dev-panel overrides win over the scroll-tweened values,
        // regardless of which beat is currently active — this is what
        // lets you tune a beat's numbers without scrubbing to it first.
        const ov = poseOverrideRef.current;
        const effCamX = ov.camPos?.x ?? camState.x;
        const effCamY = ov.camPos?.y ?? camState.y;
        const effCamZ = ov.camPos?.z ?? camState.z;
        const effRotX = ov.ringRot?.x ?? rotState.x;
        const effRotY = ov.ringRot?.y ?? rotState.y;
        const effRotZ = ov.ringRot?.z ?? rotState.z ?? 0;
        const effPosOffsetX = ov.ringPosOffset?.x ?? ringPosOffsetState.x;
        const effPosOffsetY = ov.ringPosOffset?.y ?? ringPosOffsetState.y;
        const effPosOffsetZ = ov.ringPosOffset?.z ?? ringPosOffsetState.z;
        const effScale = ov.ringScale ?? ringScaleState.value;

        // Mobile & aspect-ratio responsive scale & position math:
        const w = RESPONSIVE_V2 ? viewport.w : window.innerWidth;
        const h = RESPONSIVE_V2 ? viewport.h : window.innerHeight;
        const aspect = RESPONSIVE_V2 ? viewport.aspect : w / h;
        const isMobile = RESPONSIVE_V2 ? false : (w < 768 || aspect < 1.0);
        const localFrame = debugFrameStateRef.current?.localFrame ?? 0;

        const cpOv = ov.cornerPark;
        const cp = cpOv ?? cornerParkState.value;

        // Calibrated mobile scale and offsets so the ring stays inside viewport without clipping or expanding beyond canvas:
        let mobileScaleMult = 1.0;
        let mobileOffsetXMult = 1.0;
        let mobileOffsetYMult = 1.0;

        if (!RESPONSIVE_V2 && isMobile) {
          if (localFrame >= 42) {
            // Beat 5 (Final spinning beat): centered spin fitted to mobile bounds cleanly
            const tSpin = Math.min(1, (localFrame - 42) / 5);
            mobileScaleMult = THREE.MathUtils.lerp(1.0, 0.85, tSpin);
            mobileOffsetXMult = 1.0;
            mobileOffsetYMult = 1.0;
          } else if (cp > 0.001) {
            // Beat 2 (Corner park): position in lower-right corner without clipping right edge
            mobileScaleMult = THREE.MathUtils.lerp(1.0, 0.80, cp);
            mobileOffsetXMult = 0.40;
            mobileOffsetYMult = 0.75;
          } else if (localFrame >= 18 && localFrame <= 35) {
            // Beat 3 (Pose angle)
            mobileScaleMult = 0.72;
            mobileOffsetXMult = 0.40;
            mobileOffsetYMult = 0.70;
          } else {
            mobileScaleMult = 0.82;
            mobileOffsetXMult = 0.60;
            mobileOffsetYMult = 0.80;
          }
        }

        const responsivePosOffsetX = effPosOffsetX * mobileOffsetXMult;
        const responsivePosOffsetY = effPosOffsetY * mobileOffsetYMult;
        const responsiveScale = effScale * mobileScaleMult;

        const cpz = Math.max(0, cp * 1.6 - 0.6);
        // Arc shape: sin(pi * cp) is 0 at cp=0 and cp=1, peaking at
        // cp=0.5 — used to bow the camera path up/left mid-flight
        // instead of tracking the ring in a straight line, which is
        // what makes this read as a deliberate camera pan rather than a
        // static shot with a moving subject.
        const arc = Math.sin(Math.PI * Math.min(cp, 1));
        const camArcX = -0.35 * arc * (isMobile ? 0.4 : 1.0); // swings left mid-move
        const camArcY = 0.18 * arc * (isMobile ? 0.6 : 1.0); // lifts slightly mid-move
        // Slow dolly-in that tracks cp directly (not the arc), plus the
        // fast extra push from cpz right at the end.
        const camDollyZ = -0.3 * cp - 0.2 * cpz;

        if (camera) {
          camera.position.set(
            effCamX + camArcX,
            effCamY + camArcY,
            effCamZ + camDollyZ,
          );
          const effLookAtY = ov.camPos?.lookAtY ?? camState.lookAtY ?? 0;
          // Look-at target drifts toward the corner as the ring parks there
          const lookAtX = isMobile ? 0.28 * cp : 0.55 * cp;
          const lookAtY = effLookAtY - (isMobile ? 0.2 * cp : 0.3 * cp);
          camera.lookAt(lookAtX, lookAtY, 0);
        }

        if (metalMaterial) {
          const trim = metalMaterial.userData?._hdrTrim ?? 1;
          metalMaterial.envMapIntensity = metalEnvState.value * trim;
        }
        (gemMaterialsRef.current?.length ? gemMaterialsRef.current : gemMaterials).forEach((mat) => {
          if (!("envMapIntensity" in mat)) return;
          const trim = mat.userData?._hdrTrim ?? 1;
          const intensityScale = mat.isMobileGemMaterial ? 2.0 : 1.0;
          mat.envMapIntensity = gemEnvState.value * trim * intensityScale;
        });

        // Smooth continuous transition of diamond base environment exiting Beat 4 (frame 156) -> Beat 5 (frame 214)
        const curBlend = computeBlendedGemBaseEnv(
          hdrConfigRef.current.gemBaseEnv,
          hdrConfigRef.current.interactiveGemBaseEnv,
          localFrame
        );
        if (Math.abs(curBlend.blendT - lastAppliedGemBlendRef.current) > 1e-4) {
          lastAppliedGemBlendRef.current = curBlend.blendT;
          (gemMaterialsRef.current?.length ? gemMaterialsRef.current : gemMaterials).forEach((mat) => {
            applyGemBaseEnvToMaterial(mat, curBlend);
          });
        }

        // Smooth continuous transition of metal base environment and metal spotlight exiting Beat 4 (frame 156) -> Beat 5 (frame 214)
        const isMetalBlending = localFrame > 156 && localFrame < 214;
        const needsMetalLatch = (localFrame <= 156 && lastAppliedMetalBlendRef.current !== 0) ||
                                (localFrame >= 214 && lastAppliedMetalBlendRef.current !== 1);
        if (isMetalBlending || needsMetalLatch) {
          const baseMetalEnv = {
            rotation: hdrConfigRef.current.metalHdrRotation,
            rotationY: hdrConfigRef.current.metalHdrRotationY,
            rot: hdrConfigRef.current.metalHdrRot,
            scale: hdrConfigRef.current.metalHdrScale,
            scaleU: hdrConfigRef.current.metalHdrScaleU,
            scaleV: hdrConfigRef.current.metalHdrScaleV,
            transU: hdrConfigRef.current.metalHdrTransU,
            transV: hdrConfigRef.current.metalHdrTransV,
            scaleInvert: hdrConfigRef.current.metalHdrScaleInvert,
            power: hdrConfigRef.current.metalHdrPower,
            gamma: hdrConfigRef.current.metalHdrGamma,
            saturation: hdrConfigRef.current.metalHdrSaturation,
          };
          const curMetalBlend = computeBlendedMetalEnv(
            baseMetalEnv,
            hdrConfigRef.current.interactiveMetalHdrConfig,
            localFrame
          );
          const curMetalSpotBlend = computeBlendedMetalSpotEnv(
            hdrConfigRef.current.metalSpotEnv,
            hdrConfigRef.current.interactiveMetalSpotEnv,
            localFrame
          );
          if (
            Math.abs(curMetalBlend.blendT - lastAppliedMetalBlendRef.current) > 1e-4 ||
            Math.abs(curMetalSpotBlend.blendT - lastAppliedMetalSpotBlendRef.current) > 1e-4
          ) {
            lastAppliedMetalBlendRef.current = curMetalBlend.blendT;
            lastAppliedMetalSpotBlendRef.current = curMetalSpotBlend.blendT;
            applyMetalEnvToMaterial(
              metalMaterialRef.current || metalMaterial,
              curMetalBlend,
              curMetalSpotBlend,
              metalEnvState.value
            );
          }
        }

        /* [EXPERIMENTAL_ATMOSPHERE] Subtle idle float, micro-tilt shimmer & mouse parallax whenever ring is still (Beats 1–4) */
        // Active from Frame 0 up to end of Beat 4 (~frame 210); blends to 0 entering Beat 5 (frames 210–214)
        const beatRangeFactor = Math.max(0, Math.min(1, (214 - localFrame) / 5));

        // Detect if the ring / scroll is actively moving across frames
        const frameDelta = Math.abs(localFrame - lastMotionFrameRef.current);
        lastMotionFrameRef.current = localFrame;
        if (frameDelta > 0.003) {
          lastMotionTimeRef.current = now;
        }

        // Wait 300ms after scroll input stops so Lenis and GSAP scrub have completely coasted to a halt
        const isStill = (now - lastMotionTimeRef.current) > 300;
        const isRingDebug = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("ringdebug");
        const isMobileAtmosphereAlwaysOn =
          RESPONSIVE_V2 && viewport.profile === "portrait" && localFrame <= 128;

        // Video sections: Beat 2 (Classic E-Commerce, frames ~24-65) & Beat 3 (Creative Visuals, frames ~68-115)
        // In these sections, disable atmosphere float and pause 3D rendering when stationary so videos stream at full 60 FPS
        const inVideoSection = localFrame >= 24 && localFrame <= 118;

        const targetWeight =
          !isRingDebug &&
          experimentalAtmosphere &&
          !inVideoSection &&
          (isMobileAtmosphereAlwaysOn || isStill) &&
          beatRangeFactor > 0.001
            ? beatRangeFactor
            : 0.0;

        if (inVideoSection) {
          atmosphereWeightRef.current = 0;
        }

        // Snappy, clean ease-out when scrolling begins (~0.12s); graceful luxury ease-in when at rest (~0.5s)
        const easeSpeed = targetWeight > atmosphereWeightRef.current ? 2.5 : 9.0;
        atmosphereWeightRef.current +=
          (targetWeight - atmosphereWeightRef.current) *
          (1 - Math.exp(-easeSpeed * dt));

        const rawWeight = atmosphereWeightRef.current;
        // Smoothstep S-curve (3w^2 - 2w^3) ensures zero initial acceleration/jerk when easing in
        const smoothWeight = rawWeight * rawWeight * (3 - 2 * rawWeight);

        // Advance phase while atmosphere is active
        if (rawWeight <= 0.002) {
          idlePhaseRef.current = 0;
        } else {
          idlePhaseRef.current += dt;
        }
        const p = idlePhaseRef.current;

        let idleFloatY = 0;
        let idleTiltX = 0;
        let idleSwayY = 0;
        let idleRollZ = 0;
        let parallaxX = 0;
        let parallaxY = 0;

        if (smoothWeight > 0.0001) {
          // All harmonics use sin(p * freq) so at p = 0 they start precisely at 0 with 0 offset and 0 glitch
          idleFloatY = (Math.sin(p * 0.85) * 0.022 + Math.sin(p * 1.7) * 0.005) * smoothWeight;
          idleTiltX = Math.sin(p * 0.65) * 0.012 * smoothWeight;
          idleSwayY = Math.sin(p * 0.50) * 0.018 * smoothWeight; // sin instead of cos: starts at exactly 0.000!
          idleRollZ = Math.sin(p * 0.75) * 0.008 * smoothWeight;

          // Smooth pointer parallax
          mouseParallaxRef.current.x +=
            (pointerNDC.x * 0.04 - mouseParallaxRef.current.x) * (1 - Math.exp(-6 * dt));
          mouseParallaxRef.current.y +=
            (pointerNDC.y * 0.03 - mouseParallaxRef.current.y) * (1 - Math.exp(-6 * dt));

          parallaxX = mouseParallaxRef.current.x * smoothWeight;
          parallaxY = mouseParallaxRef.current.y * smoothWeight;
        }

        if (ring) {
          const spinStart = (autoRotateStartFrame ?? 214) - 0.25;
          const inSpinSection = localFrame >= spinStart;

          let interactiveOffsetY = 0;
          let interactiveOffsetX = 0;

          if (inSpinSection) {
            wasInSpinSectionRef.current = true;

            // Inside the 360 spin & interactive section:
            // Continuous unified turntable rotation around Y.
            // When NOT dragging (and not in freeze debug), continuously advance currentSpinYRef
            if (!dragStateRef.current.dragging && !isRingDebug && autoRotateEnabledRef.current) {
              currentSpinYRef.current = wrapAngle(
                currentSpinYRef.current + autoRotateSpeed * dt,
              );
            }

            // Keep legacy refs synchronized for inspector / debug compatibility
            autoRotateAngleRef.current = currentSpinYRef.current;
            manualRotRef.current.y = currentSpinYRef.current;

            // Smooth return of tilt X back to default upright orientation (0) when exiting Beat 5
            const shouldDampTilt = !interactiveActiveRef.current;

            if (shouldDampTilt && !dragStateRef.current.dragging) {
              const safeDt = Math.min(dt, 0.1);
              const dampFactor = 1 - Math.exp(-5.0 * safeDt);
              if (Math.abs(manualRotRef.current.x) > 0.0001) {
                manualRotRef.current.x += (0 - manualRotRef.current.x) * dampFactor;
                if (Math.abs(manualRotRef.current.x) < 0.0001) {
                  manualRotRef.current.x = 0;
                }
              }
            }

            interactiveOffsetY = currentSpinYRef.current;
            interactiveOffsetX = manualRotRef.current.x;

            // Latch exit offset continuously so there is zero angular snap at the boundary.
            // Wrapped to [-π, +π] so scroll-up never helicopter-spins or unwinds multi-turn rotations.
            exitOffsetRef.current = wrapAngle(currentSpinYRef.current);
            exitTiltXRef.current = interactiveOffsetX;
          } else {
            // Outside the 360 spin section (scrolling back up towards Beat 4):
            // Transition zone (frames spinStart - 25 down to spinStart, e.g. 188.75–213.75):
            const transitionDist = 25;
            const transitionStart = Math.max(0, spinStart - transitionDist);
            if (wasInSpinSectionRef.current && localFrame > transitionStart) {
              const scrollT = Math.max(
                0,
                Math.min(1, (localFrame - transitionStart) / (spinStart - transitionStart)),
              );
              // Smoothstep S-curve (3t^2 - 2t^3) guarantees 0 acceleration jerk at both ends
              const blend = scrollT * scrollT * (3 - 2 * scrollT);

              interactiveOffsetY = exitOffsetRef.current * blend;
              interactiveOffsetX = exitTiltXRef.current * blend;

              // Keep currentSpinYRef synchronized with the eased offset so scrolling back down
              // into Beat 5 has zero angular snap or jump at the boundary.
              currentSpinYRef.current = exitOffsetRef.current;
              autoRotateAngleRef.current = exitOffsetRef.current;
              manualRotRef.current.y = exitOffsetRef.current;
            } else {
              // Below the transition zone (cleanly in Beats 1 to 4):
              wasInSpinSectionRef.current = false;
              exitOffsetRef.current = 0;
              exitTiltXRef.current = 0;
              autoRotateAngleRef.current = 0;
              currentSpinYRef.current = 0;
              manualRotRef.current.x = 0;
              manualRotRef.current.y = 0;
              interactiveOffsetY = 0;
              interactiveOffsetX = 0;
            }
          }

          interactiveOffsetYRef.current = interactiveOffsetY;

          let finalRotY = effRotY + interactiveOffsetY + idleSwayY + parallaxX;
          let finalRotX = effRotX + interactiveOffsetX + idleTiltX - parallaxY;
          let finalRotZ = effRotZ + idleRollZ;

          if (RESPONSIVE_V2 && viewport.profile === "portrait") {
            const isColumnBeats = smooth(18, 32, localFrame) * (1 - smooth(115, 128, localFrame));
            if (isColumnBeats > 0.0001) {
              // Beat 2 to 3 rotation animation (mobile & tablet only):
              // During the scroll transition between Beat 2 (frame ~52) and Beat 3 (frame ~85),
              // perform a full 360-degree rotation with dynamic tilt and roll, mirroring the
              // sweeping cinematic animation from Beat 1 to 2.
              const t23 = smooth(52, 85, localFrame);
              const spin23 = Math.sin(Math.PI * t23);

              // 1. Full 360-degree spin around Y (continuous rotation)
              const baseRotY = -Math.PI * 2 * t23;

              // 2. Dynamic tilt around X: tilts up toward hero view (1.20) at midpoint, then settles upright (0.35)
              const baseRotX = 0.35 + 0.85 * spin23;

              // 3. Dynamic roll around Z: gentle 3D roll during the turn matching Beat 1 to 2
              const baseRotZ = 0.70 * spin23;

              // Base orientation with dynamic Beat 2->3 spin, plus atmosphere float/sway/tilt
              finalRotX = THREE.MathUtils.lerp(finalRotX, baseRotX + idleTiltX - parallaxY, isColumnBeats);
              finalRotY = THREE.MathUtils.lerp(finalRotY, baseRotY + idleSwayY + parallaxX, isColumnBeats);
              finalRotZ = THREE.MathUtils.lerp(finalRotZ, baseRotZ + idleRollZ, isColumnBeats);
            }
          }

          ring.rotation.set(finalRotX, finalRotY, finalRotZ);

          const heroX = ringHeroTransform.position.x + responsivePosOffsetX;
          const heroY = ringHeroTransform.position.y + responsivePosOffsetY + idleFloatY;
          const heroZ = ringHeroTransform.position.z + effPosOffsetZ;

          if (cp > 0.0001) {
            // Target corner position: on mobile, place ring so diamond head is fully visible on right side matching desktop layout
            const cornerX = isMobile ? 0.72 : heroX + 0.7;
            const cornerY = isMobile ? -0.38 + idleFloatY : heroY - 0.6;
            const cornerZ = heroZ + 0.25;

            const bowX = -0.2 * arc * (isMobile ? 0.4 : 1.0);
            const bowY = 0.15 * arc;

            ring.position.set(
              THREE.MathUtils.lerp(heroX, cornerX, cp) + bowX,
              THREE.MathUtils.lerp(heroY, cornerY, cp) + bowY,
              THREE.MathUtils.lerp(heroZ, cornerZ, cp),
            );

            const parkScale = THREE.MathUtils.lerp(1, isMobile ? 0.95 : 1.25, cp);
            ring.scale.setScalar(
              ringHeroTransform.scale * responsiveScale * parkScale,
            );
          } else {
            ring.position.set(heroX, heroY, heroZ);
            ring.scale.setScalar(ringHeroTransform.scale * responsiveScale);
          }

          if (RESPONSIVE_V2) {
            if (viewport.profile === "portrait") {
              retargetForPortrait(localFrame);
            } else {
              retargetForLandscape(localFrame);
            }
          }

          // Update ring inverse matrix on GPU only while virus/fog color transition is actively spreading
          const activeMetalMat = metalMaterialRef.current;
          if (
            activeMetalMat?.userData?.metalTransitionProgress?.value < 0.999 &&
            activeMetalMat.userData.metalRingInvMatrix
          ) {
            ring.updateMatrixWorld();
            activeMetalMat.userData.metalRingInvMatrix.value
              .copy(ring.matrixWorld)
              .invert();
          }
        }

        const isMetalSpreading =
          (metalMaterialRef.current?.userData?.metalTransitionProgress?.value ?? 1.0) < 0.999;

        // ── Demand-driven render in video sections ─────────────────────────
        if (inVideoSection && isStill && atmosphereWeightRef.current <= 0.005 && !isMetalSpreading) {
          if (settleFramesRef.current >= 5) {
            // Ring has completely settled in 4K resolution; pause rendering to free 100% GPU for smooth video
            return;
          }
          settleFramesRef.current += 1;
        } else {
          settleFramesRef.current = 0;
        }

        if (typeof document !== "undefined" && document.hidden) return;

        // ── Update mobile/gem camera matrices & uniforms for raytracer ───
        if (gemMeshesRef.current && gemMeshesRef.current.length > 0 && camera) {
          for (let i = 0; i < gemMeshesRef.current.length; i++) {
            const gMat = gemMeshesRef.current[i].material;
            if (gMat && gMat.isRoughRefractionMaterial) {
              if (gMat.viewMatrixInverse) {
                gMat.viewMatrixInverse.copy(camera.matrixWorld);
              }
              if (gMat.projectionMatrixInverse) {
                gMat.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
              }
              if (gMat.uniforms?.resolution?.value && renderer) {
                gMat.uniforms.resolution.value.set(
                  renderer.domElement.width,
                  renderer.domElement.height
                );
              }
            }
          }
        }

        // ── Render ────────────────────────────────────────────────────────
        if (typeof window !== "undefined" && window.location.search.includes("debug") && renderer && Math.random() < 0.05) {
          diagnostics.setRendererInfo({
            calls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
            textures: renderer.info.memory.textures,
            geometries: renderer.info.memory.geometries,
          });
        }

        if (composer) {
          try {
            composer.render(dt);
          } catch (cErr) {
            console.warn("RingHero: composer.render failed on this GPU, falling back to direct render:", cErr);
            composer = null;
            if (renderer && scene && camera) renderer.render(scene, camera);
          }
        } else if (renderer && scene && camera) {
          renderer.render(scene, camera);
        }
      };
      // Run the ticker once synchronously before registering it.
      currentTickerFn();
      gsap.ticker.add(currentTickerFn);
    }

    // ── Live 2D Screen Bounds Hook for Perspective Showcase Box ──────────
    window.__getCinegemRingBounds = () => {
      if (!ring || !camera) return null;
      camera.updateMatrixWorld(true);
      ring.updateMatrixWorld(true);
      const _v = new THREE.Vector3();
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      ring.traverse((o) => {
        const pos = o.isMesh && o.geometry?.attributes?.position;
        if (!pos) return;
        const step = Math.max(1, Math.floor(pos.count / 1500));
        for (let i = 0; i < pos.count; i += step) {
          _v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).project(camera);
          if (_v.x < x0) x0 = _v.x; if (_v.x > x1) x1 = _v.x;
          if (_v.y < y0) y0 = _v.y; if (_v.y > y1) y1 = _v.y;
        }
      });
      if (!isFinite(x0)) return null;
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const left = ((x0 + 1) / 2) * winW;
      const right = ((x1 + 1) / 2) * winW;
      const top = ((1 - y1) / 2) * winH;
      const bottom = ((1 - y0) / 2) * winH;
      return {
        left,
        right,
        top,
        bottom,
        w: right - left,
        h: bottom - top,
        cx: (left + right) / 2,
        cy: (top + bottom) / 2,
      };
    };

    // ── Debug measurement hook (dev or ?ringdebug=1) ─────────────────────
    if (import.meta.env.DEV || new URLSearchParams(location.search).has("ringdebug")) {
      const _v = new THREE.Vector3();
      window.__ringDebug = {
        scene,
        keyLight,
        fillLight,
        getRotationDebug() {
          return {
            frame: +(debugFrameStateRef.current?.localFrame ?? 0).toFixed(2),
            ringRotY: ring ? +ring.rotation.y.toFixed(4) : 0,
            ringRotX: ring ? +ring.rotation.x.toFixed(4) : 0,
            autoRotateAngle: +autoRotateAngleRef.current.toFixed(4),
            manualRotY: +manualRotRef.current.y.toFixed(4),
            manualRotX: +manualRotRef.current.x.toFixed(4),
            exitOffset: +exitOffsetRef.current.toFixed(4),
            currentSpinY: +currentSpinYRef.current.toFixed(4),
            interactiveOffsetY: +interactiveOffsetYRef.current.toFixed(4),
            dragging: !!dragStateRef.current.dragging,
            interactiveActive: !!interactiveActiveRef.current,
          };
        },
        resetRotation() {
          currentSpinYRef.current = 0;
          autoRotateAngleRef.current = 0;
          manualRotRef.current.x = 0;
          manualRotRef.current.y = 0;
          exitOffsetRef.current = 0;
          exitTiltXRef.current = 0;
          interactiveOffsetYRef.current = 0;
        },
        getDiamondUniforms() {
          const mat = gemMaterialsRef.current?.[0] || gemMaterials?.[0];
          if (!mat) return null;
          return {
            frame: +(debugFrameStateRef.current?.localFrame ?? 0).toFixed(2),
            basePower: +Number(mat.basePower ?? mat.uniforms?.basePower?.value ?? 0).toFixed(3),
            baseGamma: +Number(mat.baseGamma ?? mat.uniforms?.baseGamma?.value ?? 0).toFixed(3),
            baseRotDeg: +Number(THREE.MathUtils.radToDeg(mat.baseRot ?? mat.uniforms?.baseRot?.value ?? 0)).toFixed(2),
            scaleU: +Number(mat.baseScale?.x ?? mat.uniforms?.baseScale?.value?.x ?? 0).toFixed(3),
            scaleV: +Number(mat.baseScale?.y ?? mat.uniforms?.baseScale?.value?.y ?? 0).toFixed(3),
            transU: +Number(mat.baseTrans?.x ?? mat.uniforms?.baseTrans?.value?.x ?? 0).toFixed(3),
            transV: +Number(mat.baseTrans?.y ?? mat.uniforms?.baseTrans?.value?.y ?? 0).toFixed(3),
          };
        },
        getMetalUniforms() {
          const mat = metalMaterialRef.current;
          if (!mat) return null;
          return {
            envMapIntensity: +Number(mat.envMapIntensity ?? 0).toFixed(3),
            hdrTrim: +Number(mat.userData?._hdrTrim ?? 1).toFixed(3),
            envSaturation: +Number(mat.userData?.envSaturation?.value ?? 1).toFixed(3),
            scaleU: mat.userData?.metalScale ? +Number(mat.userData.metalScale.value.x).toFixed(3) : 1.0,
            scaleV: mat.userData?.metalScale ? +Number(mat.userData.metalScale.value.y).toFixed(3) : 1.0,
            transU: mat.userData?.metalTrans ? +Number(mat.userData.metalTrans.value.x).toFixed(3) : 0.0,
            transV: mat.userData?.metalTrans ? +Number(mat.userData.metalTrans.value.y).toFixed(3) : 0.0,
            rotYDeg: mat.envMapRotation ? +Number(THREE.MathUtils.radToDeg(mat.envMapRotation.y)).toFixed(2) : 0,
            rotXDeg: mat.envMapRotation ? +Number(THREE.MathUtils.radToDeg(mat.envMapRotation.x)).toFixed(2) : 0,
            hasMetalSpot: mat.userData?.hasMetalSpot?.value ?? 0,
            metalSpotPower: mat.userData?.metalSpotPower?.value ?? 0,
            metalSpotGamma: mat.userData?.metalSpotGamma?.value ?? 0,
            metalSpotRotDeg: mat.userData?.metalSpotRot ? +Number(THREE.MathUtils.radToDeg(mat.userData.metalSpotRot.value)).toFixed(2) : 0,
            metalSpotScaleU: mat.userData?.metalSpotScale?.value?.x ?? 1,
            metalSpotScaleV: mat.userData?.metalSpotScale?.value?.y ?? 1,
            metalSpotTransU: mat.userData?.metalSpotTrans?.value?.x ?? 0,
            metalSpotTransV: mat.userData?.metalSpotTrans?.value?.y ?? 0,
            metalEnvView: mat.userData?.metalEnvView?.value ?? 0,
          };
        },
        getPreviewDebug() {
          const r = envPreviewRendererRef.current;
          const u = r?.material?.uniforms;
          const mTex = u?.envMapMetal?.value;
          return {
            hasRenderer: Boolean(r),
            metalTexturePresent: Boolean(mTex),
            isDummyBlack: mTex === r?.dummyBlackTexture,
            mTexType: mTex?.constructor?.name,
            mTexImage: mTex?.image ? { w: mTex.image.width, h: mTex.image.height } : null,
            uMode: u?.uMode?.value,
            hasMetal: u?.hasMetal?.value,
            metalScale: u?.metalFactorScale?.value ?? u?.metalScale?.value,
            metalScaleU: u?.metalScale?.value?.x,
            metalScaleV: u?.metalScale?.value?.y,
            metalTransU: u?.metalTrans?.value?.x,
            metalTransV: u?.metalTrans?.value?.y,
            metalRot: u?.metalRot?.value,
            metalPower: u?.metalPower?.value,
            metalGamma: u?.metalGamma?.value,
            metalSaturation: u?.metalSaturation?.value,
            metalSpotEnabled: u?.metalSpotEnabled?.value ?? 0,
            metalSpotPower: u?.metalSpotPower?.value,
            metalSpotGamma: u?.metalSpotGamma?.value,
            metalSpotRot: u?.metalSpotRot?.value,
            metalSpotScaleU: u?.metalSpotScale?.value?.x,
            metalSpotScaleV: u?.metalSpotScale?.value?.y,
            metalSpotTransU: u?.metalSpotTrans?.value?.x,
            metalSpotTransV: u?.metalSpotTrans?.value?.y,
            metalEnvView: u?.metalEnvView?.value,
          };
        },
        getSceneLightsDebug() {
          return {
            keyLight: keyLightRef.current ? {
              visible: keyLightRef.current.visible,
              intensity: keyLightRef.current.intensity,
              position: keyLightRef.current.position.toArray(),
            } : null,
            fillLight: fillLightRef.current ? {
              visible: fillLightRef.current.visible,
              intensity: fillLightRef.current.intensity,
              position: fillLightRef.current.position.toArray(),
            } : null,
          };
        },
        // Tight screen-space bounds of the ring in NDC (-1..1). Samples mesh vertices.
        measure() {
          if (!ring || !camera) return null;
          camera.updateMatrixWorld(true);
          ring.updateMatrixWorld(true);
          let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
          ring.traverse((o) => {
            const pos = o.isMesh && o.geometry?.attributes?.position;
            if (!pos) return;
            const step = Math.max(1, Math.floor(pos.count / 3000));
            for (let i = 0; i < pos.count; i += step) {
              _v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).project(camera);
              if (_v.x < x0) x0 = _v.x; if (_v.x > x1) x1 = _v.x;
              if (_v.y < y0) y0 = _v.y; if (_v.y > y1) y1 = _v.y;
            }
          });
          if (!isFinite(x0)) return null;
          const area = (x1 - x0) * (y1 - y0);
          const vis = Math.max(0, Math.min(1, x1) - Math.max(-1, x0)) *
                      Math.max(0, Math.min(1, y1) - Math.max(-1, y0));
          return {
            frame: +(debugFrameStateRef.current?.localFrame ?? 0).toFixed(2),
            aspect: +camera.aspect.toFixed(3),
            fov: +camera.fov.toFixed(2),
            profile: window.__ringProfile ?? null,
            cx: +((x0 + x1) / 2).toFixed(4),
            cy: +((y0 + y1) / 2).toFixed(4),
            widthPct: +(((x1 - x0) / 2) * 100).toFixed(2),   // % of viewport width
            heightPct: +(((y1 - y0) / 2) * 100).toFixed(2),  // % of viewport height
            overflow: {                                        // NDC units outside the screen, 0 = inside
              l: +Math.max(0, -1 - x0).toFixed(4), r: +Math.max(0, x1 - 1).toFixed(4),
              b: +Math.max(0, -1 - y0).toFixed(4), t: +Math.max(0, y1 - 1).toFixed(4),
            },
            visibleFraction: area > 0 ? +(vis / area).toFixed(4) : 0,
          };
        },
        getGemMaterial() {
          const m = gemMeshesRef.current?.[0]?.material;
          if (!m) return null;
          return {
            type: m.type,
            isRoughRefractionMaterial: Boolean(m.isRoughRefractionMaterial),
            isMatte: m.isMatte ?? m.uniforms?.isMatte?.value ?? null,
            envMapBase: Boolean(m.envMapBase || m.uniforms?.envMapBase?.value),
            envMapSpot: Boolean(m.envMapSpot || m.uniforms?.envMapSpot?.value),
          };
        },
      };
    }

    let resizeObserver = null;
    function handleResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const aspect = w / h;
      if (camera) {
        camera.aspect = aspect;
        if (aspect < 1.2) {
          camera.fov = 45;
        } else {
          camera.fov = 35;
        }
        camera.updateProjectionMatrix();
      }
      renderer?.setSize(w, h);
      composer?.setSize(w, h);
      settleFramesRef.current = 0;
    }

    if (RESPONSIVE_V2) {
      resizeObserver = new ResizeObserver(applyViewport);
      resizeObserver.observe(canvas);
      applyViewport();
    } else {
      window.addEventListener("resize", handleResize);
    }

    return () => {
      disposed = true;
      if (dragStateRef.current.dragging) {
        onDragStateChange?.(false);
      }
      delete window.__ringDebug;
      delete window.__getCinegemRingBounds;
      // No cancelAnimationFrame needed — render is driven by gsap.ticker now.
      if (RESPONSIVE_V2) {
        resizeObserver?.disconnect();
      } else {
        window.removeEventListener("resize", handleResize);
      }
      window.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onCanvasPointerDown);
      window.removeEventListener("pointerup", onInteractiveUp);
      window.removeEventListener("pointercancel", onInteractiveUp);
      window.removeEventListener("pointermove", onWindowPointerMove);
      if (box) {
        box.removeEventListener("pointerdown", onBoxPointerDown);
        box.removeEventListener("touchstart", onBoxTouchPrevent);
        box.removeEventListener("touchmove", onBoxTouchPrevent);
      }
      if (debugPointerDown) {
        window.removeEventListener("pointerdown", debugPointerDown, {
          capture: true,
        });
      }
      ScrollTrigger.getAll().forEach((st) => st.kill());
      if (currentTickerFn) {
        gsap.ticker.remove(currentTickerFn);
        currentTickerFn = null;
      }
      scene?.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
      });
      keyLightRef.current = null;
      fillLightRef.current = null;
      metalMaterial?.dispose?.();
      (gemMaterialsRef.current?.length ? gemMaterialsRef.current : gemMaterials).forEach((mat) => mat?.dispose?.());
      metalEnvMap?.dispose?.();
      if (proceduralGemEnv) {
        try {
          proceduralGemEnv.dispose?.();
        } catch (e) {}
        proceduralGemEnv = null;
      }
      if (gemEnvTexturesRef.current.base) {
        gemEnvTexturesRef.current.base.dispose?.();
      }
      if (gemEnvTexturesRef.current.rawSpot) {
        gemEnvTexturesRef.current.rawSpot.dispose?.();
      }
      if (gemEnvTexturesRef.current.spot && gemEnvTexturesRef.current.spot !== gemEnvTexturesRef.current.rawSpot) {
        gemEnvTexturesRef.current.spot.dispose?.();
      }
      if (gemEnvTexturesRef.current.prevBaseBlobUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(gemEnvTexturesRef.current.prevBaseBlobUrl);
      }
      if (gemEnvTexturesRef.current.prevSpotBlobUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(gemEnvTexturesRef.current.prevSpotBlobUrl);
      }
      if (gemEnvTexturesRef.current.prevMetalBlobUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(gemEnvTexturesRef.current.prevMetalBlobUrl);
      }
      if (gemEnvTexturesRef.current.prevMetalSpotBlobUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(gemEnvTexturesRef.current.prevMetalSpotBlobUrl);
      }
      if (
        gemEnvTexturesRef.current.metalSpotRaw &&
        gemEnvTexturesRef.current.metalSpotRaw !== gemEnvTexturesRef.current.rawSpot
      ) {
        gemEnvTexturesRef.current.metalSpotRaw.dispose?.();
        gemEnvTexturesRef.current.metalSpotRaw = null;
        gemEnvTexturesRef.current.metalSpot = null;
      }
      if (gemEnvTexturesRef.current.metalEnvMap) {
        gemEnvTexturesRef.current.metalEnvMap.dispose?.();
        gemEnvTexturesRef.current.metalEnvMap = null;
        gemEnvTexturesRef.current.metalRaw = null;
      }
      spotDilatorRef.current?.dispose?.();
      spotDilatorRef.current = null;
      envPreviewRendererRef.current?.dispose?.();
      envPreviewRendererRef.current = null;
      pmrem?.dispose();
      canvas?.removeEventListener("webglcontextlost", handleContextLost);
      canvas?.removeEventListener("webglcontextrestored", handleContextRestored);
      composer?.dispose();
      renderer?.dispose();
    };
  }, [
    effectiveGlbUrl,
    dracoDecoderPath,
    scrollContainerSelector,
    postFxEnabled,
    experimentalAtmosphere,
    sceneEpoch,
  ]);

  return (
    <>
      <div
        ref={bgOverlayRef}
        className={RESPONSIVE_V2 ? "ringhero-fixed" : undefined}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          maxWidth: "100vw",
          maxHeight: "100vh",
          overflow: "hidden",
          zIndex: 0,
          background: "linear-gradient(180deg, #0d0d10 0%, #1a1a1f 100%)",
        }}
      />
      <canvas
        ref={canvasRef}
        className={RESPONSIVE_V2 ? "ringhero-fixed" : undefined}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          maxWidth: "100vw",
          maxHeight: "100vh",
          overflow: "hidden",
          zIndex: 2,
          display: "block",
          touchAction: RESPONSIVE_V2 ? "pan-y" : undefined,
        }}
      />
      {/* 360-degree invisible interaction hit-area aligned 1:1 with the PerspectiveBox on mobile & tablet portrait.
          Touches inside immediately rotate the 3D ring; touches outside scroll the page naturally. */}
      <div
        ref={interactiveBoxRef}
        aria-label="Interactive 3D ring rotation area"
        style={{
          position: "fixed",
          left: "var(--pbox-outer-left, 12px)",
          top: "var(--pbox-outer-top, 300px)",
          transform: "translateY(var(--pbox-translate-y, 0px))",
          width: "var(--pbox-outer-width, min(92vw, 390px))",
          height: "var(--pbox-outer-height, min(56vh, 484px))",
          zIndex: 4,
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          pointerEvents: "none",
          display: "none",
          cursor: "grab",
        }}
      />

      {/* Desktop "Drag to explore" hint — purely visual, positioned inside the top of the showcase box.
          pointerEvents:"none" so it never intercepts the drag itself. Fades in when the interactive
          window opens, fades out on first drag (see dismissedOnceRef). */}
      {!isMobileMode && (
        <div
          className="ring-hero-drag-hint ring-hero-drag-hint--desktop"
          style={{
            position: "fixed",
            left: "50%",
            top: "calc(var(--pbox-outer-top, 90px) + 20px)",
            bottom: "auto",
            transform: "translateX(-50%) translateY(var(--pbox-translate-y, 0px))",
            zIndex: 10,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 18px",
            borderRadius: "999px",
            background: "rgba(255, 255, 255, 0.07)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            boxShadow: "0 4px 18px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
            color: "#FCFBFA",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "inherit",
            opacity: showDragHint ? 1 : 0,
            transition: "opacity 0.6s ease",
            whiteSpace: "nowrap",
          }}
        >
          3D Interactive
        </div>
      )}
      <style>{`
        @keyframes ringHeroDragHintSway {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(3px); }
        }
      `}</style>
    </>
  );
}

/* ---------------------------------------------------------------------------
 * Usage examples:
 *
 * Default (yellow gold + refraction diamond, same HDR for both):
 *   <RingHero />
 *
 * Different HDRs per element, white gold, cheap matte gem for perf:
 *   <RingHero
 *     metalPreset={metalPresets.whiteGold}
 *     metalHdrUrl="/hdr/env_metal_001_d01c4504e0.hdr"
 *     gemHdrUrl="/hdr/jewelry_showcase.hdr"
 *     gemMaterialTypeOverride="matte"
 *   />
 *
 * If a new GLB's gem meshes aren't being detected, open DevTools —
 * this component console.tables the full mesh classification list on
 * every load in dev mode. Add missing name/code mappings to
 * KNOWN_NAME_OVERRIDES in classifyMesh.js.
 * ------------------------------------------------------------------------- */

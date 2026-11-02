/**
 * hdrControls.js
 * -------------------------------------------------------------------------
 * Ported from your 3D viewer's `Client/src/hooks/useThreeScene.js`:
 * `calculateDiamondEnvMapIntensity`, `setMetalHdrConfig`, and
 * `setDiamondHdrConfig`. Same rotation/scale/power/gamma -> intensity
 * math, same defaults (100/100/100 = neutral).
 *
 * One adaptation for the hero: your viewer applies these as the ONLY
 * source of envMapIntensity. RingHero also has a scroll-driven "beat"
 * intensity (the ring gets brighter/dimmer as you scroll through the
 * story). So here, HDR-panel values are computed as a *trim factor*
 * around 1.0 at defaults, and RingHero multiplies that trim into
 * whatever the current scroll beat wants — turning a slider moves the
 * whole scroll animation up/down without fighting it or needing you to
 * pick one system over the other.
 * -------------------------------------------------------------------------
 */

// Metal: identical to setMetalHdrConfig's math. At defaults (100/100/100)
// this returns exactly 1.0, so it's already a clean multiplier/trim.
export function computeMetalHdrFactor({ scale = 100, power = 100, gamma = 100 } = {}) {
  const safeScale = typeof scale === "number" && isFinite(scale) ? scale : 100;
  const safePower = typeof power === "number" && isFinite(power) ? power : 100;
  const safeGamma = typeof gamma === "number" && isFinite(gamma) ? gamma : 100;

  const s = Math.max(0.001, (safeScale / 100) * (safePower / 100));
  const g = Math.max(0.01, safeGamma / 100);
  let factor = Math.max(0.01, Math.pow(s, 1 / g));
  if (isNaN(factor)) factor = 1.0;
  return factor;
}

// Diamond/gem: identical math to calculateDiamondEnvMapIntensity, but
// normalized by its own value-at-defaults (5.0, from the
// `bloomBalancingBoost`) so this is ALSO a clean 1.0-at-defaults trim,
// safe to multiply into the scroll beat's gemEnvIntensity. The raw
// (non-normalized) production formula is exposed too, in case you want
// to use RingHero without the scroll system and need the real absolute
// value your viewer would compute.
const DIAMOND_BLOOM_BALANCING_BOOST = 5.0;

export function calculateDiamondEnvMapIntensityRaw({ scale = 100, power = 100, gamma = 100 } = {}) {
  const safeScale = typeof scale === "number" && isFinite(scale) ? scale : 100;
  const safePower = typeof power === "number" && isFinite(power) ? power : 100;
  const safeGamma = typeof gamma === "number" && isFinite(gamma) ? gamma : 100;

  const s = Math.max(0.001, (safeScale / 100) * (safePower / 100));
  const g = Math.max(0.01, safeGamma / 100);
  const exposureVal = Math.pow(s, 1 / g);
  return isNaN(exposureVal) ? 5.0 : exposureVal * DIAMOND_BLOOM_BALANCING_BOOST;
}

export function computeGemHdrFactor(config) {
  const raw = calculateDiamondEnvMapIntensityRaw(config);
  return raw / DIAMOND_BLOOM_BALANCING_BOOST;
}

// Shared rotation helper — same deg -> rad conversion used for both
// metal's material.envMapRotation and the gem shader's envRotation /
// envRotationY uniforms.
export function degToRad(deg) {
  return ((typeof deg === "number" && isFinite(deg) ? deg : 0) * Math.PI) / 180;
}


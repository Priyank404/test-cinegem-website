import * as THREE from "three";

export const BASE_FOV = 35;
export const REF_ASPECT = 1.6; // anything wider than this is byte-identical to today
export const PORTRAIT_FOV = 40;

export function fitFov(baseFov, aspect, ref = REF_ASPECT) {
  if (aspect >= ref) return baseFov; // desktop: unchanged
  const t = Math.tan(THREE.MathUtils.degToRad(baseFov) / 2) * (ref / aspect);
  return THREE.MathUtils.radToDeg(2 * Math.atan(t)); // keep horizontal span constant
}

// aspect = canvas width / height. Hysteresis stops flip-flopping near 1.0.
export function getProfile(w, h, prev = null) {
  const a = w / h;
  const edge = prev === "landscape" ? 0.96 : 1.04;
  return a >= edge ? "landscape" : "portrait";
}

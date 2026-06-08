/**
 * Merges class names, filtering falsy values.
 * Lightweight alternative to clsx / cn.
 * @param {...(string|boolean|null|undefined)} classes
 * @returns {string}
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

/**
 * Linear interpolation.
 * @param {number} a
 * @param {number} b
 * @param {number} t  - interpolation factor [0..1]
 */
export function lerp(a, b, t) {
  return a + (b - a) * t
}

/**
 * Clamps a value between min and max.
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/**
 * Maps a value from one range to another.
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin
}

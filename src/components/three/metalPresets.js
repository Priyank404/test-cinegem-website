/**
 * metalPresets.js
 * -------------------------------------------------------------------------
 * Pure-data color and physical presets for jewelry metals (Yellow Gold,
 * White Gold, Rose Gold, Platinum).
 * Decoupled from Three.js so components can access metal configurations
 * without pulling the Three.js library into the entry bundle.
 * -------------------------------------------------------------------------
 */

export const metalPresets = {
  yellowGold: {
    key: "yellow_gold",
    label: "Yellow Gold",
    color: 0xfcd797,
    metalness: 1.0,
    roughness: 0.08,
    minRoughness: 0.055,
    envScale: 1,
    clearcoat: 0.28,
    clearcoatRoughness: 0.16,
    specularIntensity: 1.0,
    specularColor: 0xffffff,
  },
  whiteGold: {
    key: "white_gold",
    label: "White Gold",
    color: 0xe8e8e8,
    metalness: 1.0,
    roughness: 0.07,
    minRoughness: 0.05,
    envScale: 1,
    clearcoat: 0.25,
    clearcoatRoughness: 0.14,
    specularIntensity: 1.0,
    specularColor: 0xffffff,
  },
  roseGold: {
    key: "rose_gold",
    label: "Rose Gold",
    color: 0xe8b4a0,
    metalness: 1.0,
    roughness: 0.08,
    minRoughness: 0.055,
    envScale: 1,
    clearcoat: 0.28,
    clearcoatRoughness: 0.16,
    specularIntensity: 1.0,
    specularColor: 0xffffff,
  },
  platinum: {
    key: "platinum",
    label: "Platinum",
    color: 0xd8d8d8,
    metalness: 1.0,
    roughness: 0.06,
    minRoughness: 0.045,
    envScale: 1.05,
    clearcoat: 0.22,
    clearcoatRoughness: 0.12,
    specularIntensity: 1.0,
    specularColor: 0xffffff,
  },
};

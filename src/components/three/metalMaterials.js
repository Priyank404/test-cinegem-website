/**
 * metalMaterials.js
 * -------------------------------------------------------------------------
 * Ported from Frontend/src/metals/materials/physicalMetal.js and
 * Frontend/src/metals/presets/*.js
 *
 * Kept completely separate from gemMaterials.js on purpose: metal gets
 * its own material instance and its own envMap, independent of whatever
 * the gem is doing. This is the fix for the "metal HDR bleeding into gem
 * and vice versa" issue — each builder only ever touches its own object.
 * -------------------------------------------------------------------------
 */

import * as THREE from "three";

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

/**
 * Builds a MeshPhysicalMaterial for metal — 1:1 port of
 * Frontend/src/metals/materials/physicalMetal.js.
 *
 * envMap here is the METAL's own environment texture, never shared
 * with the gem material.
 */
export function buildMetalMaterial(preset, envMap, roughnessOverride = null, globalEnvIntensity = 6.0) {
  const roughness = roughnessOverride ?? preset.roughness ?? 0.08;
  const minRoughness = preset.minRoughness ?? 0.045;

  return new THREE.MeshPhysicalMaterial({
    name: preset.label || preset.name,
    color: new THREE.Color(preset.color),
    metalness: preset.metalness ?? 1.0,
    roughness: Math.max(roughness, minRoughness),
    envMap,
    envMapIntensity: globalEnvIntensity * (preset.envScale ?? 1.0),
    clearcoat: preset.clearcoat ?? 0.25,
    clearcoatRoughness: preset.clearcoatRoughness ?? 0.14,
    specularIntensity: preset.specularIntensity ?? 1.0,
    specularColor: new THREE.Color(preset.specularColor ?? 0xffffff),
    side: THREE.FrontSide,
  });
}

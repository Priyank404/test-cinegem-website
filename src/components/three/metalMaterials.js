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
import { metalPresets } from "./metalPresets";

export { metalPresets };

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

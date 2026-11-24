// src/components/three/baked/bakedGemMaterialBridge.js
// ---------------------------------------------------------------------------
// Non-destructive adapter that decides whether a gem mesh receives:
//   1. The original buildGemMaterial() + BVH (exact path), OR
//   2. The new RoughRefractionMaterialBaked (baked lookup path)
// Completely leaves existing files untouched!
// ---------------------------------------------------------------------------
import * as THREE from "three";
import { buildGemMaterial, attachBvhToGemMaterial } from "../gemMaterials.js";
import {
  resolveBakeProfile,
  markBakeFailed,
  BAKE_CONFIG,
} from "./bakedGemConfig.js";
import { analyzeStones } from "./gemIslands.js";
import { getOrBuildBakeAtlas } from "./gemBakeAtlas.js";
import { RoughRefractionMaterialBaked } from "./RoughRefractionMaterialBaked.js";

export function getMeshGemMaterial({
  mesh,
  preset,
  envMapBase,
  envMapSpot = null,
  deviceTier = { tier: "high" },
  pmremEnv = null,
}) {
  const profile = resolveBakeProfile(deviceTier);

  // 1. If profile says exact for everything, use untouched original path
  if (profile.small === "exact" && profile.big === "exact") {
    const mat = buildGemMaterial(
      preset,
      envMapBase,
      envMapSpot,
      deviceTier.tier,
      pmremEnv
    );
    if (mat && mat.isRoughRefractionMaterial) {
      try {
        attachBvhToGemMaterial(mesh, mat);
      } catch (err) {
        console.warn("[gemBake] BVH attach fallback:", err);
      }
    }
    return mat;
  }

  // 2. Classify stone as "small" or "big"
  const name = (mesh.name || "").toLowerCase().trim();
  let role = BAKE_CONFIG.roleByName[name];
  if (!role) {
    const pos = mesh.geometry?.attributes?.position?.array;
    const idx = mesh.geometry?.index?.array;
    if (pos) {
      try {
        const info = analyzeStones(pos, idx);
        role = info.islandCount >= BAKE_CONFIG.smallMeshMinStones ? "small" : "big";
      } catch {
        role = "small";
      }
    } else {
      role = "small";
    }
  }

  const mode = role === "small" ? profile.small : profile.big;

  // 3. Exact path for this specific stone
  if (mode === "exact" || !mesh.geometry) {
    const mat = buildGemMaterial(
      preset,
      envMapBase,
      envMapSpot,
      deviceTier.tier,
      pmremEnv
    );
    if (mat && mat.isRoughRefractionMaterial) {
      try {
        attachBvhToGemMaterial(mesh, mat);
      } catch (err) {
        console.warn("[gemBake] BVH attach fallback:", err);
      }
    }
    return mat;
  }

  // 4. Baked path
  try {
    const faceSize =
      role === "small"
        ? (profile.faceSmall || BAKE_CONFIG.faceSizeSmall.mobile)
        : (profile.faceBig || BAKE_CONFIG.faceSizeBig.mobile);

    const atlasData = getOrBuildBakeAtlas(mesh.geometry, {
      faceSize,
      ior: preset.ior ?? 2.417,
      bounces: 3,
    });

    const bakedMat = new RoughRefractionMaterialBaked({
      envMapBase,
      envMapSpot,
      bakedAtlas: atlasData ? atlasData.atlasTexture : null,
      atlasCols: atlasData ? atlasData.cols : 1,
      atlasRows: atlasData ? atlasData.rows : 1,
      ior: preset.ior ?? 2.417,
      aberrationStrength: preset.aberrationStrength ?? 0.006,
      color: new THREE.Color(preset.transmissionColor ?? preset.color ?? "#ffffff"),
      fresnel: preset.fresnel ?? 0.1,
      roughness: preset.roughness ?? 0.0,
      isMatte: preset.materialType === "matte" ? 1.0 : 0.0,
    });

    return bakedMat;
  } catch (err) {
    console.warn("[gemBake] Failed to create baked material, reverting to original:", err);
    markBakeFailed(err);
    const fallbackMat = buildGemMaterial(
      preset,
      envMapBase,
      envMapSpot,
      deviceTier.tier,
      pmremEnv
    );
    if (fallbackMat && fallbackMat.isRoughRefractionMaterial) {
      try {
        attachBvhToGemMaterial(mesh, fallbackMat);
      } catch { /* ignore */ }
    }
    return fallbackMat;
  }
}

/**
 * gemMaterials.js
 * -------------------------------------------------------------------------
 * Ported from Frontend/src/gems/materials/{matteGem.js, RoughRefractionMaterialVanilla.js}
 * and Frontend/src/gems/presets/diamond.js.
 *
 * Two gem material strategies, matching your viewer's registry pattern:
 *
 *   - "matte"      → cheap MeshPhysicalMaterial, no BVH, no raytracing.
 *                    Good enough for a hero-scale gem that's mostly seen
 *                    from a few meters and moving.
 *
 *   - "refraction" → full BVH-raytraced internal reflection/refraction
 *                    (RoughRefractionMaterial). This is the real thing
 *                    your product viewer uses. It needs three-mesh-bvh
 *                    and a BVH built from the gem's own geometry.
 *
 * You choose per-gem via preset.materialType, exactly like your viewer does.
 * -------------------------------------------------------------------------
 */

import * as THREE from "three";
import {
  MeshBVHUniformStruct,
  shaderStructs,
  shaderIntersectFunction,
  MeshBVH,
  SAH,
} from "three-mesh-bvh";
import {
  RoughRefractionMaterialMobile,
  buildGemProceduralEnv,
} from "./RoughRefractionMaterialMobile.js";

export { RoughRefractionMaterialMobile, buildGemProceduralEnv };

// ---------------------------------------------------------------------------
// Diamond presets — ported from Frontend/src/gems/presets/diamond.js
// ---------------------------------------------------------------------------
export const diamondPreset = {
  key: "diamond",
  label: "Diamond",
  materialType: "refraction",
  transmissionColor: "#ffffff",
  color: "#ffffff",
  reflectionColor: "#ffffff",
  ior: 2.72,
  fresnel: 0.0,
  bounces: 3,
  smooth: false,
  roughness: 0.04,
  spread: 0.01,
  aberrationStrength: 0.02,
  saturation: 1.0,
  resolution: 256,
  swatchColor: "#e8f4ff",
};

export const darkDiamondPreset = {
  key: "darkDiamond",
  label: "Dark Luxury Diamond (Noir)",
  materialType: "refraction",
  transmissionColor: "#20242e",
  color: "#161820",
  reflectionColor: "#ffffff",
  ior: 2.417,
  fresnel: 0.15,
  bounces: 5,
  smooth: false,
  roughness: 0.0,
  spread: 0.01,
  aberrationStrength: 0.004,
  saturation: 0.8,
  resolution: 256,
  swatchColor: "#20242e",
};

// ---------------------------------------------------------------------------
// Cheap physical diamond material (fallback for low-tier devices and mobile)
// Matte Diamond:
// Translucent dark crystal with volumetric absorption, crisp flat-shaded
// facet definition, razor-sharp studio reflections at IOR = 1.5,
// running blazing fast on low-tier hardware without BVH raymarching.
// ---------------------------------------------------------------------------
export function buildMatteGemMaterial(preset, envMap) {
  const safeEnvMap =
    envMap && envMap.isTexture
      ? envMap
      : null;

  const mat = new THREE.MeshPhysicalMaterial({
    name: "BlackMatteDiamond",
    // 1. Deep luxury smoky noir crystal color (Matte aesthetic)
    color: new THREE.Color(preset.color ?? 0x181a20),
    emissive: new THREE.Color(preset.emissive ?? 0x020204),
    emissiveIntensity: preset.emissiveIntensity ?? 0.05,

    // 2. Pure dielectric gemstone (no metalness)
    metalness: preset.metalness ?? 0.0,

    // 3. Minor satin roughness for diamond facet micro-luster
    roughness: preset.roughness ?? 0.09,

    // 4. Optical refractive index at IOR = 1.5 strictly for matte diamond (normal diamond stays 2.417)
    ior: preset.ior ?? 1.5,
    specularIntensity: preset.specularIntensity ?? 0.95,
    specularColor: new THREE.Color(preset.specularColor ?? 0xffffff),

    // 5. Satin clearcoat for diamond facet sheen
    clearcoat: preset.clearcoat ?? 0.25,
    clearcoatRoughness: preset.clearcoatRoughness ?? 0.09,

    // 6. True physical optical transparency
    transparent: true,
    opacity: preset.opacity ?? 1.0,
    depthWrite: true,

    // 7. Physical transmission & internal absorption (Beer-Lambert volume depth)
    // Thinner halo stones sparkle transparently, thick center stone has deep noir depth
    transmission: preset.transmission ?? 0.70,
    thickness: preset.thickness ?? 1.8,
    attenuationColor: new THREE.Color(preset.attenuationColor ?? 0x0a0c12),
    attenuationDistance: preset.attenuationDistance ?? 1.2,

    // 8. Smooth facet shading (no artificial wireframe seams)
    flatShading: preset.flatShading ?? false,

    // 9. Environment map from fallback HDR (env_metal_029_1798f1cf07.hdr)
    envMap: safeEnvMap,
    envMapIntensity: preset.envMapIntensity ?? 1.0,

    side: THREE.FrontSide,
  });

  mat.isMatteGemMaterial = true;
  return mat;
}

// ---------------------------------------------------------------------------
// Shared Octane Environment GLSL functions
// (Used both in RoughRefractionMaterial and live preview renderer)
// ---------------------------------------------------------------------------
export const OCTANE_ENV_GLSL = /* glsl */ `
#define PI 3.141592653589793

// Octane Color Key pass-through stub (inspectors parameters unknown)
vec3 colorKeyBase(vec3 c) {
  return c;
}

// Equirectangular spherical direction lookup (same convention as Three.js)
vec2 equirectUv(vec3 d) {
  return vec2(atan(d.z, d.x) / (2.0 * PI) + 0.5, asin(clamp(d.y, -1.0, 1.0)) / PI + 0.5);
}

// Octane "2D transformation": translate, rotate about center, scale. Wrap handled by RepeatWrapping.
// Default (scaleInvert == 0): p * sc (scale < 1 zooms in, matching Octane / Blender mapping)
vec2 octaneUv(vec2 uv, float rot, vec2 scale, vec2 trans, float scaleInvert) {
  vec2 p = uv - 0.5 - trans;
  float c = cos(rot), s = sin(rot);
  p = vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
  vec2 sc = max(abs(scale), vec2(1e-4));
  p = (scaleInvert > 0.5) ? p / sc : p * sc;
  return p + 0.5;
}

// Octane luminance shaping: raw texel -> gamma -> power
float shapeTexel(float v, float power, float gamma) {
  float e = (gammaMode < 0.5) ? gamma : 1.0 / max(gamma, 0.01);
  return pow(max(v, 1e-8), e) * power;
}
`;

// ---------------------------------------------------------------------------
// Full BVH refraction shader — ported from
// gems/materials/RoughRefractionMaterialVanilla.js with Octane dual-EXR
// additive environment architecture for diamond sparkle.
// ---------------------------------------------------------------------------
export class RoughRefractionMaterial extends THREE.ShaderMaterial {
  constructor(parameters = {}) {
    const uniforms = {
      // Octane Dual EXR Environment maps (sampler2D raw equirectangular)
      envMapBase: { value: null },
      envMapSpot: { value: null },
      hasSpotMap: { value: 0.0 },

      // Global Modes
      gammaMode: { value: 0.0 }, // 0 = Octane pow(x, g), 1 = Legacy pow(x, 1/g)
      debugView: { value: 0.0 }, // 0 = Base+Spot, 1 = Base only, 2 = Spot only

      // Base EXR slot parameters (Octane 2D transformation & exposure)
      basePower: { value: 1.0 },
      baseGamma: { value: 1.2 },
      baseRot: { value: 0.0 }, // radians
      baseScale: { value: new THREE.Vector2(1.0, 1.0) },
      baseTrans: { value: new THREE.Vector2(0.0, 0.0) },
      baseScaleInvert: { value: 0.0 },
      baseLod: { value: 0.5 },
      baseMono: { value: 1.0 },
      baseSaturation: { value: 0.0 },

      // Spotlight EXR slot parameters (Octane 2D transformation & exposure)
      spotPower: { value: 4.0 },
      spotGamma: { value: 1.8 },
      spotRot: { value: 0.0 }, // radians
      spotScale: { value: new THREE.Vector2(1.0, 1.0) },
      spotTrans: { value: new THREE.Vector2(0.0, 0.0) },
      spotScaleInvert: { value: 0.0 },
      spotLod: { value: 0.0 },
      spotMono: { value: 1.0 },

      // Legacy fallback aliases so older code won't crash
      envMap: { value: null },
      envMapIntensity: { value: 1.0 },

      bounces: { value: 5 },
      ior: { value: 2.4 },
      aberrationStrength: { value: 0.006 },
      fresnel: { value: 0 },
      roughness: { value: 0 },
      bvh: { value: new MeshBVHUniformStruct() },
      color: { value: new THREE.Color("white") },
      opacity: { value: 1.0 },
      resolution: { value: new THREE.Vector2(1024, 1024) },
      isMatte: { value: parameters.isMatte ? 1.0 : 0.0 },
    };

    const defines = {};

    const vertexShader = `
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying vec3 vLocalPosition;
      varying mat4 vModelMatrixInverse;

      void main() {
        vLocalPosition = position;
        vModelMatrixInverse = inverse(modelMatrix);
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        vNormal = normalize(mat3(transpose(inverse(modelMatrix))) * normal);
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp isampler2D;
      precision highp usampler2D;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying vec3 vLocalPosition;
      varying mat4 vModelMatrixInverse;

      uniform sampler2D envMapBase;
      uniform sampler2D envMapSpot;
      uniform float hasSpotMap;

      uniform float gammaMode;
      uniform float debugView;
      uniform float isMatte;

      uniform float basePower;
      uniform float baseGamma;
      uniform float baseRot;
      uniform vec2 baseScale;
      uniform vec2 baseTrans;
      uniform float baseScaleInvert;
      uniform float baseLod;
      uniform float baseMono;
      uniform float baseSaturation;

      uniform float spotPower;
      uniform float spotGamma;
      uniform float spotRot;
      uniform vec2 spotScale;
      uniform vec2 spotTrans;
      uniform float spotScaleInvert;
      uniform float spotLod;
      uniform float spotMono;

      uniform float bounces;
      ${shaderStructs}
      ${shaderIntersectFunction}
      uniform BVH bvh;
      uniform float ior;
      uniform vec2 resolution;
      uniform float fresnel;
      uniform float roughness;
      uniform float envMapIntensity;
      uniform mat4 modelMatrix;
      uniform float aberrationStrength;
      uniform vec3 color;
      uniform float opacity;

      ${OCTANE_ENV_GLSL}

      float fresnelFunc(vec3 viewDirection, vec3 worldNormal) {
        return pow(clamp(1.0 + dot(viewDirection, worldNormal), 0.0, 1.0), 10.0);
      }

      vec3 totalInternalReflection(vec3 ro, vec3 rd, vec3 normal, float iorVal, mat4 modelMatrixInverse) {
        vec3 rayOrigin = ro;
        vec3 rayDirection = rd;
        vec3 refracted = refract(rayDirection, normal, 1.0 / iorVal);
        rayDirection = (dot(refracted, refracted) > 0.0) ? refracted : reflect(rayDirection, normal);
        rayOrigin = vWorldPosition + rayDirection * 0.001;
        rayOrigin = (modelMatrixInverse * vec4(rayOrigin, 1.0)).xyz;
        rayDirection = normalize((modelMatrixInverse * vec4(rayDirection, 0.0)).xyz);
        #ifndef MAX_BOUNCES
        #define MAX_BOUNCES 16
        #endif
        for (int i = 0; i < MAX_BOUNCES; i++) {
          if (float(i) >= bounces) break;
          uvec4 faceIndices = uvec4(0u);
          vec3 faceNormal = vec3(0.0, 0.0, 1.0);
          vec3 barycoord = vec3(0.0);
          float side = 1.0, dist = 0.0;
          bvhIntersectFirstHit(bvh, rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist);
          vec3 hitPos = rayOrigin + rayDirection * max(dist - 0.001, 0.0);
          vec3 tempDir = refract(rayDirection, faceNormal, iorVal);
          if (length(tempDir) != 0.0) { rayDirection = tempDir; break; }
          rayDirection = reflect(rayDirection, faceNormal);
          rayOrigin = hitPos + rayDirection * 0.01;
        }
        return normalize((modelMatrix * vec4(rayDirection, 0.0)).xyz);
      }

      // Clean sample of Octane Base EXR environment without artificial texture blurring
      vec3 sampleBaseKernel(vec3 d, float lod) {
        vec2 uv = octaneUv(equirectUv(d), baseRot, baseScale, baseTrans, baseScaleInvert);
        vec4 s = textureLod(envMapBase, uv, lod);
        vec3 col = (baseMono > 0.5) ? vec3(s.r) : s.rgb;
        if (baseSaturation < 0.999) {
          float gray = dot(col, vec3(0.2126, 0.7152, 0.0722));
          col = mix(vec3(gray), col, clamp(baseSaturation, 0.0, 2.0));
        }
        return col;
      }

      vec3 baseRaw(vec3 d) {
        return sampleBaseKernel(d, baseLod);
      }

      vec3 baseRawLod(vec3 d, float lod) {
        return sampleBaseKernel(d, lod);
      }

      // Smooth fire: 7 taps from the "red" ray to the "blue" ray, Bernstein spectral weights.
      // Preserves pure white when sampling uniform or neutral regions (no hard rainbow bands).
      vec3 baseSpectral(vec3 dirR, vec3 dirB) {
        const int N = 7;
        vec3 acc = vec3(0.0), accW = vec3(0.0);
        for (int i = 0; i < N; i++) {
          float t = (float(i) + 0.5) / float(N);
          vec3 d = normalize(mix(dirR, dirB, t));
          vec3 raw = baseRaw(d);
          vec3 v = vec3(
            shapeTexel(raw.r, basePower, baseGamma),
            shapeTexel(raw.g, basePower, baseGamma),
            shapeTexel(raw.b, basePower, baseGamma)
          ); // gamma BEFORE averaging
          vec3 w = vec3((1.0 - t) * (1.0 - t), 2.0 * t * (1.0 - t), t * t); // R, G, B bands
          acc += w * v;
          accW += w;
        }
        return acc / accW; // each channel normalised by its own weight sum -> white stays white
      }

      // Sample spotlight pinpoints with a tight optical disk (~2.2 degrees)
      // and clamp to safe HDR radiance [0, 30.0] so it cleanly punches above
      // the bloom threshold (0.85-0.9) into soft optical glare without overflowing float16.
      float sampleSpotAchro(vec3 dir) {
        if (hasSpotMap < 0.5) return 0.0;
        vec2 uvS = octaneUv(equirectUv(dir), spotRot, spotScale, spotTrans, spotScaleInvert);
#ifdef FAST_SPOT
        float m = textureLod(envMapSpot, uvS, spotLod).r;
#else
        vec2 d = vec2(0.006, 0.012);
        float m = textureLod(envMapSpot, uvS, spotLod).r;
        m = max(m, textureLod(envMapSpot, uvS + vec2( d.x,  0.0), spotLod).r);
        m = max(m, textureLod(envMapSpot, uvS - vec2( d.x,  0.0), spotLod).r);
        m = max(m, textureLod(envMapSpot, uvS + vec2( 0.0,  d.y), spotLod).r);
        m = max(m, textureLod(envMapSpot, uvS - vec2( 0.0,  d.y), spotLod).r);
        m = max(m, textureLod(envMapSpot, uvS + vec2( d.x * 0.707,  d.y * 0.707), spotLod).r);
        m = max(m, textureLod(envMapSpot, uvS + vec2(-d.x * 0.707,  d.y * 0.707), spotLod).r);
        m = max(m, textureLod(envMapSpot, uvS + vec2( d.x * 0.707, -d.y * 0.707), spotLod).r);
        m = max(m, textureLod(envMapSpot, uvS - vec2( d.x * 0.707, -d.y * 0.707), spotLod).r);
#endif
        float shaped = shapeTexel(m, spotPower, spotGamma);
        return min(shaped, 30.0);
      }

      // Sample combined Octane environment (Base + Spotlight) without dispersion
      vec3 sampleOctaneEnvironment(vec3 dir) {
        // 1. Base Environment
        vec3 rawB = baseRaw(dir);
        vec3 baseCol = vec3(
          shapeTexel(rawB.r, basePower, baseGamma),
          shapeTexel(rawB.g, basePower, baseGamma),
          shapeTexel(rawB.b, basePower, baseGamma)
        );

        // 2. Spotlight Environment (crisp sparkle pinpoints, white only)
        vec3 spotCol = vec3(sampleSpotAchro(dir));

        // Debug View filter: 0 = Base+Spot, 1 = Base only, 2 = Spot only
        vec3 bFiltered = (debugView > 1.5) ? vec3(0.0) : baseCol;
        vec3 sFiltered = (debugView > 0.5 && debugView < 1.5) ? vec3(0.0) : spotCol;

        // Octane "Add texture" node: colorKey(Base) + Spot
        return colorKeyBase(bFiltered) + sFiltered;
      }

      // Deterministic 5-tap smooth optical blur cone around the internal ray (zero noise)
      // Produces the smooth internal caustic diffusion seen in Matte & Frosted diamonds
      vec3 sampleSmoothInternal(vec3 dir, float rough) {
        if (rough <= 0.015) {
          return sampleOctaneEnvironment(dir);
        }

        vec3 up = abs(dir.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
        vec3 t = normalize(cross(dir, up));
        vec3 b = cross(dir, t);

        float spread = clamp(rough * 0.09, 0.0, 0.12);

        vec3 c0 = sampleOctaneEnvironment(dir) * 0.36;
        vec3 c1 = sampleOctaneEnvironment(normalize(dir + t * spread)) * 0.16;
        vec3 c2 = sampleOctaneEnvironment(normalize(dir - t * spread)) * 0.16;
        vec3 c3 = sampleOctaneEnvironment(normalize(dir + b * spread)) * 0.16;
        vec3 c4 = sampleOctaneEnvironment(normalize(dir - b * spread)) * 0.16;

        return c0 + c1 + c2 + c3 + c4;
      }

      // Sample combined Octane environment with explicit mip LOD
      vec3 sampleOctaneEnvironmentLod(vec3 dir, float lod) {
        vec3 rawB = baseRawLod(dir, lod);
        vec3 baseCol = vec3(
          shapeTexel(rawB.r, basePower, baseGamma),
          shapeTexel(rawB.g, basePower, baseGamma),
          shapeTexel(rawB.b, basePower, baseGamma)
        );
        vec3 spotCol = vec3(sampleSpotAchro(dir));
        vec3 bFiltered = (debugView > 1.5) ? vec3(0.0) : baseCol;
        vec3 sFiltered = (debugView > 0.5 && debugView < 1.5) ? vec3(0.0) : spotCol;
        return colorKeyBase(bFiltered) + sFiltered;
      }

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 rayOrigin = cameraPosition;
        vec3 viewDirection = normalize(vWorldPosition - cameraPosition);
        vec3 V = -viewDirection;

        vec4 diffuseColor = vec4(color, opacity);

        if (isMatte > 0.5) {
          // Matte Diamond Aesthetic:
          // Dark luxury diamond with optical transparency (IOR 1.5),
          // smoky crystal absorption, satin facet luster, and HDR environment reflections.
          vec3 smoothNormal = normalize(vNormal);
          float NdotV = clamp(dot(smoothNormal, V), 0.0, 1.0);

          float matteIor = ior > 1.0 ? ior : 1.5;
          float f0 = pow((matteIor - 1.0) / (matteIor + 1.0), 2.0);
          float fresnelTerm = f0 + (1.0 - f0) * pow(1.0 - NdotV, 5.0);

          // 1. Optical Refraction through the diamond:
          vec3 refractDir = refract(viewDirection, smoothNormal, 1.0 / matteIor);
          refractDir = (dot(refractDir, refractDir) > 0.0) ? refractDir : reflect(viewDirection, smoothNormal);
          vec3 envRefract = sampleOctaneEnvironment(refractDir);

          // Dark smoky crystal absorption / body tint:
          vec3 darkSmokyTint = color;
          vec3 transmittedLight = envRefract * darkSmokyTint * envMapIntensity;

          // 2. Surface Reflection off facets:
          vec3 reflectDir = reflect(viewDirection, smoothNormal);
          vec3 envReflect = sampleOctaneEnvironment(reflectDir);

          float reflScale = fresnel > 0.0 ? fresnel * 4.0 : 0.85;
          vec3 reflectedLight = envReflect * envMapIntensity * (fresnelTerm * reflScale + 0.05);

          // Silky satin facet luster on matte diamond
          float satinSheen = (pow(1.0 - NdotV, 2.5) * 0.65 + 0.35) * roughness;
          reflectedLight += envReflect * (satinSheen * f0 * 3.0 * envMapIntensity);

          // 3. Composite transmitted light + facet reflection
          vec3 finalDiamond = mix(transmittedLight, reflectedLight, fresnelTerm) + reflectedLight * 0.15;

          // 4. Optical transparency
          float alpha = mix(0.75, 0.96, fresnelTerm) * opacity;

          gl_FragColor = vec4(finalDiamond, alpha);
          return;
        }

        #ifdef CHROMATIC_ABERRATIONS
          // In rough/frosted diamonds, microfacets mix spectral wavelengths back into white light
          float effectiveChroma = aberrationStrength * (1.0 - smoothstep(0.04, 0.30, roughness));

          vec3 rayDirectionG = totalInternalReflection(rayOrigin, viewDirection, normal, max(ior, 1.0), vModelMatrixInverse);
          #ifdef FAST_CHROMA
            vec3 rayDirectionR = normalize(rayDirectionG + vec3(effectiveChroma * 0.5));
            vec3 rayDirectionB = normalize(rayDirectionG - vec3(effectiveChroma * 0.5));
          #else
            vec3 rayDirectionR = totalInternalReflection(rayOrigin, viewDirection, normal, max(ior * (1.0 - effectiveChroma), 1.0), vModelMatrixInverse);
            vec3 rayDirectionB = totalInternalReflection(rayOrigin, viewDirection, normal, max(ior * (1.0 + effectiveChroma), 1.0), vModelMatrixInverse);
          #endif

          // Spectral base fire (7 taps, Bernstein weights, preserves white, no hard rainbow bands)
          vec3 baseCol = baseSpectral(rayDirectionR, rayDirectionB);

          // Spot is achromatic by design: sample multi-tap cone along rayDirectionG and broadcast (white only)
          vec3 spotCol = vec3(sampleSpotAchro(rayDirectionG));

          // Debug View filter: 0 = Base+Spot, 1 = Base only, 2 = Spot only
          vec3 bFiltered = (debugView > 1.5) ? vec3(0.0) : baseCol;
          vec3 sFiltered = (debugView > 0.5 && debugView < 1.5) ? vec3(0.0) : spotCol;

          // Octane "Add texture" node: colorKey(Base) + Spot
          vec3 envCol = colorKeyBase(bFiltered) + sFiltered;
          diffuseColor.rgb *= envCol * envMapIntensity;
        #else
          vec3 rayDirection = totalInternalReflection(rayOrigin, viewDirection, normal, max(ior, 1.0), vModelMatrixInverse);
          diffuseColor.rgb *= sampleSmoothInternal(rayDirection, roughness) * envMapIntensity;
        #endif

        // Frosted / Matte translucent crystal body (matching real-life frosted diamonds):
        // Replicates the 5 reference stages:
        // POLISHED (0.00) -> SATIN (0.08) -> MATTE (0.30) -> FROSTED (0.60) -> RAW (0.90)
        vec3 refractDir = refract(viewDirection, normal, 1.0 / max(ior, 1.0));
        vec3 envDirect = sampleOctaneEnvironment(refractDir);

        // Facet geometry shading:
        // Each facet plane reflects/transmits light according to its orientation
        float NdotV = clamp(dot(normal, V), 0.0, 1.0);
        float facetBodyShading = 0.52 + 0.48 * NdotV;
        
        // Translucent frosted milky-white crystal core
        vec3 frostedCore = (envDirect * 0.70 + vec3(0.92, 0.94, 0.98) * 0.30) * color * (facetBodyShading * envMapIntensity);

        // 1. Blend sharp caustics into frosted crystal body as roughness increases
        float frostWeight = smoothstep(0.02, 0.55, roughness);
        diffuseColor.rgb = mix(diffuseColor.rgb, frostedCore, frostWeight * 0.88);

        // 2. Soften deep shadow cavities: in Matte and Frosted stones, dark cavities become luminous misty gray
        float shadowFill = smoothstep(0.01, 0.40, roughness) * 0.42;
        diffuseColor.rgb = max(diffuseColor.rgb, frostedCore * shadowFill);

        // Dielectric Fresnel F0 for diamond (IOR ~ 2.417 => F0 ~ 0.172)
        float f0 = pow((ior - 1.0) / (ior + 1.0), 2.0);
        float nFresnel = f0 + (1.0 - f0) * pow(1.0 - NdotV, 5.0);

        // Surface reflection of the environment
        vec3 surfReflectDir = reflect(viewDirection, normal);
        vec3 surfaceEnv = sampleOctaneEnvironment(surfReflectDir);

        // Mirror reflection smoothly dissolves as roughness increases (from 0.00 to 0.22)
        float mirrorFade = 1.0 - smoothstep(0.01, 0.22, roughness);
        float specMult = (fresnel >= 0.0) ? fresnel : 0.2;
        vec3 mirrorReflect = surfaceEnv * (nFresnel * specMult * mirrorFade);

        // Smooth Adamantine Satin Facet Sheen (Cook-Torrance GGX luster):
        // In SATIN (0.08), MATTE (0.30), FROSTED (0.60), this gives the facet faces their silky 3D definition!
        float satinSheenWeight = smoothstep(0.01, 0.45, roughness);
        float satinRim = pow(1.0 - NdotV, 2.0);
        float satinLobe = (satinRim * 0.65 + 0.35) * satinSheenWeight;
        vec3 satinFacetSheen = surfaceEnv * (satinLobe * f0 * 3.8 * envMapIntensity);

        vec3 surfaceReflect = mirrorReflect + satinFacetSheen;

        vec3 finalRgb = diffuseColor.rgb + surfaceReflect;

        gl_FragColor = vec4(finalRgb, diffuseColor.a);
      }
    `;

    super({ uniforms, defines, vertexShader, fragmentShader, transparent: true, depthWrite: true, toneMapped: false });
    this.isRoughRefractionMaterial = true;
    this.isOctaneDualExr = true;
    this.setValues(parameters);

    // Initialise envMapBase fallback if only envMap was passed
    if (parameters.envMap && !parameters.envMapBase) {
      this.envMapBase = parameters.envMap;
    }
    if (parameters.envMapSpot) {
      this.envMapSpot = parameters.envMapSpot;
    }
    if (parameters.fastSpot || parameters.tier === "mobile") {
      this.defines.FAST_SPOT = "";
    }

    this.updateDefines(this.aberrationStrength ?? 0.006);
  }

  updateDefines(aberrationStrength = 0.006, fastChroma = true) {
    let changed = false;
    const hasChroma = aberrationStrength > 0.0001;
    if (hasChroma && !("CHROMATIC_ABERRATIONS" in this.defines)) {
      this.defines.CHROMATIC_ABERRATIONS = "";
      changed = true;
    }
    if (!hasChroma && ("CHROMATIC_ABERRATIONS" in this.defines)) {
      delete this.defines.CHROMATIC_ABERRATIONS;
      changed = true;
    }
    if (fastChroma && !("FAST_CHROMA" in this.defines)) {
      this.defines.FAST_CHROMA = "";
      changed = true;
    }
    if (!fastChroma && ("FAST_CHROMA" in this.defines)) {
      delete this.defines.FAST_CHROMA;
      changed = true;
    }
    if (changed) this.needsUpdate = true;
  }

  // Base Environment Texture
  get envMapBase() { return this.uniforms?.envMapBase?.value; }
  set envMapBase(v) {
    if (!this.uniforms?.envMapBase) return;
    this.uniforms.envMapBase.value = v;
    if (this.uniforms.envMap) this.uniforms.envMap.value = v;
  }

  // Spotlight Environment Texture (Base for diamond sparkle in Octane)
  get envMapSpot() { return this.uniforms?.envMapSpot?.value; }
  set envMapSpot(v) {
    if (!this.uniforms?.envMapSpot) return;
    this.uniforms.envMapSpot.value = v;
    if (this.uniforms?.hasSpotMap) this.uniforms.hasSpotMap.value = v ? 1.0 : 0.0;
  }

  get hasSpotMap() { return this.uniforms?.hasSpotMap?.value; }
  set hasSpotMap(v) { if (this.uniforms?.hasSpotMap) this.uniforms.hasSpotMap.value = v ? 1.0 : 0.0; }

  // Matte flat preview mode
  get isMatte() { return this.uniforms?.isMatte?.value ?? 0.0; }
  set isMatte(v) { if (this.uniforms?.isMatte) this.uniforms.isMatte.value = v ? 1.0 : 0.0; }

  // Global Modes
  get gammaMode() { return this.uniforms?.gammaMode?.value; }
  set gammaMode(v) { if (this.uniforms?.gammaMode) this.uniforms.gammaMode.value = v; }
  get debugView() { return this.uniforms?.debugView?.value; }
  set debugView(v) { if (this.uniforms?.debugView) this.uniforms.debugView.value = v; }

  // Base slot parameters
  get basePower() { return this.uniforms?.basePower?.value; }
  set basePower(v) { if (this.uniforms?.basePower) this.uniforms.basePower.value = v; }
  get baseGamma() { return this.uniforms?.baseGamma?.value; }
  set baseGamma(v) { if (this.uniforms?.baseGamma) this.uniforms.baseGamma.value = v; }
  get baseRot() { return this.uniforms?.baseRot?.value; }
  set baseRot(v) { if (this.uniforms?.baseRot) this.uniforms.baseRot.value = v; }
  get baseScale() { return this.uniforms?.baseScale?.value; }
  set baseScale(v) { if (this.uniforms?.baseScale) this.uniforms.baseScale.value.copy(v); }
  get baseTrans() { return this.uniforms?.baseTrans?.value; }
  set baseTrans(v) { if (this.uniforms?.baseTrans) this.uniforms.baseTrans.value.copy(v); }
  get baseScaleInvert() { return this.uniforms?.baseScaleInvert?.value; }
  set baseScaleInvert(v) { if (this.uniforms?.baseScaleInvert) this.uniforms.baseScaleInvert.value = v ? 1.0 : 0.0; }
  get baseLod() { return this.uniforms?.baseLod?.value; }
  set baseLod(v) { if (this.uniforms?.baseLod) this.uniforms.baseLod.value = v; }
  get baseMono() { return this.uniforms?.baseMono?.value; }
  set baseMono(v) { if (this.uniforms?.baseMono) this.uniforms.baseMono.value = v ? 1.0 : 0.0; }
  get baseSaturation() { return this.uniforms?.baseSaturation?.value; }
  set baseSaturation(v) { if (this.uniforms?.baseSaturation) this.uniforms.baseSaturation.value = v; }

  // Spotlight slot parameters
  get spotPower() { return this.uniforms?.spotPower?.value; }
  set spotPower(v) { if (this.uniforms?.spotPower) this.uniforms.spotPower.value = v; }
  get spotGamma() { return this.uniforms?.spotGamma?.value; }
  set spotGamma(v) { if (this.uniforms?.spotGamma) this.uniforms.spotGamma.value = v; }
  get spotRot() { return this.uniforms?.spotRot?.value; }
  set spotRot(v) { if (this.uniforms?.spotRot) this.uniforms.spotRot.value = v; }
  get spotScale() { return this.uniforms?.spotScale?.value; }
  set spotScale(v) { if (this.uniforms?.spotScale) this.uniforms.spotScale.value.copy(v); }
  get spotTrans() { return this.uniforms?.spotTrans?.value; }
  set spotTrans(v) { if (this.uniforms?.spotTrans) this.uniforms.spotTrans.value.copy(v); }
  get spotScaleInvert() { return this.uniforms?.spotScaleInvert?.value; }
  set spotScaleInvert(v) { if (this.uniforms?.spotScaleInvert) this.uniforms.spotScaleInvert.value = v ? 1.0 : 0.0; }
  get spotLod() { return this.uniforms?.spotLod?.value; }
  set spotLod(v) { if (this.uniforms?.spotLod) this.uniforms.spotLod.value = v; }
  get spotMono() { return this.uniforms?.spotMono?.value; }
  set spotMono(v) { if (this.uniforms?.spotMono) this.uniforms.spotMono.value = v ? 1.0 : 0.0; }

  // Legacy aliases
  get envMap() { return this.envMapBase; }
  set envMap(v) { this.envMapBase = v; }
  get baseEnvRotation() { return this.baseRot; }
  set baseEnvRotation(v) { this.baseRot = v; }
  get baseEnvPower() { return this.basePower; }
  set baseEnvPower(v) { this.basePower = v; }
  get baseEnvGamma() { return this.baseGamma; }
  set baseEnvGamma(v) { this.baseGamma = v; }
  get spotEnvRotation() { return this.spotRot; }
  set spotEnvRotation(v) { this.spotRot = v; }
  get spotEnvPower() { return this.spotPower; }
  set spotEnvPower(v) { this.spotPower = v; }
  get spotEnvGamma() { return this.spotGamma; }
  set spotEnvGamma(v) { this.spotGamma = v; }

  get bounces() { return this.uniforms?.bounces?.value; }
  set bounces(v) { if (this.uniforms?.bounces) this.uniforms.bounces.value = v; }
  get ior() { return this.uniforms?.ior?.value; }
  set ior(v) { if (this.uniforms?.ior) this.uniforms.ior.value = v; }
  get aberrationStrength() { return this.uniforms?.aberrationStrength?.value; }
  set aberrationStrength(v) {
    if (!this.uniforms?.aberrationStrength) return;
    this.uniforms.aberrationStrength.value = v;
    this.updateDefines(v);
  }
  get fresnel() { return this.uniforms?.fresnel?.value; }
  set fresnel(v) { if (this.uniforms?.fresnel) this.uniforms.fresnel.value = v; }
  get roughness() { return this.uniforms?.roughness?.value; }
  set roughness(v) { if (this.uniforms?.roughness) this.uniforms.roughness.value = v; }
  get envMapIntensity() { return this.uniforms?.envMapIntensity?.value; }
  set envMapIntensity(v) { if (this.uniforms?.envMapIntensity) this.uniforms.envMapIntensity.value = v; }
  get opacity() { return this.uniforms?.opacity?.value ?? 1.0; }
  set opacity(v) { if (this.uniforms?.opacity) this.uniforms.opacity.value = v; }
  get color() { return this.uniforms?.color?.value; }
  set color(v) {
    if (!this.uniforms?.color) return;
    if (v instanceof THREE.Color) {
      this.uniforms.color.value.copy(v);
    } else {
      this.uniforms.color.value.set(v);
    }
  }
  get bvh() { return this.uniforms?.bvh?.value; }
  set bvh(v) { if (this.uniforms?.bvh) this.uniforms.bvh.value = v; }
}

/**
 * Build the BVH for a gem mesh and wire it into the material.
 * Call this once per gem mesh, after the mesh's geometry is available.
 * Uses SAH strategy on non-indexed geometry matching 3DViewer reference engine.
 */
export function attachBvhToGemMaterial(mesh, material) {
  let bvhGeometry = mesh.geometry;
  let shouldDispose = false;
  if (mesh.geometry.index) {
    bvhGeometry = mesh.geometry.clone().toNonIndexed();
    shouldDispose = true;
  }
  const bvh = new MeshBVH(bvhGeometry, { strategy: SAH });
  material.bvh = new MeshBVHUniformStruct();
  material.bvh.updateFrom(bvh);
  if (shouldDispose) {
    bvhGeometry.dispose();
  }
}

/**
 * Convenience factory matching your registry's buildGem() shape,
 * supporting both Base and Spotlight environment maps (Octane additive logic).
 *
 * @param {object} preset - Gem preset (diamond, ruby, etc.)
 * @param {THREE.Texture} envMapBase - Base EXR environment texture
 * @param {THREE.Texture} [envMapSpot] - Spotlight EXR environment texture
 * @param {string} [tier] - Device tier: "high" | "mid" | "mobile" | "low" | "minimal"
 * @param {THREE.Texture} [pmremFallback] - Studio PMREM environment map for low-tier reflection
 */
export function buildGemMaterial(
  preset,
  envMapBase,
  envMapSpot = null,
  tier = "high",
  pmremFallback = null
) {
  const isMatte = preset.materialType === "matte";
  const safePmrem =
    pmremFallback && pmremFallback.isTexture
      ? pmremFallback
      : (envMapBase && envMapBase.isTexture ? envMapBase : null);

  if (tier === "low" || tier === "minimal" || isMatte) {
    return buildMatteGemMaterial(isMatte ? { ...preset, ior: 1.5 } : preset, safePmrem);
  }

  if (tier === "mobile") {
    if (envMapBase) {
      try {
        return new RoughRefractionMaterial({
          envMapBase,
          envMapSpot,
          envMap: envMapBase,
          ior: preset.ior ?? 2.417,
          bounces: 4,
          fresnel: preset.fresnel ?? 0,
          roughness: preset.roughness ?? 0,
          aberrationStrength: preset.aberrationStrength ?? 0.006,
          color: new THREE.Color(preset.transmissionColor ?? preset.color ?? "#ffffff"),
          isMatte: isMatte ? 1.0 : 0.0,
          fastSpot: true,
          tier: "mobile",
        });
      } catch (err) {
        console.warn("RoughRefractionMaterial on mobile failed, trying mobile fallback:", err);
      }
    }

    try {
      return new RoughRefractionMaterialMobile({
        envMap: safePmrem || envMapBase,
        ior: preset.ior ?? 2.417,
        bounces: 3,
        fresnel: 0.1,
        roughness: preset.roughness ?? 0.0,
        aberrationStrength: 0.003,
        color: new THREE.Color(preset.transmissionColor ?? preset.color ?? "#ffffff"),
        envMapIntensity: 2.0,
        isMatte: isMatte ? 1.0 : 0.0,
      });
    } catch (err) {
      console.warn("RoughRefractionMaterialMobile creation failed, using physical diamond fallback:", err);
      return buildMatteGemMaterial(preset, safePmrem);
    }
  }

  const bounces = tier === "mid" ? Math.min(preset.bounces ?? 3, 3) : (preset.bounces ?? 5);
  const aberration = tier === "mid" ? 0.003 : (preset.aberrationStrength ?? 0.006);

  try {
    return new RoughRefractionMaterial({
      envMapBase,
      envMapSpot,
      envMap: envMapBase,
      ior: preset.ior ?? 2.417,
      bounces,
      fresnel: preset.fresnel ?? 0,
      roughness: preset.roughness ?? 0,
      aberrationStrength: aberration,
      color: new THREE.Color(preset.transmissionColor ?? preset.color ?? "#ffffff"),
      isMatte: isMatte ? 1.0 : 0.0,
    });
  } catch (err) {
    console.warn("RoughRefractionMaterial creation failed, using physical diamond fallback:", err);
    return buildMatteGemMaterial(preset, safePmrem);
  }
}


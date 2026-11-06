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
} from "./RoughRefractionMaterialMobile";

export { RoughRefractionMaterialMobile, buildGemProceduralEnv };

// ---------------------------------------------------------------------------
// Diamond preset — ported verbatim from Frontend/src/gems/presets/diamond.js
// ---------------------------------------------------------------------------
export const diamondPreset = {
  key: "diamond",
  label: "Diamond",
  materialType: "refraction",
  transmissionColor: "#ffffff",
  color: "#ffffff",
  reflectionColor: "#ffffff",
  ior: 1.8,
  fresnel: 1,
  bounces: 5,
  smooth: false,
  roughness: 0.08,
  spread: 0.01,
  aberrationStrength: 0.01,
  saturation: 1.0,
  resolution: 256,
  swatchColor: "#e8f4ff",
};

// Add more gem presets here the same way (ruby, sapphire, etc.) if you
// want to swap the stone later — same shape as Frontend/src/gems/presets/*.

// ---------------------------------------------------------------------------
// Cheap physical diamond material (fallback for low-tier devices and mobile)
// High metalness + low roughness + studio HDR gives sparkling brilliant facets
// without heavy raytracing or transmission passes.
// ---------------------------------------------------------------------------
export function buildMatteGemMaterial(preset, envMap) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(preset.color || "#ffffff"),
    roughness: 0.02,
    metalness: 0.95,
    specularIntensity: 1.0,
    specularColor: new THREE.Color("#ffffff"),
    envMap: envMap || null,
    envMapIntensity: 2.5,
    transparent: false,
    emissive: new THREE.Color(0x111111),
    side: THREE.FrontSide,
  });
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
    };

    const defines = {};

    const vertexShader = `
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying mat4 vModelMatrixInverse;

      void main() {
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
      varying mat4 vModelMatrixInverse;

      uniform sampler2D envMapBase;
      uniform sampler2D envMapSpot;
      uniform float hasSpotMap;

      uniform float gammaMode;
      uniform float debugView;

      uniform float basePower;
      uniform float baseGamma;
      uniform float baseRot;
      uniform vec2 baseScale;
      uniform vec2 baseTrans;
      uniform float baseScaleInvert;
      uniform float baseLod;
      uniform float baseMono;

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

      vec3 totalInternalReflection(vec3 ro, vec3 rd, vec3 normal, float ior, mat4 modelMatrixInverse) {
        vec3 rayOrigin = ro;
        vec3 rayDirection = rd;
        vec3 refracted = refract(rayDirection, normal, 1.0 / ior);
        rayDirection = (dot(refracted, refracted) > 0.0) ? refracted : reflect(rayDirection, normal);
        rayOrigin = vWorldPosition + rayDirection * 0.001;
        rayOrigin = (modelMatrixInverse * vec4(rayOrigin, 1.0)).xyz;
        rayDirection = normalize((modelMatrixInverse * vec4(rayDirection, 0.0)).xyz);
        #ifndef MAX_BOUNCES
        #define MAX_BOUNCES 8
        #endif
        for (int i = 0; i < MAX_BOUNCES; i++) {
          if (float(i) >= bounces) break;
          uvec4 faceIndices = uvec4(0u);
          vec3 faceNormal = vec3(0.0, 0.0, 1.0);
          vec3 barycoord = vec3(0.0);
          float side = 1.0, dist = 0.0;
          bvhIntersectFirstHit(bvh, rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist);
          vec3 hitPos = rayOrigin + rayDirection * max(dist - 0.001, 0.0);
          vec3 tempDir = refract(rayDirection, faceNormal, ior);
          if (length(tempDir) != 0.0) { rayDirection = tempDir; break; }
          rayDirection = reflect(rayDirection, faceNormal);
          rayOrigin = hitPos + rayDirection * 0.01;
        }
        return normalize((modelMatrix * vec4(rayDirection, 0.0)).xyz);
      }

      // Raw base sample at direction d (mono reads .r)
      vec3 baseRaw(vec3 d) {
        vec2 uv = octaneUv(equirectUv(d), baseRot, baseScale, baseTrans, baseScaleInvert);
        vec4 s = textureLod(envMapBase, uv, baseLod);
        return (baseMono > 0.5) ? vec3(s.r) : s.rgb;
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

        // Tight circular optical disk (~2.2 degrees angular diameter)
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

        float shaped = shapeTexel(m, spotPower, spotGamma);
        // Cap to safe peak radiance so it never overflows float16 (65,504)
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

      void main() {
        vec3 normal = vNormal;
        vec3 rayOrigin = cameraPosition;
        vec3 rayDirection = normalize(vWorldPosition - cameraPosition);

        vec4 diffuseColor = vec4(color, opacity);

        #ifdef CHROMATIC_ABERRATIONS
          vec3 rayDirectionG = totalInternalReflection(rayOrigin, rayDirection, normal, max(ior, 1.0), vModelMatrixInverse);
          #ifdef FAST_CHROMA
            vec3 rayDirectionR = normalize(rayDirectionG + vec3(aberrationStrength * 0.5));
            vec3 rayDirectionB = normalize(rayDirectionG - vec3(aberrationStrength * 0.5));
          #else
            vec3 rayDirectionR = totalInternalReflection(rayOrigin, rayDirection, normal, max(ior * (1.0 - aberrationStrength), 1.0), vModelMatrixInverse);
            vec3 rayDirectionB = totalInternalReflection(rayOrigin, rayDirection, normal, max(ior * (1.0 + aberrationStrength), 1.0), vModelMatrixInverse);
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
          rayDirection = totalInternalReflection(rayOrigin, rayDirection, normal, max(ior, 1.0), vModelMatrixInverse);
          diffuseColor.rgb *= sampleOctaneEnvironment(rayDirection) * envMapIntensity;
        #endif

        vec3 viewDirection = normalize(vWorldPosition - cameraPosition);
        float nFresnel = fresnelFunc(viewDirection, normal) * fresnel;
        vec3 finalRgb = mix(diffuseColor.rgb, vec3(1.0), nFresnel);

        gl_FragColor = vec4(finalRgb, diffuseColor.a);
      }
    `;

    super({ uniforms, defines, vertexShader, fragmentShader, transparent: false, toneMapped: false });
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
  get color() { return this.uniforms?.color?.value; }
  set color(v) { if (!this.uniforms?.color) return; v instanceof THREE.Color ? this.uniforms.color.value.copy(v) : this.uniforms.color.value.set(v); }
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
  if (tier === "low" || tier === "minimal" || preset.materialType === "matte") {
    return buildMatteGemMaterial(preset, pmremFallback || envMapBase);
  }

  if (tier === "mobile") {
    if (envMapBase) {
      try {
        return new RoughRefractionMaterial({
          envMapBase,
          envMapSpot,
          envMap: envMapBase,
          ior: preset.ior ?? 2.417,
          bounces: 3,
          fresnel: preset.fresnel ?? 0,
          roughness: preset.roughness ?? 0,
          aberrationStrength: 0.003,
          color: new THREE.Color(preset.transmissionColor ?? preset.color ?? "#ffffff"),
        });
      } catch (err) {
        console.warn("RoughRefractionMaterial on mobile failed, trying mobile fallback:", err);
      }
    }

    try {
      return new RoughRefractionMaterialMobile({
        envMap: pmremFallback || envMapBase,
        ior: preset.ior ?? 2.417,
        bounces: 3,
        fresnel: 0.1,
        roughness: preset.roughness ?? 0.0,
        aberrationStrength: 0.003,
        color: new THREE.Color(preset.transmissionColor ?? preset.color ?? "#ffffff"),
        envMapIntensity: 2.0,
      });
    } catch (err) {
      console.warn("RoughRefractionMaterialMobile creation failed, using physical diamond fallback:", err);
      return buildMatteGemMaterial(preset, pmremFallback || envMapBase);
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
    });
  } catch (err) {
    console.warn("RoughRefractionMaterial creation failed, using physical diamond fallback:", err);
    return buildMatteGemMaterial(preset, pmremFallback || envMapBase);
  }
}


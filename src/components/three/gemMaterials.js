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
} from "three-mesh-bvh";

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
// Cheap matte gem material — ported from gems/materials/matteGem.js
// ---------------------------------------------------------------------------
export function buildMatteGemMaterial(preset, envMap) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(preset.color),
    roughness: preset.roughness ?? 0.1,
    metalness: preset.metalness ?? 0.0,
    iridescence: preset.iridescence ?? 0.0,
    iridescenceIOR: preset.iridescenceIOR ?? 1.3,
    envMap,
    envMapIntensity: 2.0,
    side: THREE.FrontSide,
  });
}

// ---------------------------------------------------------------------------
// Full BVH refraction shader — ported from
// gems/materials/RoughRefractionMaterialVanilla.js, trimmed of the
// scramble/LUT machinery that's specific to your product viewer (not
// relevant on a public portfolio hero — no asset protection needed here).
// ---------------------------------------------------------------------------
export class RoughRefractionMaterial extends THREE.ShaderMaterial {
  constructor(parameters = {}) {
    const uniforms = {
      envMap: { value: null },
      bounces: { value: 3 },
      ior: { value: 2.4 },
      aberrationStrength: { value: 0.01 },
      fresnel: { value: 0 },
      roughness: { value: 0 },
      envRotation: { value: 0 },
      envRotationY: { value: 0 },
      envMapIntensity: { value: 1.0 },
      bvh: { value: new MeshBVHUniformStruct() },
      color: { value: new THREE.Color("white") },
      opacity: { value: 1.0 },
      resolution: { value: new THREE.Vector2(1024, 1024) },
    };

    const defines = {
      CUBEUV_TEXEL_WIDTH: "0.0",
      CUBEUV_TEXEL_HEIGHT: "0.0",
      CUBEUV_MAX_MIP: "0.0",
    };

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
      #define ENVMAP_TYPE_CUBE_UV
      precision highp isampler2D;
      precision highp usampler2D;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying mat4 vModelMatrixInverse;

      uniform sampler2D envMap;
      uniform float bounces;
      ${shaderStructs}
      ${shaderIntersectFunction}
      uniform BVH bvh;
      uniform float ior;
      uniform vec2 resolution;
      uniform float fresnel;
      uniform float roughness;
      uniform float envRotation;
      uniform float envRotationY;
      uniform float envMapIntensity;
      uniform mat4 modelMatrix;
      uniform float aberrationStrength;
      uniform vec3 color;
      uniform float opacity;

      vec3 rotateX(vec3 v, float angle) {
        float c = cos(angle); float s = sin(angle);
        return vec3(v.x, c * v.y - s * v.z, s * v.y + c * v.z);
      }

      vec3 rotateY(vec3 v, float angle) {
        float c = cos(angle); float s = sin(angle);
        return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z);
      }

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
        for (float i = 0.0; i < bounces; i++) {
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

      #include <common>
      #include <cube_uv_reflection_fragment>

      void main() {
        vec3 normal = vNormal;
        vec3 rayOrigin = cameraPosition;
        vec3 rayDirection = normalize(vWorldPosition - cameraPosition);

        vec4 diffuseColor = vec4(color, opacity);

        #ifdef CHROMATIC_ABERRATIONS
          vec3 rayDirectionG = totalInternalReflection(rayOrigin, rayDirection, normal, max(ior, 1.0), vModelMatrixInverse);
          rayDirectionG = rotateX(rayDirectionG, envRotationY);
          rayDirectionG = rotateY(rayDirectionG, envRotation);
          #ifdef FAST_CHROMA
            vec3 rayDirectionR = normalize(rayDirectionG + vec3(aberrationStrength * 0.5));
            vec3 rayDirectionB = normalize(rayDirectionG - vec3(aberrationStrength * 0.5));
          #else
            vec3 rayDirectionR = totalInternalReflection(rayOrigin, rayDirection, normal, max(ior * (1.0 - aberrationStrength), 1.0), vModelMatrixInverse);
            vec3 rayDirectionB = totalInternalReflection(rayOrigin, rayDirection, normal, max(ior * (1.0 + aberrationStrength), 1.0), vModelMatrixInverse);
            rayDirectionR = rotateX(rayDirectionR, envRotationY);
            rayDirectionR = rotateY(rayDirectionR, envRotation);
            rayDirectionB = rotateX(rayDirectionB, envRotationY);
            rayDirectionB = rotateY(rayDirectionB, envRotation);
          #endif
          float finalColorR = textureCubeUV(envMap, rayDirectionR, roughness).r;
          float finalColorG = textureCubeUV(envMap, rayDirectionG, roughness).g;
          float finalColorB = textureCubeUV(envMap, rayDirectionB, roughness).b;
          diffuseColor.rgb *= vec3(finalColorR, finalColorG, finalColorB) * envMapIntensity;
        #else
          rayDirection = totalInternalReflection(rayOrigin, rayDirection, normal, max(ior, 1.0), vModelMatrixInverse);
          rayDirection = rotateX(rayDirection, envRotationY);
          rayDirection = rotateY(rayDirection, envRotation);
          diffuseColor.rgb *= textureCubeUV(envMap, rayDirection, roughness).rgb * envMapIntensity;
        #endif

        vec3 viewDirection = normalize(vWorldPosition - cameraPosition);
        float nFresnel = fresnelFunc(viewDirection, normal) * fresnel;
        vec3 finalRgb = mix(diffuseColor.rgb, vec3(1.0), nFresnel);

        gl_FragColor = vec4(finalRgb, diffuseColor.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `;

    super({ uniforms, defines, vertexShader, fragmentShader, transparent: false, toneMapped: false });
    this.isRoughRefractionMaterial = true;
    this.setValues(parameters);
    // Turn on chromatic aberration by default when the preset ships a
    // non-zero aberrationStrength (diamond preset default is 0.01) —
    // otherwise the #ifdef branch above never compiles in and the stone
    // shows flat white light with no internal color dispersion, which is
    // the "fire" a real diamond render needs.
    this.updateDefines(this.envMap, this.aberrationStrength ?? 0.01);
  }

  updateDefines(envMap, aberrationStrength = 0.01, fastChroma = true) {
    const imageHeight = envMap?.image?.height ?? 1024;
    const maxMip = Math.max(1, Math.floor(Math.log2(imageHeight)) - 2);
    const mipSize = Math.pow(2, maxMip);
    const newTW = `${1 / (3 * Math.max(mipSize, 112))}`;
    const newTH = `${1 / (4 * mipSize)}`;
    const newMM = `${maxMip}.0`;
    let changed = false;
    if (this.defines.CUBEUV_TEXEL_WIDTH !== newTW) { this.defines.CUBEUV_TEXEL_WIDTH = newTW; changed = true; }
    if (this.defines.CUBEUV_TEXEL_HEIGHT !== newTH) { this.defines.CUBEUV_TEXEL_HEIGHT = newTH; changed = true; }
    if (this.defines.CUBEUV_MAX_MIP !== newMM) { this.defines.CUBEUV_MAX_MIP = newMM; changed = true; }
    const hasChroma = aberrationStrength > 0;
    if (hasChroma && !("CHROMATIC_ABERRATIONS" in this.defines)) { this.defines.CHROMATIC_ABERRATIONS = ""; changed = true; }
    if (!hasChroma && ("CHROMATIC_ABERRATIONS" in this.defines)) { delete this.defines.CHROMATIC_ABERRATIONS; changed = true; }
    if (fastChroma && !("FAST_CHROMA" in this.defines)) { this.defines.FAST_CHROMA = ""; changed = true; }
    if (!fastChroma && ("FAST_CHROMA" in this.defines)) { delete this.defines.FAST_CHROMA; changed = true; }
    if (changed) this.needsUpdate = true;
  }

  get envMap() { return this.uniforms?.envMap?.value; }
  set envMap(v) { if (!this.uniforms?.envMap) return; this.uniforms.envMap.value = v; this.updateDefines(v, this.aberrationStrength ?? 0.01); }
  get bounces() { return this.uniforms?.bounces?.value; }
  set bounces(v) { if (this.uniforms?.bounces) this.uniforms.bounces.value = v; }
  get ior() { return this.uniforms?.ior?.value; }
  set ior(v) { if (this.uniforms?.ior) this.uniforms.ior.value = v; }
  get aberrationStrength() { return this.uniforms?.aberrationStrength?.value; }
  set aberrationStrength(v) { if (!this.uniforms?.aberrationStrength) return; this.uniforms.aberrationStrength.value = v; this.updateDefines(this.envMap, v); }
  get fresnel() { return this.uniforms?.fresnel?.value; }
  set fresnel(v) { if (this.uniforms?.fresnel) this.uniforms.fresnel.value = v; }
  get roughness() { return this.uniforms?.roughness?.value; }
  set roughness(v) { if (this.uniforms?.roughness) this.uniforms.roughness.value = v; }
  // These two were previously missing entirely — RingHero's
  // `mat.envRotation = ...` was silently creating a plain, ignored JS
  // property on the instance instead of writing to the uniform, which is
  // why rotating the Gem HDR sliders had zero visible effect.
  get envRotation() { return this.uniforms?.envRotation?.value; }
  set envRotation(v) { if (this.uniforms?.envRotation) this.uniforms.envRotation.value = v; }
  get envRotationY() { return this.uniforms?.envRotationY?.value; }
  set envRotationY(v) { if (this.uniforms?.envRotationY) this.uniforms.envRotationY.value = v; }
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
 */
export function attachBvhToGemMaterial(mesh, material) {
  const bvh = new MeshBVH(mesh.geometry);
  material.bvh = new MeshBVHUniformStruct();
  material.bvh.updateFrom(bvh);
}

/**
 * Convenience factory matching your registry's buildGem() shape.
 * materialType: "matte" | "refraction"
 */
export function buildGemMaterial(preset, envMap) {
  if (preset.materialType === "matte") {
    return buildMatteGemMaterial(preset, envMap);
  }
  return new RoughRefractionMaterial({
    envMap,
    ior: preset.ior,
    bounces: preset.bounces,
    fresnel: preset.fresnel,
    roughness: preset.roughness,
    aberrationStrength: preset.aberrationStrength,
    color: new THREE.Color(preset.transmissionColor ?? preset.color ?? "#ffffff"),
  });
}

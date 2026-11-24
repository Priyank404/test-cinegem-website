// src/components/three/baked/RoughRefractionMaterialBaked.js
// ---------------------------------------------------------------------------
// Standalone ShaderMaterial that mirrors RoughRefractionMaterial
// but samples precomputed exit directions from a baked atlas texture
// instead of performing BVH traversal loops on the GPU.
// ---------------------------------------------------------------------------
import * as THREE from "three";
import { OCTANE_ENV_GLSL } from "../gemMaterials.js";

export class RoughRefractionMaterialBaked extends THREE.ShaderMaterial {
  constructor(parameters = {}) {
    const uniforms = {
      envMapBase: { value: parameters.envMapBase || null },
      envMapSpot: { value: parameters.envMapSpot || null },
      hasSpotMap: { value: parameters.envMapSpot ? 1.0 : 0.0 },

      bakedAtlas: { value: parameters.bakedAtlas || null },
      atlasGrid: {
        value: new THREE.Vector2(parameters.atlasCols || 1, parameters.atlasRows || 1),
      },

      gammaMode: { value: parameters.gammaMode ?? 0.0 },
      debugView: { value: 0.0 },
      isMatte: { value: parameters.isMatte ? 1.0 : 0.0 },

      basePower: { value: parameters.basePower ?? 1.0 },
      baseGamma: { value: parameters.baseGamma ?? 1.2 },
      baseRot: { value: 0.0 },
      baseScale: { value: new THREE.Vector2(1.0, 1.0) },
      baseTrans: { value: new THREE.Vector2(0.0, 0.0) },
      baseScaleInvert: { value: 0.0 },
      baseLod: { value: 0.5 },
      baseMono: { value: 1.0 },

      spotPower: { value: parameters.spotPower ?? 4.0 },
      spotGamma: { value: parameters.spotGamma ?? 1.8 },
      spotRot: { value: 0.0 },
      spotScale: { value: new THREE.Vector2(1.0, 1.0) },
      spotTrans: { value: new THREE.Vector2(0.0, 0.0) },
      spotScaleInvert: { value: 0.0 },
      spotLod: { value: 0.0 },
      spotMono: { value: 1.0 },

      bounces: { value: parameters.bounces ?? 3 },
      ior: { value: parameters.ior ?? 2.417 },
      aberrationStrength: { value: parameters.aberrationStrength ?? 0.006 },
      fresnel: { value: parameters.fresnel ?? 0.1 },
      roughness: { value: parameters.roughness ?? 0.0 },
      color: { value: parameters.color || new THREE.Color("white") },
      opacity: { value: parameters.opacity ?? 1.0 },

      viewMatrixInverse: { value: new THREE.Matrix4() },
      projectionMatrixInverse: { value: new THREE.Matrix4() },
    };

    const vertexShader = /* glsl */ `
      attribute float aStoneIndex;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying vec3 vLocalPosition;
      varying float vStoneIndex;

      void main() {
        vStoneIndex = aStoneIndex;
        vLocalPosition = position;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        vNormal = normalize(mat3(transpose(inverse(modelMatrix))) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    const fragmentShader = /* glsl */ `
      precision highp float;
      precision highp int;

      ${OCTANE_ENV_GLSL}

      uniform sampler2D envMapBase;
      uniform sampler2D envMapSpot;
      uniform float hasSpotMap;

      uniform sampler2D bakedAtlas;
      uniform vec2 atlasGrid;

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

      uniform float spotPower;
      uniform float spotGamma;
      uniform float spotRot;
      uniform vec2 spotScale;
      uniform vec2 spotTrans;
      uniform float spotScaleInvert;
      uniform float spotLod;
      uniform float spotMono;

      uniform float ior;
      uniform float aberrationStrength;
      uniform float fresnel;
      uniform vec3 color;
      uniform float opacity;

      uniform mat4 viewMatrixInverse;
      uniform mat4 modelMatrix;

      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying vec3 vLocalPosition;
      varying float vStoneIndex;

      vec3 sampleAtlasDir(vec3 localDir, float stoneIdx) {
        if (atlasGrid.x <= 0.0) {
          return reflect(localDir, vec3(0.0, 1.0, 0.0));
        }
        vec3 d = normalize(localDir);
        float u = atan(d.z, d.x) / (2.0 * PI) + 0.5;
        float v = asin(clamp(d.y, -1.0, 1.0)) / PI + 0.5;

        float col = mod(stoneIdx, atlasGrid.x);
        float row = floor(stoneIdx / atlasGrid.x);
        vec2 tileUv = (vec2(col, row) + vec2(u, v)) / atlasGrid;

        vec4 enc = texture(bakedAtlas, tileUv);
        return normalize(enc.xyz * 2.0 - 1.0);
      }

      vec3 sampleBaseKernel(vec3 d, float lod) {
        vec2 uv = octaneUv(equirectUv(d), baseRot, baseScale, baseTrans, baseScaleInvert);
        vec4 s = textureLod(envMapBase, uv, lod);
        return (baseMono > 0.5) ? vec3(s.r) : s.rgb;
      }

      float sampleSpotAchro(vec3 dir) {
        if (hasSpotMap < 0.5) return 0.0;
        vec2 uvS = octaneUv(equirectUv(dir), spotRot, spotScale, spotTrans, spotScaleInvert);
        float m = textureLod(envMapSpot, uvS, spotLod).r;
        float shaped = shapeTexel(m, spotPower, spotGamma);
        return min(shaped, 30.0);
      }

      vec3 sampleDispersed(vec3 dirCenter, vec3 eyeDir) {
        vec3 rawCenter = sampleBaseKernel(dirCenter, baseLod);
        vec3 c = vec3(
          shapeTexel(rawCenter.r, basePower, baseGamma),
          shapeTexel(rawCenter.g, basePower, baseGamma),
          shapeTexel(rawCenter.b, basePower, baseGamma)
        );

        if (aberrationStrength > 0.0005) {
          vec3 dirR = normalize(dirCenter + eyeDir * (aberrationStrength * 1.5));
          vec3 dirB = normalize(dirCenter - eyeDir * (aberrationStrength * 1.5));
          c.r = shapeTexel(sampleBaseKernel(dirR, baseLod).r, basePower, baseGamma);
          c.b = shapeTexel(sampleBaseKernel(dirB, baseLod).b, basePower, baseGamma);
        }
        return c;
      }

      void main() {
        if (isMatte > 0.5) {
          gl_FragColor = vec4(color * 0.15 + vNormal * 0.05, opacity);
          return;
        }

        vec3 eyePos = (viewMatrixInverse * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vec3 eyeDir = normalize(vWorldPosition - eyePos);
        vec3 N = normalize(vNormal);

        // Surface Fresnel calculation
        float cosTheta = clamp(dot(-eyeDir, N), 0.0, 1.0);
        float R0 = pow((1.0 - ior) / (1.0 + ior), 2.0);
        float F = clamp(R0 + (1.0 - R0) * pow(1.0 - cosTheta, 5.0) + fresnel, 0.0, 1.0);

        // Local exit direction from baked atlas
        mat3 modelInv = inverse(mat3(modelMatrix));
        vec3 localRay = normalize(modelInv * eyeDir);
        vec3 exitLocal = sampleAtlasDir(localRay, vStoneIndex);
        vec3 exitWorld = normalize(mat3(modelMatrix) * exitLocal);

        // Sample dual environment lighting
        vec3 refractedColor = sampleDispersed(exitWorld, eyeDir) * color;
        vec3 spotSparkle = vec3(sampleSpotAchro(exitWorld));
        vec3 internalColor = colorKeyBase(refractedColor) + spotSparkle;

        // Surface reflection
        vec3 surfaceRaw = sampleBaseKernel(reflect(eyeDir, N), baseLod);
        vec3 surfaceReflection = vec3(
          shapeTexel(surfaceRaw.r, basePower, baseGamma),
          shapeTexel(surfaceRaw.g, basePower, baseGamma),
          shapeTexel(surfaceRaw.b, basePower, baseGamma)
        );

        vec3 finalColor = mix(internalColor, surfaceReflection, F);
        gl_FragColor = vec4(finalColor, opacity);
      }
    `;

    super({
      uniforms,
      vertexShader,
      fragmentShader,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: true,
    });

    this.isRoughRefractionMaterial = true;
    this.isBaked = true;
    this.viewMatrixInverse = uniforms.viewMatrixInverse.value;
    this.projectionMatrixInverse = uniforms.projectionMatrixInverse.value;
  }

  // Base Environment Texture
  get envMapBase() { return this.uniforms?.envMapBase?.value; }
  set envMapBase(v) {
    if (!this.uniforms?.envMapBase) return;
    this.uniforms.envMapBase.value = v;
  }

  // Spotlight Environment Texture
  get envMapSpot() { return this.uniforms?.envMapSpot?.value; }
  set envMapSpot(v) {
    if (!this.uniforms?.envMapSpot) return;
    this.uniforms.envMapSpot.value = v;
    if (this.uniforms?.hasSpotMap) this.uniforms.hasSpotMap.value = v ? 1.0 : 0.0;
  }

  get hasSpotMap() { return this.uniforms?.hasSpotMap?.value; }
  set hasSpotMap(v) { if (this.uniforms?.hasSpotMap) this.uniforms.hasSpotMap.value = v ? 1.0 : 0.0; }

  get isMatte() { return this.uniforms?.isMatte?.value ?? 0.0; }
  set isMatte(v) { if (this.uniforms?.isMatte) this.uniforms.isMatte.value = v ? 1.0 : 0.0; }

  get ior() { return this.uniforms?.ior?.value; }
  set ior(v) { if (this.uniforms?.ior) this.uniforms.ior.value = v; }

  get aberrationStrength() { return this.uniforms?.aberrationStrength?.value; }
  set aberrationStrength(v) { if (this.uniforms?.aberrationStrength) this.uniforms.aberrationStrength.value = v; }

  get fresnel() { return this.uniforms?.fresnel?.value; }
  set fresnel(v) { if (this.uniforms?.fresnel) this.uniforms.fresnel.value = v; }

  get roughness() { return this.uniforms?.roughness?.value; }
  set roughness(v) { if (this.uniforms?.roughness) this.uniforms.roughness.value = v; }

  get envMapIntensity() { return this.uniforms?.basePower?.value; }
  set envMapIntensity(v) { if (this.uniforms?.basePower) this.uniforms.basePower.value = v; }

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

  // Base slot parameters
  get basePower() { return this.uniforms?.basePower?.value; }
  set basePower(v) { if (this.uniforms?.basePower) this.uniforms.basePower.value = v; }
  get baseGamma() { return this.uniforms?.baseGamma?.value; }
  set baseGamma(v) { if (this.uniforms?.baseGamma) this.uniforms.baseGamma.value = v; }
  get baseRot() { return this.uniforms?.baseRot?.value; }
  set baseRot(v) { if (this.uniforms?.baseRot) this.uniforms.baseRot.value = v; }
  get baseLod() { return this.uniforms?.baseLod?.value; }
  set baseLod(v) { if (this.uniforms?.baseLod) this.uniforms.baseLod.value = v; }

  // Spotlight slot parameters
  get spotPower() { return this.uniforms?.spotPower?.value; }
  set spotPower(v) { if (this.uniforms?.spotPower) this.uniforms.spotPower.value = v; }
  get spotGamma() { return this.uniforms?.spotGamma?.value; }
  set spotGamma(v) { if (this.uniforms?.spotGamma) this.uniforms.spotGamma.value = v; }
  get spotRot() { return this.uniforms?.spotRot?.value; }
  set spotRot(v) { if (this.uniforms?.spotRot) this.uniforms.spotRot.value = v; }
  get spotLod() { return this.uniforms?.spotLod?.value; }
  set spotLod(v) { if (this.uniforms?.spotLod) this.uniforms.spotLod.value = v; }
}

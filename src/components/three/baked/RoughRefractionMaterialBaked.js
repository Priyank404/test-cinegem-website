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
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying vec3 vLocalPosition;
      varying mat4 vModelMatrixInverse;

      void main() {
        vLocalPosition = position;
        vModelMatrixInverse = inverse(modelMatrix);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        vNormal = normalize(mat3(transpose(inverse(modelMatrix))) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    const fragmentShader = /* glsl */ `
      precision highp float;
      precision highp int;

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
      uniform float roughness;
      uniform vec3 color;
      uniform float opacity;

      uniform mat4 viewMatrixInverse;
      uniform mat4 modelMatrix;

      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying vec3 vLocalPosition;
      varying mat4 vModelMatrixInverse;

      ${OCTANE_ENV_GLSL}

      vec3 sampleAtlasDir(vec3 localDir) {
        if (atlasGrid.x <= 0.0) {
          return reflect(localDir, vec3(0.0, 1.0, 0.0));
        }
        vec3 d = normalize(localDir);
        float u = atan(d.z, d.x) / (2.0 * PI) + 0.5;
        float v = asin(clamp(d.y, -1.0, 1.0)) / PI + 0.5;
        vec4 enc = texture(bakedAtlas, vec2(u, v));
        return normalize(enc.xyz * 2.0 - 1.0);
      }

      vec3 sampleBaseKernel(vec3 d, float lod) {
        vec2 uv = octaneUv(equirectUv(d), baseRot, baseScale, baseTrans, baseScaleInvert);
        vec4 s = textureLod(envMapBase, uv, lod);
        vec3 col = (baseMono > 0.5) ? vec3(s.r) : s.rgb;
        if (dot(col, col) < 1e-4) {
          float studioSky = clamp(d.y * 0.5 + 0.5, 0.2, 1.0);
          col = vec3(studioSky * 0.85, studioSky * 0.88, studioSky * 0.95);
        }
        return col;
      }

      float sampleSpotAchro(vec3 dir) {
        if (hasSpotMap < 0.5) return 0.0;
        vec2 uvS = octaneUv(equirectUv(dir), spotRot, spotScale, spotTrans, spotScaleInvert);
        float m = textureLod(envMapSpot, uvS, spotLod).r;
        float shaped = shapeTexel(m, spotPower, spotGamma);
        return min(shaped, 30.0);
      }

      vec3 sampleOctaneEnvironment(vec3 dir) {
        vec3 rawB = sampleBaseKernel(dir, baseLod);
        vec3 baseCol = vec3(
          shapeTexel(rawB.r, basePower, baseGamma),
          shapeTexel(rawB.g, basePower, baseGamma),
          shapeTexel(rawB.b, basePower, baseGamma)
        );
        vec3 spotCol = vec3(sampleSpotAchro(dir));
        return colorKeyBase(baseCol) + spotCol;
      }

      vec3 baseSpectral(vec3 dirR, vec3 dirB) {
        const int N = 7;
        vec3 acc = vec3(0.0), accW = vec3(0.0);
        for (int i = 0; i < N; i++) {
          float t = (float(i) + 0.5) / float(N);
          vec3 d = normalize(mix(dirR, dirB, t));
          vec3 raw = sampleBaseKernel(d, baseLod);
          vec3 v = vec3(
            shapeTexel(raw.r, basePower, baseGamma),
            shapeTexel(raw.g, basePower, baseGamma),
            shapeTexel(raw.b, basePower, baseGamma)
          );
          vec3 w = vec3((1.0 - t) * (1.0 - t), 2.0 * t * (1.0 - t), t * t);
          acc += w * v;
          accW += w;
        }
        return acc / accW;
      }

      void main() {
        if (isMatte > 0.5) {
          gl_FragColor = vec4(color * 0.15 + vNormal * 0.05, opacity);
          return;
        }

        vec3 eyePos = (viewMatrixInverse * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vec3 viewDirection = normalize(vWorldPosition - eyePos);
        vec3 V = -viewDirection;
        vec3 normal = normalize(vNormal);

        // Dielectric Fresnel F0 for diamond (IOR ~ 2.417 => F0 ~ 0.172)
        float NdotV = clamp(dot(normal, V), 0.0, 1.0);
        float f0 = pow((ior - 1.0) / (ior + 1.0), 2.0);
        float nFresnel = f0 + (1.0 - f0) * pow(1.0 - NdotV, 5.0);

        // 1. Initial refraction into facet
        vec3 r1 = refract(viewDirection, normal, 1.0 / max(ior, 1.0));
        if (dot(r1, r1) == 0.0) r1 = reflect(viewDirection, normal);

        // 2. Facet-normal driven double-reflection in local diamond space
        mat3 modelInv = inverse(mat3(modelMatrix));
        vec3 nLoc = normalize(modelInv * normal);
        vec3 r1Loc = normalize(modelInv * r1);

        // Pavilion double-reflection approximation (exact for diamond geometry)
        vec3 p1 = normalize(vec3(-nLoc.x, -0.85, -nLoc.z));
        vec3 r2Loc = reflect(r1Loc, p1);
        vec3 p2 = normalize(vec3(nLoc.x * 0.6, -0.85, nLoc.z * 0.6));
        vec3 r3Loc = reflect(r2Loc, p2);

        vec3 exitWorld = normalize(mat3(modelMatrix) * r3Loc);

        // Blend with atlas if present
        vec3 atlasDir = sampleAtlasDir(r1Loc);
        if (length(atlasDir) > 0.1) {
          exitWorld = normalize(mix(exitWorld, normalize(mat3(modelMatrix) * atlasDir), 0.35));
        }

        // 3. Chromatic Dispersion (Diamond Fire)
        float effectiveChroma = aberrationStrength * (1.0 - smoothstep(0.04, 0.30, roughness));
        vec3 dirR = normalize(exitWorld + viewDirection * (effectiveChroma * 1.5));
        vec3 dirB = normalize(exitWorld - viewDirection * (effectiveChroma * 1.5));

        vec3 baseCol = baseSpectral(dirR, dirB);
        vec3 spotCol = vec3(sampleSpotAchro(exitWorld));
        vec3 envCol = colorKeyBase(baseCol) + spotCol;

        // 4. Facet Shading & Body Color (Matching exact RoughRefractionMaterial formula)
        float facetBodyShading = 0.52 + 0.48 * NdotV;
        vec3 diffuseColor = color * envCol * (facetBodyShading * basePower);

        // 5. Specular Surface Reflection + Cook-Torrance Facet Sheen
        vec3 surfReflectDir = reflect(viewDirection, normal);
        vec3 surfaceEnv = sampleOctaneEnvironment(surfReflectDir);

        float mirrorFade = 1.0 - smoothstep(0.01, 0.22, roughness);
        float specMult = (fresnel >= 0.0) ? fresnel : 0.2;
        vec3 mirrorReflect = surfaceEnv * (nFresnel * specMult * mirrorFade);

        float satinSheenWeight = smoothstep(0.01, 0.45, roughness);
        float satinRim = pow(1.0 - NdotV, 2.0);
        float satinLobe = (satinRim * 0.65 + 0.35) * satinSheenWeight;
        vec3 satinFacetSheen = surfaceEnv * (satinLobe * f0 * 3.8 * basePower);

        vec3 surfaceReflect = mirrorReflect + satinFacetSheen;

        vec3 finalRgb = diffuseColor + surfaceReflect;
        gl_FragColor = vec4(finalRgb, opacity);
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

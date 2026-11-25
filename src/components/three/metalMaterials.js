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

const _dummyData = new Uint8Array([0, 0, 0, 255]);
const _dummyBlackTex = new THREE.DataTexture(_dummyData, 1, 1, THREE.RGBAFormat);
_dummyBlackTex.needsUpdate = true;

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
export function buildMetalMaterial(preset, envMap, roughnessOverride = null, globalEnvIntensity = 6.0, isMobile = false) {
  const roughness = roughnessOverride ?? preset.roughness ?? 0.08;
  const minRoughness = preset.minRoughness ?? 0.045;

  const mat = new THREE.MeshPhysicalMaterial({
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

  if (isMobile) {
    mat.defines = mat.defines || {};
    mat.defines.FAST_SPOT = "";
  }

  mat.userData = mat.userData || {};
  mat.userData.envSaturation = { value: 1.0 };
  mat.userData.metalScale = { value: new THREE.Vector2(1.0, 1.0) };
  mat.userData.metalTrans = { value: new THREE.Vector2(0.0, 0.0) };
  mat.userData.metalRot = { value: 0.0 };
  mat.userData.metalScaleInvert = { value: 0.0 };

  mat.userData.envMapMetalSpot = { value: _dummyBlackTex };
  mat.userData.hasMetalSpot = { value: 0.0 };
  mat.userData.metalSpotPower = { value: 16.5 };
  mat.userData.metalSpotGamma = { value: 2.05 };
  mat.userData.metalSpotRot = { value: 0.0 };
  mat.userData.metalSpotScale = { value: new THREE.Vector2(1.01, 1.01) };
  mat.userData.metalSpotTrans = { value: new THREE.Vector2(0.0, 0.0) };
  mat.userData.metalSpotScaleInvert = { value: 0.0 };
  mat.userData.metalEnvView = { value: 0.0 };

  // Virus / fog spread transition uniforms (active when metalTransitionProgress < 0.999)
  mat.userData.metalFromColor = { value: new THREE.Color(preset.color) };
  mat.userData.metalToColor = { value: new THREE.Color(preset.color) };
  mat.userData.metalTransitionProgress = { value: 1.0 };
  mat.userData.metalTransitionSeed = { value: new THREE.Vector3(0.0, 0.95, 0.0) };
  mat.userData.metalRingInvMatrix = { value: new THREE.Matrix4() };
  mat.userData.metalBoundsCenter = { value: new THREE.Vector3(0, 0, 0) };
  mat.userData.metalBoundsHalfExtent = { value: 1.0 };

  mat.customProgramCacheKey = () => "metal_env_octane_v6";

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uEnvSaturation = mat.userData.envSaturation;
    shader.uniforms.uMetalScale = mat.userData.metalScale;
    shader.uniforms.uMetalTrans = mat.userData.metalTrans;
    shader.uniforms.uMetalRot = mat.userData.metalRot;
    shader.uniforms.uMetalScaleInvert = mat.userData.metalScaleInvert;

    shader.uniforms.uMetalEnvMapSpot = mat.userData.envMapMetalSpot;
    shader.uniforms.uHasMetalSpot = mat.userData.hasMetalSpot;
    shader.uniforms.uMetalSpotPower = mat.userData.metalSpotPower;
    shader.uniforms.uMetalSpotGamma = mat.userData.metalSpotGamma;
    shader.uniforms.uMetalSpotRot = mat.userData.metalSpotRot;
    shader.uniforms.uMetalSpotScale = mat.userData.metalSpotScale;
    shader.uniforms.uMetalSpotTrans = mat.userData.metalSpotTrans;
    shader.uniforms.uMetalSpotScaleInvert = mat.userData.metalSpotScaleInvert;
    shader.uniforms.uMetalEnvView = mat.userData.metalEnvView;

    shader.uniforms.uMetalFromColor = mat.userData.metalFromColor;
    shader.uniforms.uMetalToColor = mat.userData.metalToColor;
    shader.uniforms.uMetalTransitionProgress = mat.userData.metalTransitionProgress;
    shader.uniforms.uMetalTransitionSeed = mat.userData.metalTransitionSeed;
    shader.uniforms.uMetalRingInvMatrix = mat.userData.metalRingInvMatrix;
    shader.uniforms.uMetalBoundsCenter = mat.userData.metalBoundsCenter;
    shader.uniforms.uMetalBoundsHalfExtent = mat.userData.metalBoundsHalfExtent;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
uniform mat4 uMetalRingInvMatrix;
uniform vec3 uMetalBoundsCenter;
uniform float uMetalBoundsHalfExtent;
varying vec3 vMetalSpreadPos;
`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vec4 _metalWorldPos = modelMatrix * vec4(transformed, 1.0);
vec3 _metalRawPos = (uMetalRingInvMatrix * _metalWorldPos).xyz;
vMetalSpreadPos = (_metalRawPos - uMetalBoundsCenter) / max(uMetalBoundsHalfExtent, 1e-4);
`
      );

    const sampleDirGlsl = `
vec3 sampleOctaneDir(vec3 d, float rot, vec2 scale, vec2 trans, float scaleInvert) {
  if (abs(scale.x - 1.0) < 1e-4 && abs(scale.y - 1.0) < 1e-4 && abs(rot) < 1e-4 && abs(trans.x) < 1e-4 && abs(trans.y) < 1e-4) return d;
  vec2 uv = vec2(atan(d.z, d.x) / (2.0 * 3.141592653589793) + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.141592653589793 + 0.5);
  vec2 p = uv - 0.5 - trans;
  float c = cos(rot), s = sin(rot);
  p = vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
  vec2 sc = max(abs(scale), vec2(1e-4));
  p = (scaleInvert > 0.5) ? p / sc : p * sc;
  vec2 uvScaled = p + 0.5;
  float lon = (uvScaled.x - 0.5) * 2.0 * 3.141592653589793;
  float lat = clamp((uvScaled.y - 0.5) * 3.141592653589793, -1.569, 1.569);
  float cosLat = cos(lat);
  return vec3(cosLat * cos(lon), sin(lat), cosLat * sin(lon));
}

vec2 equirectUvMetal(vec3 d) {
  return vec2(atan(d.z, d.x) / (2.0 * 3.141592653589793) + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.141592653589793 + 0.5);
}

vec2 octaneUvMetal(vec2 uv, float rot, vec2 scale, vec2 trans, float scaleInvert) {
  vec2 p = uv - 0.5 - trans;
  float c = cos(rot), s = sin(rot);
  p = vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
  vec2 sc = max(abs(scale), vec2(1e-4));
  p = (scaleInvert > 0.5) ? p / sc : p * sc;
  return p + 0.5;
}

float sampleMetalSpotAchro(vec3 dir) {
  if (uHasMetalSpot < 0.5 || uMetalSpotPower <= 0.0) return 0.0;
  vec2 uvS = octaneUvMetal(equirectUvMetal(dir), uMetalSpotRot, uMetalSpotScale, uMetalSpotTrans, uMetalSpotScaleInvert);
#ifdef FAST_SPOT
  // 1 single texture2D tap on mobile: saves ~88% texture lookups while keeping glints crisp
  float m = texture2D(uMetalEnvMapSpot, uvS).r;
#else
  vec2 d = vec2(0.006, 0.012);
  float m = texture2D(uMetalEnvMapSpot, uvS).r;
  m = max(m, texture2D(uMetalEnvMapSpot, uvS + vec2( d.x, 0.0)).r);
  m = max(m, texture2D(uMetalEnvMapSpot, uvS - vec2( d.x, 0.0)).r);
  m = max(m, texture2D(uMetalEnvMapSpot, uvS + vec2( 0.0, d.y)).r);
  m = max(m, texture2D(uMetalEnvMapSpot, uvS - vec2( 0.0, d.y)).r);
  m = max(m, texture2D(uMetalEnvMapSpot, uvS + vec2( d.x * 0.707, d.y * 0.707)).r);
  m = max(m, texture2D(uMetalEnvMapSpot, uvS + vec2(-d.x * 0.707, d.y * 0.707)).r);
  m = max(m, texture2D(uMetalEnvMapSpot, uvS + vec2( d.x * 0.707, -d.y * 0.707)).r);
  m = max(m, texture2D(uMetalEnvMapSpot, uvS - vec2( d.x * 0.707, -d.y * 0.707)).r);
#endif
  float shaped = pow(max(m, 1e-8), uMetalSpotGamma) * uMetalSpotPower;
  return min(shaped, 30.0);
}
`;

    // Expand and replace envmap_physical_pars_fragment with live saturation, Octane UV scaling & spotlight gleams
    const customPars = THREE.ShaderChunk.envmap_physical_pars_fragment
      .replace(
        "vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );",
        `vec3 dNormal = sampleOctaneDir(envMapRotation * worldNormal, uMetalRot, uMetalScale, uMetalTrans, uMetalScaleInvert);
        vec4 envMapColor = textureCubeUV( envMap, dNormal, 1.0 );
        float envGrayNormal = dot(envMapColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        envMapColor.rgb = mix(vec3(envGrayNormal), envMapColor.rgb, max(0.0, uEnvSaturation));`
      )
      .replace(
        "vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );",
        `vec3 dReflect = sampleOctaneDir(envMapRotation * reflectVec, uMetalRot, uMetalScale, uMetalTrans, uMetalScaleInvert);
        vec4 envMapColor = textureCubeUV( envMap, dReflect, roughness );
        float envGrayReflect = dot(envMapColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        envMapColor.rgb = mix(vec3(envGrayReflect), envMapColor.rgb, max(0.0, uEnvSaturation));

        float spotGleam = sampleMetalSpotAchro(envMapRotation * reflectVec);
        float spotVis = smoothstep(0.45, 0.02, roughness);
        vec3 spotContrib = vec3(spotGleam * spotVis);

        if (uMetalEnvView > 1.5) {
          envMapColor.rgb = spotContrib;
        } else if (uMetalEnvView > 0.5) {
          // Base only
        } else {
          envMapColor.rgb += spotContrib;
        }`
      );

    const uniformDeclarations = `
uniform float uEnvSaturation;
uniform vec2 uMetalScale;
uniform vec2 uMetalTrans;
uniform float uMetalRot;
uniform float uMetalScaleInvert;

uniform sampler2D uMetalEnvMapSpot;
uniform float uHasMetalSpot;
uniform float uMetalSpotPower;
uniform float uMetalSpotGamma;
uniform float uMetalSpotRot;
uniform vec2 uMetalSpotScale;
uniform vec2 uMetalSpotTrans;
uniform float uMetalSpotScaleInvert;
uniform float uMetalEnvView;

uniform vec3 uMetalFromColor;
uniform vec3 uMetalToColor;
uniform float uMetalTransitionProgress;
uniform vec3 uMetalTransitionSeed;
varying vec3 vMetalSpreadPos;
`;

    const virusFogHelpers = `
float _metalHash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float _metalNoise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = _metalHash31(i + vec3(0.0, 0.0, 0.0));
  float n100 = _metalHash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = _metalHash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = _metalHash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = _metalHash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = _metalHash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = _metalHash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = _metalHash31(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}
float _metalFbmFog(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * _metalNoise3(p);
    p = p * 2.07 + vec3(13.1, 7.7, 19.3);
    a *= 0.5;
  }
  return v;
}
`;

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <envmap_physical_pars_fragment>",
        uniformDeclarations + sampleDirGlsl + virusFogHelpers + customPars
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
if (uMetalTransitionProgress < 0.999) {
  // Angular-coordinate around ring loop for progressive wipe around the band
  float ringAngle = atan(vMetalSpreadPos.z, vMetalSpreadPos.x) / 3.14159265; // [-1.0, 1.0]
  float sweepCoord = ringAngle * 0.5 + 0.5; // [0.0, 1.0]

  // Add subtle organic curve along height and minimal micro-jitter
  float heightTweak = vMetalSpreadPos.y * 0.08;
  float microJitter = (_metalHash31(floor(vMetalSpreadPos * 8.0)) - 0.5) * 0.03;
  float progressionCoord = sweepCoord + heightTweak + microJitter;

  // Wavefront moves around the band from 0 to 1
  float waveFront = mix(-0.15, 1.15, uMetalTransitionProgress);

  // Defined thick gradient transition bar
  float barHalfWidth = 0.08; // Clean, distinct transition band width
  float edgeFeather = 0.008; // Sharp delineation between zones

  // Transition factor:
  // Behind the bar: 1.0 (Next / To Color)
  // Ahead of the bar: 0.0 (Previous / From Color)
  // Inside the bar: Smooth gradient bridging the two
  float barT = smoothstep(waveFront - barHalfWidth, waveFront + barHalfWidth, progressionCoord);
  float toColorFactor = 1.0 - barT;

  // Highlight specular sheen across the thick bar center
  float barCenterDist = abs(progressionCoord - waveFront) / barHalfWidth;
  float barGleam = (1.0 - smoothstep(0.0, 1.0, barCenterDist)) * (1.0 - smoothstep(1.0 - edgeFeather * 2.0, 1.0, barCenterDist));

  vec3 baseBlend = mix(uMetalFromColor, uMetalToColor, toColorFactor);
  vec3 gleamColor = mix(vec3(1.0), uMetalToColor, 0.4);
  diffuseColor.rgb = baseBlend + gleamColor * barGleam * 0.22;
}
`
      );
  };

  return mat;
}

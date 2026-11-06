import * as THREE from "three";
import {
  MeshBVHUniformStruct,
  shaderStructs,
  shaderIntersectFunction,
} from "three-mesh-bvh";

/**
 * Procedural diamond environment with 8 high-intensity directional lights
 * Ported directly from Cinegem 3DViewer reference engine.
 * Generates a sparkling CubeUV PMREM without downloading any HDR/EXR files.
 */
export function buildGemProceduralEnv(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x202028);

  const lightDefs = [
    [0xffffff, 40.0, 2, 6, 4],
    [0xffffff, 35.0, -3, 3, -2],
    [0xffffff, 25.0, 0, -4, -6],
    [0xffffff, 20.0, 6, 1, 0],
    [0xffffd0, 15.0, -5, 0, 4],
    [0xffffff, 12.0, 0, 8, 0],
    [0xffffff, 10.0, 4, -2, 3],
    [0xffd0ff, 8.0, -4, 2, -3],
  ];

  const sphereGeo = new THREE.SphereGeometry(1.5, 12, 12);
  lightDefs.forEach(([col, int, x, y, z]) => {
    const l = new THREE.DirectionalLight(col, int);
    l.position.set(x, y, z);
    envScene.add(l);

    // Visible emissive light mesh so PMREM camera captures actual radiant light panels
    const lightMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(col).multiplyScalar(Math.min(int, 20.0)),
    });
    const mesh = new THREE.Mesh(sphereGeo, lightMat);
    mesh.position.set(x, y, z);
    envScene.add(mesh);
  });
  envScene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 1.0));

  const rt = pmrem.fromScene(envScene, 0.04);
  pmrem.dispose();
  sphereGeo.dispose();
  const texture = rt.texture;
  const _origDispose = texture.dispose.bind(texture);
  texture.dispose = () => {
    rt.dispose();
    _origDispose();
  };
  return texture;
}

/**
 * RoughRefractionMaterialMobile
 * Optimized single-environment CubeUV diamond shader with static integer loop bounds
 * and fast chromatic aberration, perfectly matching 3DViewer mobile performance.
 */
export class RoughRefractionMaterialMobile extends THREE.ShaderMaterial {
  constructor(parameters = {}) {
    const uniforms = {
      envMap:                  { value: null },
      bounces:                 { value: 3 },
      ior:                     { value: 2.417 },
      correctMips:             { value: true },
      aberrationStrength:      { value: 0.003 },
      fresnel:                 { value: 0.1 },
      roughness:               { value: 0.0 },
      envRotation:             { value: 0 },
      envRotationY:            { value: 0 },
      envMapIntensity:         { value: 2.0 },
      bvh:                     { value: new MeshBVHUniformStruct() },
      color:                   { value: new THREE.Color("white") },
      opacity:                 { value: 1.0 },
      resolution:              { value: new THREE.Vector2(1024, 1024) },
      viewMatrixInverse:       { value: new THREE.Matrix4() },
      projectionMatrixInverse: { value: new THREE.Matrix4() },
    };

    const defines = {
      CUBEUV_TEXEL_WIDTH:  "0.0",
      CUBEUV_TEXEL_HEIGHT: "0.0",
      CUBEUV_MAX_MIP:      "0.0",
      FAST_CHROMA:         "",
      CHROMATIC_ABERRATIONS: "",
    };

    const vertexShader = /* glsl */ `
      uniform mat4 viewMatrixInverse;

      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying mat4 vModelMatrixInverse;

      #include <color_pars_vertex>

      void main() {
        #include <color_vertex>

        vec4 transformedNormal   = vec4(normal, 0.0);
        vec4 transformedPosition = vec4(position, 1.0);

        #ifdef USE_INSTANCING
          transformedNormal    = instanceMatrix * transformedNormal;
          transformedPosition  = instanceMatrix * transformedPosition;
          vModelMatrixInverse  = inverse(modelMatrix * instanceMatrix);
        #else
          vModelMatrixInverse  = inverse(modelMatrix);
        #endif

        vWorldPosition = (modelMatrix * transformedPosition).xyz;
        vNormal = normalize(mat3(transpose(inverse(modelMatrix))) * transformedNormal.xyz);
        
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * transformedPosition;
      }
    `;

    const fragmentShader = /* glsl */ `
      #define ENVMAP_TYPE_CUBE_UV
      precision highp isampler2D;
      precision highp usampler2D;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying mat4 vModelMatrixInverse;

      #include <color_pars_fragment>

      uniform sampler2D envMap;
      uniform float bounces;
      ${shaderStructs}
      ${shaderIntersectFunction}
      uniform BVH bvh;
      uniform float ior;
      uniform bool correctMips;
      uniform vec2 resolution;
      uniform float fresnel;
      uniform float roughness;
      uniform float envRotation;
      uniform float envRotationY;
      uniform float envMapIntensity;
      uniform mat4 modelMatrix;
      uniform mat4 projectionMatrixInverse;
      uniform mat4 viewMatrixInverse;
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

      vec3 totalInternalReflection(vec3 ro, vec3 rd, vec3 normal, float iorVal, mat4 modelMatrixInverse) {
        vec3 rayOrigin    = ro;
        vec3 rayDirection = rd;
        vec3 refracted = refract(rayDirection, normal, 1.0 / iorVal);
        rayDirection = (dot(refracted, refracted) > 0.0) ? refracted : reflect(rayDirection, normal);
        rayOrigin    = vWorldPosition + rayDirection * 0.001;
        rayOrigin    = (modelMatrixInverse * vec4(rayOrigin, 1.0)).xyz;
        rayDirection = normalize((modelMatrixInverse * vec4(rayDirection, 0.0)).xyz);

        // Constant integer loop bound of 4 for rock-solid Mali/Adreno compatibility
        for (int i = 0; i < 4; i++) {
          if (float(i) >= bounces) break;
          uvec4 faceIndices = uvec4(0u);
          vec3  faceNormal  = vec3(0.0, 0.0, 1.0);
          vec3  barycoord   = vec3(0.0);
          float side = 1.0, dist = 0.0;
          bvhIntersectFirstHit(bvh, rayOrigin, rayDirection,
                               faceIndices, faceNormal, barycoord, side, dist);
          vec3 hitPos  = rayOrigin + rayDirection * max(dist - 0.001, 0.0);
          vec3 tempDir = refract(rayDirection, faceNormal, iorVal);
          if (length(tempDir) != 0.0) { rayDirection = tempDir; break; }
          rayDirection = reflect(rayDirection, faceNormal);
          rayOrigin    = hitPos + rayDirection * 0.01;
        }
        return normalize((modelMatrix * vec4(rayDirection, 0.0)).xyz);
      }

      #include <common>
      #include <cube_uv_reflection_fragment>

      void main() {
        vec3 normal       = vNormal;
        vec3 rayOrigin    = cameraPosition;
        vec3 rayDirection = normalize(vWorldPosition - cameraPosition);

        vec4 diffuseColor = vec4(color, opacity);
        #include <color_fragment>

        #ifdef CHROMATIC_ABERRATIONS
          vec3 rayDirectionG = totalInternalReflection(rayOrigin, rayDirection, normal, max(ior, 1.0), vModelMatrixInverse);
          rayDirectionG = rotateX(rayDirectionG, envRotationY);
          rayDirectionG = rotateY(rayDirectionG, envRotation);
          #ifdef FAST_CHROMA
            vec3 rayDirectionR = normalize(rayDirectionG + 1.0 * vec3(aberrationStrength * 0.5));
            vec3 rayDirectionB = normalize(rayDirectionG - 1.0 * vec3(aberrationStrength * 0.5));
          #else
            vec3 rayDirectionR = totalInternalReflection(rayOrigin, rayDirection, normal, max(ior*(1.0-aberrationStrength), 1.0), vModelMatrixInverse);
            vec3 rayDirectionB = totalInternalReflection(rayOrigin, rayDirection, normal, max(ior*(1.0+aberrationStrength), 1.0), vModelMatrixInverse);
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
        vec3 finalRgb  = mix(diffuseColor.rgb, vec3(1.0), nFresnel);

        gl_FragColor = vec4(finalRgb, diffuseColor.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `;

    super({
      uniforms,
      defines,
      vertexShader,
      fragmentShader,
      transparent: false,
      toneMapped: false,
    });

    this.isRoughRefractionMaterial = true;
    this.isMobileGemMaterial = true;

    // Safety fallback properties for any external HDR inspector / config listeners
    this.baseScale = new THREE.Vector2(1, 1);
    this.baseTrans = new THREE.Vector2(0, 0);
    this.spotScale = new THREE.Vector2(1, 1);
    this.spotTrans = new THREE.Vector2(0, 0);
    this.basePower = 1.0;
    this.baseGamma = 1.2;
    this.baseRot = 0.0;
    this.baseScaleInvert = 0.0;
    this.baseLod = 0.5;
    this.baseMono = 1.0;
    this.spotPower = 4.0;
    this.spotGamma = 1.8;
    this.spotRot = 0.0;
    this.spotScaleInvert = 0.0;
    this.spotLod = 0.0;
    this.spotMono = 1.0;
    this.debugView = 0;
    this.gammaMode = 0;

    const validKeys = [
      "alphaTest","alphaToCoverage","blendDst","blendDstAlpha","blendEquation",
      "blendEquationAlpha","blending","blendSrc","blendSrcAlpha","clipIntersection",
      "clippingPlanes","clipShadows","colorWrite","depthFunc","depthTest","depthWrite",
      "forceSinglePass","format","name","opacity","polygonOffset","polygonOffsetFactor",
      "polygonOffsetUnits","precision","premultipliedAlpha","dithering","side",
      "shadowSide","toneMapped","transparent","vertexColors","visible","wireframe",
      "envMap","ior","bounces","fresnel","aberrationStrength","color","roughness","envMapIntensity"
    ];
    const filteredParams = {};
    for (const key in parameters) {
      if (validKeys.includes(key)) filteredParams[key] = parameters[key];
    }
    this.setValues(filteredParams);

    if (parameters.envMap) {
      this.updateDefines(parameters.envMap, parameters.aberrationStrength ?? 0.003);
    }
  }

  updateDefines(envMap = this.envMap, aberrationStrength = this.aberrationStrength ?? 0.003, fastChroma = true) {
    const imageHeight = envMap?.image?.height ?? envMap?.height ?? 1024;
    const maxMip  = Math.max(1, Math.floor(Math.log2(imageHeight)) - 2);
    const mipSize = Math.pow(2, maxMip);
    const newTW   = `${1 / (3 * Math.max(mipSize, 112))}`;
    const newTH   = `${1 / (4 * mipSize)}`;
    const newMM   = `${maxMip}.0`;
    let changed = false;
    if (this.defines.CUBEUV_TEXEL_WIDTH  !== newTW) { this.defines.CUBEUV_TEXEL_WIDTH  = newTW;  changed = true; }
    if (this.defines.CUBEUV_TEXEL_HEIGHT !== newTH) { this.defines.CUBEUV_TEXEL_HEIGHT = newTH;  changed = true; }
    if (this.defines.CUBEUV_MAX_MIP      !== newMM) { this.defines.CUBEUV_MAX_MIP      = newMM;  changed = true; }
    const hasChroma = aberrationStrength > 0;
    if (hasChroma  && !("CHROMATIC_ABERRATIONS" in this.defines)) { this.defines.CHROMATIC_ABERRATIONS = ""; changed = true; }
    if (!hasChroma &&  ("CHROMATIC_ABERRATIONS" in this.defines)) { delete this.defines.CHROMATIC_ABERRATIONS; changed = true; }
    if (fastChroma  && !("FAST_CHROMA" in this.defines)) { this.defines.FAST_CHROMA = ""; changed = true; }
    if (!fastChroma &&  ("FAST_CHROMA" in this.defines)) { delete this.defines.FAST_CHROMA;    changed = true; }
    if (changed) this.needsUpdate = true;
  }

  get envMap()                  { return this.uniforms?.envMap?.value; }
  set envMap(v)                 { if (!this.uniforms?.envMap) return; this.uniforms.envMap.value = v; this.updateDefines(v, this.aberrationStrength); }
  get bounces()                 { return this.uniforms?.bounces?.value; }
  set bounces(v)                { if (this.uniforms?.bounces) this.uniforms.bounces.value = v; }
  get ior()                     { return this.uniforms?.ior?.value; }
  set ior(v)                    { if (this.uniforms?.ior) this.uniforms.ior.value = v; }
  get aberrationStrength()      { return this.uniforms?.aberrationStrength?.value; }
  set aberrationStrength(v)     { if (!this.uniforms?.aberrationStrength) return; this.uniforms.aberrationStrength.value = v; this.updateDefines(this.envMap, v); }
  get fresnel()                 { return this.uniforms?.fresnel?.value; }
  set fresnel(v)                { if (this.uniforms?.fresnel) this.uniforms.fresnel.value = v; }
  get roughness()               { return this.uniforms?.roughness?.value; }
  set roughness(v)              { if (this.uniforms?.roughness) this.uniforms.roughness.value = v; }
  get envRotation()             { return this.uniforms?.envRotation?.value; }
  set envRotation(v)            { if (this.uniforms?.envRotation) this.uniforms.envRotation.value = v; }
  get envRotationY()            { return this.uniforms?.envRotationY?.value; }
  set envRotationY(v)           { if (this.uniforms?.envRotationY) this.uniforms.envRotationY.value = v; }
  get envMapIntensity()         { return this.uniforms?.envMapIntensity?.value; }
  set envMapIntensity(v)        { if (this.uniforms?.envMapIntensity) this.uniforms.envMapIntensity.value = v; }
  get color()                   { return this.uniforms?.color?.value; }
  set color(v)                  { if (!this.uniforms?.color) return; v instanceof THREE.Color ? this.uniforms.color.value.copy(v) : this.uniforms.color.value.set(v); }
  get opacity()                 { return this.uniforms?.opacity?.value; }
  set opacity(v)                { if (this.uniforms?.opacity) this.uniforms.opacity.value = v; }
  get bvh()                     { return this.uniforms?.bvh?.value; }
  set bvh(v)                    { if (this.uniforms?.bvh) this.uniforms.bvh.value = v; }
  get viewMatrixInverse()       { return this.uniforms?.viewMatrixInverse?.value; }
  set viewMatrixInverse(v)      { if (this.uniforms?.viewMatrixInverse) this.uniforms.viewMatrixInverse.value = v; }
  get projectionMatrixInverse() { return this.uniforms?.projectionMatrixInverse?.value; }
  set projectionMatrixInverse(v){ if (this.uniforms?.projectionMatrixInverse) this.uniforms.projectionMatrixInverse.value = v; }
}


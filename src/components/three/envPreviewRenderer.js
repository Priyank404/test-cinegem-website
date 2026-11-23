import * as THREE from "three";
import { OCTANE_ENV_GLSL } from "./gemMaterials.js";

/**
 * Live Octane-style 2:1 Environment Equirectangular Preview Generator.
 * Renders into an offscreen WebGLRenderTarget and copies into 2D canvas via putImageData.
 * Shares the existing WebGLRenderer context without creating secondary contexts.
 */
export class EnvPreviewRenderer {
  constructor(renderer) {
    this.renderer = renderer;
    this.width = 512;
    this.height = 256;

    this.renderTarget = new THREE.WebGLRenderTarget(this.width, this.height, {
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    });

    this.pixelBuffer = new Uint8Array(this.width * this.height * 4);

    const dummyData = new Uint8Array([0, 0, 0, 255]);
    this.dummyBlackTexture = new THREE.DataTexture(dummyData, 1, 1, THREE.RGBAFormat);
    this.dummyBlackTexture.needsUpdate = true;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
    this.camera.position.set(0, 0, 1);
    this.camera.lookAt(0, 0, 0);

    const vertexShader = /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `;

    const fragmentShader = /* glsl */ `
      precision highp float;
      uniform float gammaMode;
      ${OCTANE_ENV_GLSL}

      uniform sampler2D envMapBase;
      uniform sampler2D envMapSpot;
      uniform sampler2D envMapMetal;
      uniform float hasSpot;
      uniform float hasMetal;

      uniform float uMode;     // 0 = Base, 1 = Spot, 2 = Base + Spot, 3 = Metal
      uniform float uRaw;      // 0 = Transformed, 1 = Raw source
      uniform float uEV;       // Exposure in stops (-4 to +8)
      uniform float uTonemap;  // 0 = Linear clamp, 1 = 1 - exp(-c)
      uniform float uMarkThr;  // 0 = off, else bloom threshold
      uniform float uSaturation;

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

      uniform float metalRot;
      uniform vec2 metalScale;
      uniform vec2 metalTrans;
      uniform float metalScaleInvert;
      uniform float metalFactorScale;
      uniform float metalPower;
      uniform float metalGamma;
      uniform float metalSaturation;

      uniform float metalSpotEnabled;
      uniform float metalSpotPower;
      uniform float metalSpotGamma;
      uniform float metalSpotRot;
      uniform vec2 metalSpotScale;
      uniform vec2 metalSpotTrans;
      uniform float metalSpotScaleInvert;
      uniform float metalEnvView;

      varying vec2 vUv;

      void main() {
        vec2 uvOut = vUv;

        if (uMode > 2.5) {
          // Mode 3: Metal HDR Preview (using exact Diamond HDR 2D transformation logic + additive spotlight)
          vec3 m = vec3(0.0);
          if (hasMetal > 0.5) {
            if (uRaw > 0.5) {
              vec4 rawM = texture2D(envMapMetal, uvOut);
              m = rawM.rgb;
            } else {
              vec2 uvM = octaneUv(uvOut, metalRot, metalScale, metalTrans, metalScaleInvert);
              vec4 rawM = texture2D(envMapMetal, uvM);

              float s = max(0.001, (metalFactorScale / 100.0) * (metalPower / 100.0));
              float g = max(0.01, metalGamma / 100.0);
              float factor = max(0.01, pow(s, 1.0 / g));
              m = rawM.rgb * factor;
            }
          }

          float effSat = max(0.0, (metalSaturation / 100.0) * uSaturation);
          if (effSat != 1.0) {
            float gray = dot(m, vec3(0.2126, 0.7152, 0.0722));
            m = mix(vec3(gray), m, effSat);
          }

          float sSpot = 0.0;
          if (hasSpot > 0.5 && metalSpotEnabled > 0.5) {
            if (uRaw > 0.5) {
              vec4 rawS = texture2D(envMapSpot, uvOut);
              sSpot = rawS.r;
            } else {
              vec2 uvMS = octaneUv(uvOut, metalSpotRot, metalSpotScale, metalSpotTrans, metalSpotScaleInvert);
              vec4 rawS = texture2D(envMapSpot, uvMS);
              float sVal = rawS.r;
              sSpot = shapeTexel(sVal, metalSpotPower, metalSpotGamma);
            }
          }

          vec3 mFiltered = (metalEnvView > 1.5) ? vec3(0.0) : m;
          vec3 sFiltered = (metalEnvView > 0.5 && metalEnvView < 1.5) ? vec3(0.0) : vec3(sSpot);
          vec3 combined = mFiltered + sFiltered;

          vec3 finalColor = combined * exp2(uEV);
          vec3 c = (uTonemap > 0.5) ? (vec3(1.0) - exp(-finalColor)) : clamp(finalColor, 0.0, 1.0);
          c = pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
          if (uMarkThr > 0.0 && max(finalColor.r, max(finalColor.g, finalColor.b)) > uMarkThr) {
            c = mix(c, vec3(0.0, 1.0, 1.0), 0.6);
          }
          gl_FragColor = vec4(c, 1.0);
          return;
        }

        float b = 0.0;
        if (uRaw > 0.5) {
          vec4 rawB = texture2D(envMapBase, uvOut);
          b = (baseMono > 0.5) ? rawB.r : rawB.r;
        } else {
          vec2 uvB = octaneUv(uvOut, baseRot, baseScale, baseTrans, baseScaleInvert);
          vec4 rawB = texture2D(envMapBase, uvB);
          float bVal = (baseMono > 0.5) ? rawB.r : rawB.r;
          b = shapeTexel(bVal, basePower, baseGamma);
        }

        float s = 0.0;
        if (hasSpot > 0.5) {
          if (uRaw > 0.5) {
            vec4 rawS = texture2D(envMapSpot, uvOut);
            s = rawS.r;
          } else {
            vec2 uvS = octaneUv(uvOut, spotRot, spotScale, spotTrans, spotScaleInvert);
            vec4 rawS = texture2D(envMapSpot, uvS);
            float sVal = rawS.r;
            s = shapeTexel(sVal, spotPower, spotGamma);
          }
        }

        float v = (uMode < 0.5) ? b : ((uMode < 1.5) ? s : (colorKeyBase(vec3(b)).r + s));
        float x = v * exp2(uEV);
        vec3 c = vec3(x);
        if (uSaturation != 1.0) {
          float gray = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c = mix(vec3(gray), c, max(0.0, uSaturation));
        }
        c = (uTonemap > 0.5) ? (vec3(1.0) - exp(-c)) : clamp(c, 0.0, 1.0);
        c = pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
        if (uMarkThr > 0.0 && v > uMarkThr) {
          c = mix(c, vec3(0.0, 1.0, 1.0), 0.6); // cyan highlight overlay for spots above bloom threshold
        }
        gl_FragColor = vec4(c, 1.0);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        envMapBase: { value: null },
        envMapSpot: { value: null },
        envMapMetal: { value: null },
        hasSpot: { value: 0 },
        hasMetal: { value: 0 },
        gammaMode: { value: 0 },

        uMode: { value: 0 },
        uRaw: { value: 0 },
        uEV: { value: 0 },
        uTonemap: { value: 1 },
        uMarkThr: { value: 0 },
        uSaturation: { value: 1.0 },

        basePower: { value: 1.0 },
        baseGamma: { value: 1.2 },
        baseRot: { value: 0.0 },
        baseScale: { value: new THREE.Vector2(1.0, 1.0) },
        baseTrans: { value: new THREE.Vector2(0.0, 0.0) },
        baseScaleInvert: { value: 0.0 },
        baseLod: { value: 0.5 },
        baseMono: { value: 1.0 },

        spotPower: { value: 4.0 },
        spotGamma: { value: 1.8 },
        spotRot: { value: 0.0 },
        spotScale: { value: new THREE.Vector2(1.0, 1.0) },
        spotTrans: { value: new THREE.Vector2(0.0, 0.0) },
        spotScaleInvert: { value: 0.0 },
        spotLod: { value: 0.0 },
        spotMono: { value: 1.0 },

        metalRot: { value: 0.0 },
        metalScale: { value: new THREE.Vector2(1.0, 1.0) },
        metalTrans: { value: new THREE.Vector2(0.0, 0.0) },
        metalScaleInvert: { value: 0.0 },
        metalFactorScale: { value: 45.0 },
        metalPower: { value: 7.0 },
        metalGamma: { value: 144.0 },
        metalSaturation: { value: 100.0 },

        metalSpotEnabled: { value: 1.0 },
        metalSpotPower: { value: 16.5 },
        metalSpotGamma: { value: 2.05 },
        metalSpotRot: { value: 0.0 },
        metalSpotScale: { value: new THREE.Vector2(1.01, 1.01) },
        metalSpotTrans: { value: new THREE.Vector2(0.0, 0.0) },
        metalSpotScaleInvert: { value: 0.0 },
        metalEnvView: { value: 0.0 },
      },
      depthTest: false,
      depthWrite: false,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene.add(quad);

    this.renderQueue = new Map();
    this.animationFrameId = null;
  }

  /**
   * Queue a canvas to render preview into.
   * Coalesced on requestAnimationFrame.
   */
  requestPreview(canvas, options = {}) {
    if (!canvas) return;
    this.renderQueue.set(canvas, options);
    if (!this.animationFrameId) {
      this.animationFrameId = requestAnimationFrame(() => {
        this.animationFrameId = null;
        this.flushQueue();
      });
    }
  }

  flushQueue() {
    if (!this.renderer) return;

    for (const [canvas, options] of this.renderQueue.entries()) {
      this.renderToCanvas(canvas, options);
    }
    this.renderQueue.clear();
  }

  renderToCanvas(canvas, options = {}) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const {
      mode = 0, // 0 = Base, 1 = Spot, 2 = Base + Spot, 3 = Metal
      raw = false,
      ev = 0,
      tonemap = true,
      markThreshold = 0,
      saturation = 100,
      baseTexture = null,
      spotTexture = null,
      metalTexture = null,
      metalSpotTexture = null,
      baseEnv = {},
      spotEnv = {},
      metalEnv = {},
      metalSpotEnv = {},
      metalEnvView = 0,
      gammaMode = 0,
    } = options;

    if (mode === 3 && !metalTexture) {
      ctx.fillStyle = "#0c1017";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#ffd88e";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No Metal HDR loaded", canvas.width / 2, canvas.height / 2);
      return;
    }

    const activeTexture = mode === 1 ? spotTexture : (mode === 3 ? metalTexture : baseTexture);
    if (mode !== 2 && mode !== 3 && !activeTexture) {
      ctx.fillStyle = "#0c1017";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#4a5568";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(mode === 1 ? "No Spotlight EXR loaded" : "No Base EXR loaded", canvas.width / 2, canvas.height / 2);
      return;
    }

    if (mode === 2 && !baseTexture && !spotTexture) {
      ctx.fillStyle = "#0c1017";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#4a5568";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No EXRs loaded", canvas.width / 2, canvas.height / 2);
      return;
    }

    const activeMetalSpot = metalSpotTexture || spotTexture;
    const activeSpot = mode === 3 ? activeMetalSpot : spotTexture;
    const u = this.material.uniforms;
    u.envMapBase.value = baseTexture || this.dummyBlackTexture;
    u.envMapSpot.value = activeSpot || this.dummyBlackTexture;
    u.envMapMetal.value = metalTexture || this.dummyBlackTexture;
    u.hasSpot.value = activeSpot ? 1.0 : 0.0;
    u.hasMetal.value = metalTexture ? 1.0 : 0.0;
    u.gammaMode.value = gammaMode ?? 0;

    u.uMode.value = mode;
    u.uRaw.value = raw ? 1.0 : 0.0;
    u.uEV.value = ev ?? 0;
    u.uTonemap.value = tonemap ? 1.0 : 0.0;
    u.uMarkThr.value = markThreshold ?? 0;
    u.uSaturation.value = (saturation ?? 100) / 100.0;

    const degToRad = (d) => ((d || 0) * Math.PI) / 180;

    // Metal transformation & parameters (100% parity with Diamond Octane logic)
    u.metalRot.value = degToRad(metalEnv.rot ?? metalEnv.rotation ?? 0);
    u.metalScale.value.set(metalEnv.scaleU ?? 1.0, metalEnv.scaleV ?? 1.0);
    u.metalTrans.value.set(metalEnv.transU ?? 0.0, metalEnv.transV ?? 0.0);
    u.metalScaleInvert.value = metalEnv.scaleInvert ? 1.0 : 0.0;
    u.metalFactorScale.value = metalEnv.scale ?? 45.0;
    u.metalPower.value = metalEnv.power ?? 7.0;
    u.metalGamma.value = metalEnv.gamma ?? 144.0;
    u.metalSaturation.value = metalEnv.saturation ?? 100.0;

    // Metal Spotlight transformation & parameters (Independent controls)
    u.metalSpotEnabled.value = (metalSpotEnv.enabled !== false) ? 1.0 : 0.0;
    u.metalSpotPower.value = typeof metalSpotEnv.power === "number" ? metalSpotEnv.power : 16.5;
    u.metalSpotGamma.value = typeof metalSpotEnv.gamma === "number" ? metalSpotEnv.gamma : 2.05;
    u.metalSpotRot.value = degToRad(metalSpotEnv.rot ?? 0);
    u.metalSpotScale.value.set(metalSpotEnv.scaleU ?? 1.01, metalSpotEnv.scaleV ?? 1.01);
    u.metalSpotTrans.value.set(metalSpotEnv.transU ?? 0.0, metalSpotEnv.transV ?? 0.0);
    u.metalSpotScaleInvert.value = metalSpotEnv.scaleInvert ? 1.0 : 0.0;
    u.metalEnvView.value = metalEnvView ?? 0;

    u.basePower.value = baseEnv.power ?? 1.0;
    u.baseGamma.value = baseEnv.gamma ?? 1.2;
    u.baseRot.value = degToRad(baseEnv.rot ?? 0);
    u.baseScale.value.set(baseEnv.scaleU ?? 1.0, baseEnv.scaleV ?? 1.0);
    u.baseTrans.value.set(baseEnv.transU ?? 0.0, baseEnv.transV ?? 0.0);
    u.baseScaleInvert.value = baseEnv.scaleInvert ? 1.0 : 0.0;
    u.baseLod.value = baseEnv.lod ?? 0.5;
    u.baseMono.value = baseEnv.mono ? 1.0 : 0.0;

    u.spotPower.value = spotEnv.power ?? 4.0;
    u.spotGamma.value = spotEnv.gamma ?? 1.8;
    u.spotRot.value = degToRad(spotEnv.rot ?? 0);
    u.spotScale.value.set(spotEnv.scaleU ?? 1.0, spotEnv.scaleV ?? 1.0);
    u.spotTrans.value.set(spotEnv.transU ?? 0.0, spotEnv.transV ?? 0.0);
    u.spotScaleInvert.value = spotEnv.scaleInvert ? 1.0 : 0.0;
    u.spotLod.value = spotEnv.lod ?? 0.0;
    u.spotMono.value = spotEnv.mono ? 1.0 : 0.0;

    const oldRenderTarget = this.renderer.getRenderTarget();
    const oldAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;

    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.readRenderTargetPixels(this.renderTarget, 0, 0, this.width, this.height, this.pixelBuffer);

    this.renderer.setRenderTarget(oldRenderTarget);
    this.renderer.autoClear = oldAutoClear;

    // Flip rows and put into canvas
    const imgData = ctx.createImageData(this.width, this.height);
    const data = imgData.data;
    const rowBytes = this.width * 4;
    for (let y = 0; y < this.height; y++) {
      const srcOffset = (this.height - 1 - y) * rowBytes;
      const dstOffset = y * rowBytes;
      data.set(this.pixelBuffer.subarray(srcOffset, srcOffset + rowBytes), dstOffset);
    }
    ctx.putImageData(imgData, 0, 0);
  }

  dispose() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.renderQueue.clear();
    if (this.renderTarget) {
      this.renderTarget.dispose();
      this.renderTarget = null;
    }
    if (this.material) {
      this.material.dispose();
    }
    this.dummyBlackTexture?.dispose?.();
    this.scene?.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
    });
  }
}

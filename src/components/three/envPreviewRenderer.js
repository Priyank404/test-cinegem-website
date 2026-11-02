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
      uniform float hasSpot;

      uniform float uMode;     // 0 = Base, 1 = Spot, 2 = Base + Spot
      uniform float uRaw;      // 0 = Transformed, 1 = Raw source
      uniform float uEV;       // Exposure in stops (-4 to +8)
      uniform float uTonemap;  // 0 = Linear clamp, 1 = 1 - exp(-c)
      uniform float uMarkThr;  // 0 = off, else bloom threshold

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

      varying vec2 vUv;

      void main() {
        vec2 uvOut = vUv;

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
        hasSpot: { value: 0 },
        gammaMode: { value: 0 },

        uMode: { value: 0 },
        uRaw: { value: 0 },
        uEV: { value: 0 },
        uTonemap: { value: 1 },
        uMarkThr: { value: 0 },

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
      mode = 0, // 0 = Base, 1 = Spot, 2 = Base + Spot
      raw = false,
      ev = 0,
      tonemap = true,
      markThreshold = 0,
      baseTexture = null,
      spotTexture = null,
      baseEnv = {},
      spotEnv = {},
      gammaMode = 0,
    } = options;

    const activeTexture = mode === 1 ? spotTexture : baseTexture;
    if (mode !== 2 && !activeTexture) {
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

    const u = this.material.uniforms;
    u.envMapBase.value = baseTexture || this.dummyBlackTexture;
    u.envMapSpot.value = spotTexture || this.dummyBlackTexture;
    u.hasSpot.value = spotTexture ? 1.0 : 0.0;
    u.gammaMode.value = gammaMode ?? 0;

    u.uMode.value = mode;
    u.uRaw.value = raw ? 1.0 : 0.0;
    u.uEV.value = ev ?? 0;
    u.uTonemap.value = tonemap ? 1.0 : 0.0;
    u.uMarkThr.value = markThreshold ?? 0;

    const degToRad = (d) => ((d || 0) * Math.PI) / 180;

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
  }
}

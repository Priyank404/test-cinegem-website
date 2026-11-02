import * as THREE from "three";

/**
 * Separable Max-Filter (Dilation) pre-pass for Spotlight EXR pinpoints.
 *
 * Runs two passes (horizontal then vertical) into half-float render targets
 * to dilate tiny pinpoint lights by `radius` pixels while preserving their
 * maximum peak HDR radiance (unlike mip blur which dims energy).
 */
export class SpotDilator {
  constructor(renderer) {
    this.renderer = renderer;
    this.rtA = null;
    this.rtB = null;
    this.currentWidth = 0;
    this.currentHeight = 0;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const vertexShader = /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `;

    const fragmentShader = /* glsl */ `
      precision highp float;
      uniform sampler2D src;
      uniform vec2 texel;
      uniform vec2 axis;
      uniform float radius;
      varying vec2 vUv;

      void main() {
        float m = 0.0;
        int r = int(clamp(radius, 0.0, 32.0));
        for (int i = -32; i <= 32; i++) {
          if (abs(i) > r) continue;
          vec2 offset = axis * texel * float(i);
          m = max(m, texture2D(src, vUv + offset).r);
        }
        gl_FragColor = vec4(m, 0.0, 0.0, 1.0);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        src: { value: null },
        texel: { value: new THREE.Vector2() },
        axis: { value: new THREE.Vector2() },
        radius: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene.add(quad);
  }

  ensureRenderTargets(width, height) {
    const maxDim = this.renderer?.capabilities?.maxTextureSize || 4096;
    const targetW = Math.min(width, maxDim);
    const targetH = Math.min(height, maxDim);

    if (
      this.rtA &&
      this.rtB &&
      this.currentWidth === targetW &&
      this.currentHeight === targetH
    ) {
      return;
    }

    this.disposeRenderTargets();

    this.currentWidth = targetW;
    this.currentHeight = targetH;

    const optionsA = {
      type: THREE.HalfFloatType,
      format: THREE.RedFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      generateMipmaps: false,
      depthBuffer: false,
      stencilBuffer: false,
    };

    const optionsB = {
      type: THREE.HalfFloatType,
      format: THREE.RedFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      generateMipmaps: false,
      depthBuffer: false,
      stencilBuffer: false,
    };

    this.rtA = new THREE.WebGLRenderTarget(targetW, targetH, optionsA);
    this.rtB = new THREE.WebGLRenderTarget(targetW, targetH, optionsB);
  }

  /**
   * Dilates sourceTexture by radius pixels.
   * If radius <= 0 or sourceTexture is missing, returns sourceTexture directly.
   *
   * @param {THREE.Texture} sourceTexture
   * @param {number} radius - Dilation radius in pixels (0 to 6)
   * @returns {THREE.Texture}
   */
  dilate(sourceTexture, radius = 0) {
    if (!sourceTexture || radius <= 0 || !this.renderer) {
      return sourceTexture;
    }

    const width = sourceTexture.image?.width || 2048;
    const height = sourceTexture.image?.height || 1024;
    this.ensureRenderTargets(width, height);

    const oldRenderTarget = this.renderer.getRenderTarget();
    const oldAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;

    // Pass 1: Horizontal Dilation (src -> rtA)
    this.material.uniforms.src.value = sourceTexture;
    this.material.uniforms.texel.value.set(1.0 / this.currentWidth, 1.0 / this.currentHeight);
    this.material.uniforms.axis.value.set(1.0, 0.0);
    this.material.uniforms.radius.value = radius;

    this.renderer.setRenderTarget(this.rtA);
    this.renderer.render(this.scene, this.camera);

    // Pass 2: Vertical Dilation (rtA.texture -> rtB)
    this.material.uniforms.src.value = this.rtA.texture;
    this.material.uniforms.axis.value.set(0.0, 1.0);

    this.renderer.setRenderTarget(this.rtB);
    this.renderer.render(this.scene, this.camera);

    this.renderer.setRenderTarget(oldRenderTarget);
    this.renderer.autoClear = oldAutoClear;

    return this.rtB.texture;
  }

  disposeRenderTargets() {
    if (this.rtA) {
      this.rtA.dispose();
      this.rtA = null;
    }
    if (this.rtB) {
      this.rtB.dispose();
      this.rtB = null;
    }
  }

  dispose() {
    this.disposeRenderTargets();
    if (this.material) {
      this.material.dispose();
    }
  }
}

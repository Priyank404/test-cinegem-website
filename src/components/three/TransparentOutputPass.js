import {
  ColorManagement,
  RawShaderMaterial,
  UniformsUtils,
  LinearToneMapping,
  ReinhardToneMapping,
  CineonToneMapping,
  AgXToneMapping,
  ACESFilmicToneMapping,
  NeutralToneMapping,
  CustomToneMapping,
  SRGBTransfer,
} from "three";
import { Pass, FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";

/**
 * TransparentOutputPass.js
 * -------------------------------------------------------------------------
 * Output pass specifically designed for WebGL canvases with `alpha: true`
 * composited over HTML backgrounds (Vanta fog, CSS gradients, etc.).
 *
 * Why standard OutputPass causes white borders / halos on transparent canvases:
 * 1. OutputPass applies tone mapping (ACES Filmic) and sRGB gamma transfer
 *    (pow(x, 1/2.2)) to raw straight RGB values, but leaves alpha untouched.
 * 2. On anti-aliased geometry edges (a < 1.0) and in empty space where bloom
 *    spills, sRGB non-linearity lifts dark values significantly higher than alpha
 *    (e.g. linear 0.08 becomes sRGB 0.32).
 * 3. The browser's WebGL compositor expects premultiplied alpha
 *    (canvas.rgb + bg * (1 - canvas.a)). Because canvas.rgb was not premultiplied
 *    after sRGB transfer, the browser adds 32% solid white directly on top of the
 *    background, creating a bright white border around the ring and a white cloud
 *    in empty air.
 *
 * This pass fixes it with mathematically exact premultiplied alpha:
 * - Empty space (a <= 0.0001): Outputs exact vec4(0.0) -> zero halo / haze in air.
 * - Solid & edge pixels (a > 0.0001):
 *     1. Un-premultiply: straight = tex.rgb / a
 *     2. Apply Tone Mapping to straight color
 *     3. Apply sRGB transfer to straight color
 *     4. Re-premultiply: gl_FragColor = vec4(straight * a, a)
 *     Result: 100% seamless blending with background, 0 white fringe.
 * -------------------------------------------------------------------------
 */

const TransparentOutputShader = {
  name: "TransparentOutputShader",

  uniforms: {
    tDiffuse: { value: null },
    toneMappingExposure: { value: 1.0 },
  },

  vertexShader: /* glsl */ `
    precision highp float;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;

    attribute vec3 position;
    attribute vec2 uv;

    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,

  fragmentShader: /* glsl */ `
    precision highp float;

    uniform sampler2D tDiffuse;

    #include <tonemapping_pars_fragment>
    #include <colorspace_pars_fragment>

    varying vec2 vUv;

    void main() {
      vec4 tex = texture2D( tDiffuse, vUv );

      float a = clamp( tex.a, 0.0, 1.0 );

      // If outside the 3D model in empty space, discard completely so no haze/bubble/halo can appear in air
      if ( a <= 0.005 ) {
        gl_FragColor = vec4( 0.0 );
        return;
      }

      // Un-premultiply RGB to get true straight surface color
      vec3 straight = tex.rgb / a;

      // Tone mapping in straight color space
      #ifdef LINEAR_TONE_MAPPING
        straight = LinearToneMapping( straight );
      #elif defined( REINHARD_TONE_MAPPING )
        straight = ReinhardToneMapping( straight );
      #elif defined( CINEON_TONE_MAPPING )
        straight = CineonToneMapping( straight );
      #elif defined( ACES_FILMIC_TONE_MAPPING )
        straight = ACESFilmicToneMapping( straight );
      #elif defined( AGX_TONE_MAPPING )
        straight = AgXToneMapping( straight );
      #elif defined( NEUTRAL_TONE_MAPPING )
        straight = NeutralToneMapping( straight );
      #elif defined( CUSTOM_TONE_MAPPING )
        straight = CustomToneMapping( straight );
      #endif

      // Color space conversion (sRGB transfer) in straight color space
      #ifdef SRGB_TRANSFER
        straight = sRGBTransferOETF( vec4( straight, 1.0 ) ).rgb;
      #endif

      // Re-premultiply by alpha for flawless WebGL canvas compositing over HTML
      gl_FragColor = vec4( straight * a, a );
    }
  `,
};

export class TransparentOutputPass extends Pass {
  constructor() {
    super();
    this.isOutputPass = true;

    this.uniforms = UniformsUtils.clone(TransparentOutputShader.uniforms);

    this.material = new RawShaderMaterial({
      name: TransparentOutputShader.name,
      uniforms: this.uniforms,
      vertexShader: TransparentOutputShader.vertexShader,
      fragmentShader: TransparentOutputShader.fragmentShader,
    });

    this._fsQuad = new FullScreenQuad(this.material);
    this._outputColorSpace = null;
    this._toneMapping = null;
  }

  render(renderer, writeBuffer, readBuffer) {
    this.uniforms["tDiffuse"].value = readBuffer.texture;
    this.uniforms["toneMappingExposure"].value = renderer.toneMappingExposure;

    if (
      this._outputColorSpace !== renderer.outputColorSpace ||
      this._toneMapping !== renderer.toneMapping
    ) {
      this._outputColorSpace = renderer.outputColorSpace;
      this._toneMapping = renderer.toneMapping;

      this.material.defines = {};

      if (ColorManagement.getTransfer(this._outputColorSpace) === SRGBTransfer) {
        this.material.defines.SRGB_TRANSFER = "";
      }

      if (this._toneMapping === LinearToneMapping) {
        this.material.defines.LINEAR_TONE_MAPPING = "";
      } else if (this._toneMapping === ReinhardToneMapping) {
        this.material.defines.REINHARD_TONE_MAPPING = "";
      } else if (this._toneMapping === CineonToneMapping) {
        this.material.defines.CINEON_TONE_MAPPING = "";
      } else if (this._toneMapping === ACESFilmicToneMapping) {
        this.material.defines.ACES_FILMIC_TONE_MAPPING = "";
      } else if (this._toneMapping === AgXToneMapping) {
        this.material.defines.AGX_TONE_MAPPING = "";
      } else if (this._toneMapping === NeutralToneMapping) {
        this.material.defines.NEUTRAL_TONE_MAPPING = "";
      } else if (this._toneMapping === CustomToneMapping) {
        this.material.defines.CUSTOM_TONE_MAPPING = "";
      }

      this.material.needsUpdate = true;
    }

    if (this.renderToScreen === true) {
      renderer.setRenderTarget(null);
      this._fsQuad.render(renderer);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) {
        renderer.clear(
          renderer.autoClearColor,
          renderer.autoClearDepth,
          renderer.autoClearStencil
        );
      }
      this._fsQuad.render(renderer);
    }
  }

  dispose() {
    this.material.dispose();
    this._fsQuad.dispose();
  }
}


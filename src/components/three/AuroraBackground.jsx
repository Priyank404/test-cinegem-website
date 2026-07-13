/**
 * AuroraBackground.jsx
 * -------------------------------------------------------------------------
 * Flowing aurora-borealis shader plane, built to plug directly into
 * BeatBackground.jsx's BEAT_SCENES registry:
 *
 *   makeAuroraBackground({ ... }) -> { init(THREE) -> { scene, update, dispose } }
 *
 * Same contract as makeParticleField / makeGradientPlane in that file, so
 * it slots into any BEAT_SCENES[i] entry as a drop-in replacement. It does
 * NOT create its own renderer/canvas — BeatBackground owns the two
 * crossfading THREE.WebGLRenderer instances and just calls this scene's
 * update(t, dt, pointer) every frame and renders its `scene`.
 *
 * The look: 2-3 soft vertical noise bands drifting sideways and rippling
 * vertically, colors blended additively over a dark base, brightened
 * where bands overlap — the classic aurora "curtain" feel — driven by a
 * cheap analytic value-noise (no texture lookups needed).
 * -------------------------------------------------------------------------
 */

const DEFAULT_COLORS = {
  colorA: 0x2effa3, // green
  colorB: 0x4d7cff, // blue
  colorC: 0xb06bff, // violet accent
};

export function makeAuroraBackground({
  colorA = DEFAULT_COLORS.colorA,
  colorB = DEFAULT_COLORS.colorB,
  colorC = DEFAULT_COLORS.colorC,
  baseColor = 0x05070c,
  intensity = 1.1,
  speed = 0.5,
} = {}) {
  return {
    init(THREE) {
      const geo = new THREE.PlaneGeometry(24, 24, 1, 1);
      const mat = new THREE.ShaderMaterial({
        transparent: false,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uColorA: { value: new THREE.Color(colorA) },
          uColorB: { value: new THREE.Color(colorB) },
          uColorC: { value: new THREE.Color(colorC) },
          uBase: { value: new THREE.Color(baseColor) },
          uIntensity: { value: intensity },
          uSpeed: { value: speed },
          uPointer: { value: new THREE.Vector2(0, 0) },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          uniform vec3 uColorC;
          uniform vec3 uBase;
          uniform float uIntensity;
          uniform float uSpeed;
          uniform vec2 uPointer;
          varying vec2 vUv;

          // cheap 2D value noise (no texture lookups)
          float hash(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
          }
          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
          }
          float fbm(vec2 p) {
            float v = 0.0;
            float amp = 0.5;
            for (int i = 0; i < 4; i++) {
              v += amp * noise(p);
              p *= 2.02;
              amp *= 0.55;
            }
            return v;
          }

          // one drifting aurora "curtain" band, returns 0..1 brightness
          float band(vec2 uv, float t, float yCenter, float freq, float speedMul, vec2 pointer) {
            float flow = fbm(vec2(uv.x * freq + t * speedMul, t * 0.15));
            float sway = sin(uv.x * 3.14159 * 1.5 + t * 0.3) * 0.08;
            float py = yCenter + sway + pointer.y * 0.05;
            float dist = abs(uv.y - py - (flow - 0.5) * 0.35);
            float core = smoothstep(0.28, 0.0, dist);
            return core;
          }

          void main() {
            vec2 uv = vUv;
            float t = uTime * uSpeed;

            float b1 = band(uv, t, 0.62, 1.6, 0.12, uPointer);
            float b2 = band(uv, t + 12.3, 0.48, 2.1, -0.09, uPointer);
            float b3 = band(uv, t + 37.1, 0.72, 1.1, 0.06, uPointer);

            vec3 col = uBase;
            col += uColorA * b1 * uIntensity;
            col += uColorB * b2 * uIntensity * 0.85;
            col += uColorC * b3 * uIntensity * 0.6;

            // gentle vertical falloff so it reads as hanging light, not a full block
            float vign = smoothstep(1.0, 0.15, uv.y) * smoothstep(0.0, 0.35, uv.y);
            col = mix(uBase, col, 0.6 + 0.4 * vign);

            // faint background stars/noise for depth
            float grain = hash(uv * 800.0 + t) * 0.02;
            col += grain;

            gl_FragColor = vec4(col, 1.0);
          }
        `,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.z = -8;
      const scene = new THREE.Scene();
      scene.add(mesh);

      return {
        scene,
        update(t, dt, pointer) {
          mat.uniforms.uTime.value = t;
          if (pointer) {
            mat.uniforms.uPointer.value.set(pointer.x, pointer.y);
          }
        },
        dispose() {
          geo.dispose();
          mat.dispose();
        },
      };
    },
  };
}

export default makeAuroraBackground;

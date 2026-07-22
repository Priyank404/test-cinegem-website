/**
 * BeatBackground.jsx
 * -------------------------------------------------------------------------
 * Fixed, full-viewport Three.js canvas that sits BEHIND the ring canvas
 * (RingHero) but in FRONT of the plain gradient overlay:
 *
 *   z-index 0   gradient overlay (bgOverlayRef, in RingHero.jsx)
 *   z-index 1   <-- this component
 *   z-index 2   ring canvas (RingHero.jsx)
 *
 * Renders one small interactive scene per beat (see BEAT_SCENES below) and
 * crossfades between the current and next scene using the exact same
 * scroll-scrubbed weight that drives RingHero's gradient tween — RingHero
 * calls onBeatBlendUpdate({ fromIndex, toIndex, weight }) every frame of
 * its GSAP timeline, and HeroPage2 forwards that straight into this
 * component's setBlend() ref API. No separate ScrollTrigger, no drift
 * between the ring's beat and the background's beat.
 *
 * Each beat scene is a plain object describing how to build/update/dispose
 * a small Three.js scene:
 *
 *   {
 *     init(THREE)               -> { scene, update(t, dt), dispose() }
 *   }
 *
 * init() is called once per scene the first time it's needed (lazy), and
 * cached — scrolling back and forth doesn't rebuild geometry. update(t, dt)
 * runs every animation frame with elapsed seconds and delta seconds, so
 * scenes can animate/react independently of scroll (e.g. drifting
 * particles) as well as react to pointer position via
 * BeatBackground's own mousemove listener (see pointerRef below, passed
 * into update as a 3rd arg: update(t, dt, pointerNDC)).
 *
 * To design beat N's background: edit BEAT_SCENES[N] below. Nothing else
 * in this file needs to change to add/replace a scene.
 * -------------------------------------------------------------------------
 */

import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import * as THREE from "three";

// ---------------------------------------------------------------------
// Per-beat scene registry. Index must match BEATS[] in RingHero.jsx.
// Each is a *placeholder* built from cheap primitives (points, a shader
// plane) so every beat has something distinct to look at immediately —
// swap the internals of any entry for your real design later without
// touching the blend/render plumbing above.
// ---------------------------------------------------------------------

function makeParticleField({
  count = 400,
  color = 0x9aa4ff,
  radius = 6,
  size = 0.03,
}) {
  return {
    init() {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const speeds = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const r = radius * (0.3 + 0.7 * Math.random());
        const theta = Math.random() * Math.PI * 2;
        const y = (Math.random() - 0.5) * radius;
        positions[i * 3] = Math.cos(theta) * r;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = Math.sin(theta) * r - 4;
        speeds[i] = 0.05 + Math.random() * 0.15;
      }
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color,
        size,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const points = new THREE.Points(geo, mat);
      const scene = new THREE.Scene();
      scene.add(points);

      return {
        scene,
        update(t, dt, pointer) {
          points.rotation.y = t * 0.03;
          if (pointer) {
            points.rotation.x = pointer.y * 0.15;
            points.rotation.y += pointer.x * 0.02;
          }
          const pos = geo.attributes.position;
          for (let i = 0; i < count; i++) {
            const idx = i * 3 + 1;
            pos.array[idx] += speeds[i] * dt * 0.2;
            if (pos.array[idx] > radius / 2) pos.array[idx] = -radius / 2;
          }
          pos.needsUpdate = true;
        },
        dispose() {
          geo.dispose();
          mat.dispose();
        },
      };
    },
  };
}

function makeGradientPlane({ colorA = 0x241a12, colorB = 0x3b2417 }) {
  return {
    init() {
      const geo = new THREE.PlaneGeometry(20, 20, 1, 1);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColorA: { value: new THREE.Color(colorA) },
          uColorB: { value: new THREE.Color(colorB) },
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
          uniform vec2 uPointer;
          varying vec2 vUv;
          void main() {
            vec2 uv = vUv - 0.5;
            float d = length(uv - uPointer * 0.3);
            float wave = sin(d * 10.0 - uTime * 0.8) * 0.5 + 0.5;
            vec3 col = mix(uColorA, uColorB, vUv.y + wave * 0.08);
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

// One entry per beat in RingHero.jsx's BEATS array. Add/remove in sync.
const BEAT_SCENES = [
  // Beat 1 — idle ring: calm cool particle drift.
  makeParticleField({ color: 0x8f9bff, count: 350, radius: 6 }),
  // Beat 2 — floor rises: warm shader plane echoing bgTop/bgBottom.
  // (SideRays is layered on top separately in HeroPage2.jsx — it's a
  // DOM/ogl component, not a THREE.Scene, so it can't live in this
  // registry. See SideRaysBeatLayer below HeroPage2's BeatBackground.)
  makeGradientPlane({ colorA: 0x241a12, colorB: 0x3b2417 }),
  // Beat 3 — on-body reveal: tighter, warmer particle field.
  makeParticleField({ color: 0xffd88e, count: 250, radius: 4, size: 0.025 }),
  // Beat 4 — demerge into cards: slightly wider cool particles.
  makeParticleField({ color: 0x8ecbff, count: 300, radius: 7 }),
  // Beat 5 — standing spin, closing beat: warm shader plane.
  makeGradientPlane({ colorA: 0x101014, colorB: 0x000000 }),
];

// Two stacked canvases ("from" and "to"), each its own WebGLRenderer.
// Crossfading two GPU-rendered layers with a single renderer would need
// an extra render-target pass; two real canvases + CSS opacity is
// cheaper and keeps each beat scene a plain, independent THREE.Scene.
const BeatBackground = forwardRef(function BeatBackground(_props, ref) {
  const fromCanvasRef = useRef(null);
  const toCanvasRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const blendRef = useRef({ fromIndex: 0, toIndex: 0, weight: 0 });

  // Exposes setBlend() so HeroPage2 can forward RingHero's
  // onBeatBlendUpdate callback straight through without any state/
  // re-render round trip — this updates a plain ref read by the
  // animation loop, same "ref not state" reasoning as ringCalibRef.
  useImperativeHandle(ref, () => ({
    setBlend(next) {
      blendRef.current = next;
    },
  }));

  useEffect(() => {
    const fromCanvas = fromCanvasRef.current;
    const toCanvas = toCanvasRef.current;
    if (!fromCanvas || !toCanvas) return;

    function makeRenderer(canvas) {
      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      return renderer;
    }
    const fromRenderer = makeRenderer(fromCanvas);
    const toRenderer = makeRenderer(toCanvas);

    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    camera.position.z = 2;

    // Lazily-initialized cache — each beat's scene is only built once,
    // the first time it becomes visible (either as "from" or "to").
    const built = new Array(BEAT_SCENES.length).fill(null);
    function getScene(index) {
      // Defensive clamp: BEAT_SCENES has one entry per beat, but the
      // blend info driving `index` comes from RingHero's BEATS array,
      // which can have more/fewer entries than BEAT_SCENES (e.g. an
      // extra closing beat with no background scene of its own) — an
      // out-of-range index here would throw on `.init`, so clamp into
      // BEAT_SCENES' own valid range and just reuse its last scene for
      // anything beyond that.
      const safeIndex = Math.max(0, Math.min(index, BEAT_SCENES.length - 1));
      if (!built[safeIndex]) {
        built[safeIndex] = BEAT_SCENES[safeIndex].init(THREE);
      }
      return built[safeIndex];
    }

    function resize() {
      [fromRenderer, toRenderer].forEach((r) =>
        r.setSize(window.innerWidth, window.innerHeight),
      );
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener("resize", resize);

    function onPointerMove(e) {
      pointerRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -((e.clientY / window.innerHeight) * 2 - 1),
      };
    }
    window.addEventListener("pointermove", onPointerMove);

    const clock = new THREE.Clock();
    let raf = 0;

    function tick() {
      raf = requestAnimationFrame(tick);
      const dt = clock.getDelta();
      const t = clock.elapsedTime;
      const { fromIndex, toIndex, weight } = blendRef.current;

      const from = getScene(fromIndex);
      const to = fromIndex === toIndex ? from : getScene(toIndex);

      from.update(t, dt, pointerRef.current);
      if (to !== from) to.update(t, dt, pointerRef.current);

      fromRenderer.render(from.scene, camera);
      toRenderer.render(to.scene, camera);

      // Crossfade purely via CSS opacity — "from" fades out as weight
      // goes 0->1, "to" fades in. When fromIndex === toIndex (idle, no
      // transition in progress) weight is 0 and "to" stays invisible,
      // so there's no flicker sitting still on a single beat.
      fromCanvas.style.opacity = String(1 - weight);
      toCanvas.style.opacity = String(fromIndex === toIndex ? 0 : weight);
    }
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      built.forEach((s) => s?.dispose());
      fromRenderer.dispose();
      toRenderer.dispose();
    };
  }, []);

  const canvasStyle = {
    position: "fixed",
    inset: 0,
    zIndex: 1,
    width: "100vw",
    height: "100vh",
    display: "block",
    pointerEvents: "none",
  };

  return (
    <>
      <canvas ref={fromCanvasRef} style={canvasStyle} />
      <canvas ref={toCanvasRef} style={canvasStyle} />
    </>
  );
});

export default BeatBackground;

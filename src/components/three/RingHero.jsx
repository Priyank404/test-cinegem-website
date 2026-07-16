/**
 * RingHero.jsx  (v2 — separated metal / gem materials)
 * -------------------------------------------------------------------------
 * Changes from v1:
 *
 *   1. scene.environment is REMOVED entirely. No global HDR fallback.
 *      Every material gets its envMap explicitly, so nothing "leaks"
 *      between metal and gem.
 *
 *   2. Two independent HDR loads: metalHdrUrl and gemHdrUrl. You can point
 *      both at the same file if you want them to match, or use two
 *      completely different HDRs/intensities.
 *
 *   3. Per-mesh material assignment via classifyRingMeshes() (see
 *      classifyMesh.js) — ported from the real classifier your 3D
 *      viewer uses (utils/three.js -> detectType/classifyMeshes), plus
 *      an exact-name override table for this GLB's export codes
 *      (D1, SS = gem; M1, M4, WGR = metal).
 *
 *   4. Materials imported from metalMaterials.js and gemMaterials.js —
 *      ported 1:1 from your Frontend/src/metals and Frontend/src/gems
 *      registries, kept as standalone modules so you can swap presets
 *      independently of the scroll/camera logic in this file.
 *
 * Install:
 *   npm install three gsap three-mesh-bvh
 * -------------------------------------------------------------------------
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { PMREMGenerator } from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { metalPresets, buildMetalMaterial } from "./metalMaterials";
import {
  diamondPreset,
  buildGemMaterial,
  attachBvhToGemMaterial,
} from "./gemMaterials";
import { classifyRingMeshes } from "./classifyMesh";
import {
  computeMetalHdrFactor,
  calculateDiamondEnvMapIntensityRaw,
  degToRad,
} from "./hdrControls";
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  SMAAEffect,
  BloomEffect,
  ToneMappingEffect,
  ToneMappingMode,
  NoiseEffect,
  VignetteEffect,
  DepthOfFieldEffect,
} from "postprocessing";

gsap.registerPlugin(ScrollTrigger);

// Scroll "beats" — camera + rotation. Material intensities live per-material
// below and are tweened separately so gem and metal can react differently.
//
// 6-beat storyboard:
//   1. Idle ring — no change from load.
//   2. Corner park — cinematic camera move (arc + push-in) carries the
//      ring from its idle hero pose down into the bottom-right corner
//      of the frame, where it stays parked, small, for the rest of the
//      beat.
//   3. A plain camera/ring pose beat.
//   4. Another plain camera/ring pose beat (previously the hand/on-body
//      reveal beat — that logic has been removed; this is now a normal
//      pose target like every other beat).
//   5. Ring returns to center — same camera/pose as Beat 1, giving a
//      "return to home" moment before the closing spin.
//   6. Standing spin — single ring, full 360° turn to close.
//
// Every beat is just camPos/ringRot/ringPosOffset/ringScale (plus
// cornerPark for beat 2's special corner move) — no hand or floor
// geometry involved anymore. The dev "beat coordinate" panel drives
// every beat identically via poseOverrideRef, read every tick below.
export const BEATS = [
  {
    // Keyframe at frame 0 (Beat 1 - idle center)
    frame: 0,
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0.00, y: 0.20, z: 4.20, lookAtY: 0.00 },
    ringRot: { x: 1.20, y: -6.30, z: 0.00 },
    metalEnvIntensity: 4.00,
    gemEnvIntensity: 1.20,
    cornerPark: 0.00,
    ringPosOffset: { x: 0.00, y: 0.00, z: 0.00 },
    ringScale: 1.00
  },
  {
    // Keyframe at frame 8.5 (Beat 2 Start - corner park)
    frame: 8.5,
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0.00, y: 0.06, z: 3.48, lookAtY: 0.00 },
    ringRot: { x: 0.30, y: -0.11, z: 0.87 },
    metalEnvIntensity: 8.00,
    gemEnvIntensity: 2.00,
    cornerPark: 1.00,
    ringPosOffset: { x: 1.34, y: -0.14, z: 0.42 },
    ringScale: 0.83
  },
  {
    // Keyframe at frame 18.5 (Beat 2 End - steady corner park)
    frame: 18.5,
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0.00, y: 0.06, z: 3.48, lookAtY: 0.00 },
    ringRot: { x: 0.30, y: -0.11, z: 0.87 },
    metalEnvIntensity: 8.00,
    gemEnvIntensity: 2.00,
    cornerPark: 1.00,
    ringPosOffset: { x: 1.34, y: -0.14, z: 0.42 },
    ringScale: 0.83
  },
  {
    // Keyframe at frame 20 (Beat 3 Start - pose angle)
    frame: 20,
    bgTop: "#241a12",
    bgBottom: "#3b2417",
    camPos: { x: 0.02, y: 0.05, z: 3.99, lookAtY: 0.00 },
    ringRot: { x: 1.80, y: 0.77, z: -1.88 },
    metalEnvIntensity: 6.00,
    gemEnvIntensity: 1.60,
    cornerPark: 0.00,
    ringPosOffset: { x: -1.86, y: -0.75, z: 0.71 },
    ringScale: 1.33
  },
  {
    // Keyframe at frame 30 (Beat 3 End - steady pose angle)
    frame: 30,
    bgTop: "#241a12",
    bgBottom: "#3b2417",
    camPos: { x: 0.02, y: 0.05, z: 3.99, lookAtY: 0.00 },
    ringRot: { x: 1.80, y: 0.77, z: -1.88 },
    metalEnvIntensity: 6.00,
    gemEnvIntensity: 1.60,
    cornerPark: 0.00,
    ringPosOffset: { x: -1.86, y: -0.75, z: 0.71 },
    ringScale: 1.33
  },
  {
    // Keyframe at frame 40 (Beat 4 - alternative pose)
    frame: 40,
    bgTop: "#0c0c0e",
    bgBottom: "#000000",
    camPos: { x: 0.15, y: -0.05, z: 3.00, lookAtY: 0.00 },
    ringRot: { x: 0.35, y: 0.20, z: 0.00 },
    metalEnvIntensity: 6.00,
    gemEnvIntensity: 1.60,
    cornerPark: 0.00,
    ringPosOffset: { x: 0.00, y: 0.00, z: 0.00 },
    ringScale: 1.00
  },
  {
    // Keyframe at frame 50 (Beat 5 - final spin)
    frame: 50,
    bgTop: "#101014",
    bgBottom: "#000000",
    camPos: { x: 0.00, y: 0.00, z: 3.40, lookAtY: 0.00 },
    ringRot: { x: 0.12, y: 6.28, z: 0.00 },
    metalEnvIntensity: 5.00,
    gemEnvIntensity: 1.40,
    cornerPark: 0.00,
    ringPosOffset: { x: 0.00, y: 0.00, z: 0.00 },
    ringScale: 1.00
  }
];

export default function RingHero({
  glbUrl = "/models/ring-draco.glb",
  // NOTE: must point at a file that actually exists in /public/hdr — a
  // 404 here (e.g. the old "/hdr/studio_small.hdr", which doesn't exist
  // in this project) returns an HTML error page that RGBELoader then
  // fails to parse, throwing "Bad File Format: bad initial token" and
  // aborting the whole load before the ring is ever added to the scene.
  metalHdrUrl = "/hdr/env_metal_001_d01c4504e0.hdr",
  gemHdrUrl = "/hdr/env_metal_001_d01c4504e0.hdr", // point at a different, higher-contrast HDR for more "fire" if you want
  metalPreset = metalPresets.yellowGold,
  gemPreset = diamondPreset,
  gemMaterialTypeOverride = null, // "matte" to force the cheap material regardless of preset
  dracoDecoderPath = "/draco/",
  scrollContainerSelector = "#scroll-content",
  onMeshesClassified = null, // (debugList) => void — used by the dev panel

  // Dev-panel HDR controls (see hdrControls.js) — these were previously
  // accepted by HeroPage2 but never actually read here, which is why
  // moving the sliders had zero visible effect. Defaults (100/100/100,
  // 0°) are neutral, same as the production viewer.
  metalHdrRotation = 0,
  metalHdrRotationY = 0,
  metalHdrScale = 100,
  metalHdrPower = 100,
  metalHdrGamma = 100,
  gemHdrRotation = 0,
  gemHdrRotationY = 0,
  gemHdrScale = 100,
  gemHdrPower = 100,
  gemHdrGamma = 100,
  postFxEnabled = true,
  // Cursor-follow depth-of-field — raycasts under the pointer against the
  // ring; whatever the ray hits stays in focus, rest defocuses by
  // distance. Off by default since a hero-scale single ring benefits less
  // from it than a scattered multi-object scene (like the peachweb-style
  // ribbon layout this was ported from) — flip on to try it.
  cursorDofEnabled = false,
  dofFocalLength = 0.35,
  dofBokehScale = 1.4,
  dofFocusLerpSpeed = 4.0,

  // Live pose-override API for the dev "beat coordinate" panel — lets you
  // tune camera position / ring rotation / floor rest height while
  // previewing ANY beat (not just the on-body one), and jump the scroll
  // position straight to a given beat's label. See onPoseOverrideReady
  // below and RingCoordPanel in HeroPage2.jsx.
  onPoseOverrideReady = null,

  // Fires every scroll-scrubbed frame with the current beat-to-beat blend
  // state: { fromIndex, toIndex, weight } where weight is 0 (fully on
  // fromIndex) -> 1 (fully on toIndex). Same source data that drives the
  // gradient's bgState/applyBackground tween below, just exposed outward
  // so a background layer (see BeatBackground.jsx) can crossfade its own
  // per-beat scenes in sync with the ring's scroll position.
  onBeatBlendUpdate = null,

  // Fires every scroll-scrubbed frame with overall page scroll debug info:
  // { progress, beatIndex, beatCount, scrollY, docHeight }. progress is
  // 0->1 across the whole scrollContainerSelector timeline (same value
  // ScrollTrigger tracks internally) — purely a read-out, doesn't affect
  // anything. See ScrollDebugHud.jsx for a ready-made on-screen display.
  onScrollDebugUpdate = null,
}) {
  const canvasRef = useRef(null);
  const bgOverlayRef = useRef(null);
  // Holds the active list of beats (starts with the static exported BEATS array,
  // but can be hot-reloaded dynamically from the parent component)
  const beatsRef = useRef(BEATS);

  // Refs the ticker/apply-config code below read from every frame, plus
  // a "live materials" ref so a separate lightweight effect (below) can
  // push new HDR-config values onto already-built materials without
  // reloading the GLB/HDR.
  const metalMaterialRef = useRef(null);
  const gemMaterialsRef = useRef([]);
  const hdrConfigRef = useRef({
    metalHdrRotation,
    metalHdrRotationY,
    metalHdrScale,
    metalHdrPower,
    metalHdrGamma,
    gemHdrRotation,
    gemHdrRotationY,
    gemHdrScale,
    gemHdrPower,
    gemHdrGamma,
  });

  // Live pose-override state — null fields mean "use the scroll-tweened
  // value as normal"; a non-null field wins over the tween every frame,
  // regardless of which beat is currently active. This is what makes the
  // dev panel work "in all beats": you don't have to scroll-scrub a beat
  // to preview a change, you just flip override on and drag sliders.
  const poseOverrideRef = useRef({
    camPos: null, // { x, y, z } | null
    ringRot: null, // { x, y, z } | null
    ringPosOffset: null, // { x, y, z } | null — added on top of the beat's own ring position
    ringScale: null, // number | null — multiplier on top of the beat's own ring scale
    // Live override for Beat 2's corner-park amount — null means "use
    // the scroll-tweened cornerParkState value as normal" (see
    // cornerParkState below), a number 0..1 pins it regardless of
    // scroll position, same pattern as every other override here.
    cornerPark: null,
  });

  // Saved per-frame keyframes from the "Timeline Editor" panel — keyed by
  // frame number (0..100). A saved keyframe overrides that frame's pose
  // for scroll playback (not just live preview).
  const beatKeyframesRef = useRef({});



  // Keep the ref current and re-apply immediately (this is what actually
  // makes the dev-panel sliders move the render — previously these props
  // were accepted by HeroPage2 but silently dropped by RingHero).
  useEffect(() => {
    hdrConfigRef.current = {
      metalHdrRotation,
      metalHdrRotationY,
      metalHdrScale,
      metalHdrPower,
      metalHdrGamma,
      gemHdrRotation,
      gemHdrRotationY,
      gemHdrScale,
      gemHdrPower,
      gemHdrGamma,
    };
    applyHdrConfigToLiveMaterials();
  }, [
    metalHdrRotation,
    metalHdrRotationY,
    metalHdrScale,
    metalHdrPower,
    metalHdrGamma,
    gemHdrRotation,
    gemHdrRotationY,
    gemHdrScale,
    gemHdrPower,
    gemHdrGamma,
  ]);

  function applyHdrConfigToLiveMaterials() {
    const cfg = hdrConfigRef.current;

    const metalFactor = computeMetalHdrFactor({
      scale: cfg.metalHdrScale,
      power: cfg.metalHdrPower,
      gamma: cfg.metalHdrGamma,
    });
    const metalMat = metalMaterialRef.current;
    if (metalMat) {
      metalMat.userData._hdrTrim = metalFactor;
      if (metalMat.envMapRotation) {
        metalMat.envMapRotation.y = degToRad(cfg.metalHdrRotation);
        metalMat.envMapRotation.x = degToRad(cfg.metalHdrRotationY);
      }
      metalMat.needsUpdate = true;
      // envMapIntensity itself is still driven per-frame by the scroll
      // "beat" ticker (metalEnvState.value) — see setupScrollTimeline()
      // below, which multiplies in userData._hdrTrim.
    }

    // Diamond/gem: production's baseline at neutral defaults (100/100/100)
    // is 5.0x, not 1.0x (see calculateDiamondEnvMapIntensity in the real
    // useThreeScene.js) — this constant is why the stone reads bright and
    // faceted there but flat/dim here at the old hardcoded 1.2.
    const gemIntensity = calculateDiamondEnvMapIntensityRaw({
      scale: cfg.gemHdrScale,
      power: cfg.gemHdrPower,
      gamma: cfg.gemHdrGamma,
    });
    gemMaterialsRef.current.forEach((mat) => {
      if (!mat) return;
      mat.userData = mat.userData || {};
      mat.userData._hdrTrim = gemIntensity / 5.0; // normalized trim, same shape as metal
      if (mat.isRoughRefractionMaterial) {
        mat.envRotation = degToRad(cfg.gemHdrRotation);
        mat.envRotationY = degToRad(cfg.gemHdrRotationY);
      }
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    let renderer, scene, camera, ring;
    let metalMaterial;
    let gemMaterials = []; // one instance per gem mesh — see note above
    let metalEnvMap, gemEnvMap;
    let disposed = false;
    let camState = null;
    let rotState = null;
    let ringPosOffsetState = null;
    let ringScaleState = null;
    let metalEnvState = null;
    let gemEnvState = null;
    let bgState = null;
    let cornerParkState = null;

    // Ring's hero-scene resting transform — captured right after the
    // existing auto-fit logic runs.
    const ringHeroTransform = {
      position: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      scale: 1,
      diameter: 1,
    };

    // Shared last-frame timestamp used by the unified gsap.ticker callback
    // (see currentTickerFn below) for dt-based DOF easing. Declared at
    // effect scope so it survives timeline rebuilds without resetting.
    let lastFrameTime = performance.now();

    // setupScrollTimeline() is re-invoked whenever a beat keyframe is
    // saved/cleared from the dev panel, so the scrub timeline picks up
    // the new target values immediately instead of only on next reload.
    // currentTickerFn tracks the previous gsap.ticker callback so it can
    // be removed before a fresh one is added — otherwise every rebuild
    // would stack another ticker callback on top of the old one.
    let currentTickerFn = null;

    scene = new THREE.Scene();
    // NOTE: no scene.environment assignment here — intentionally removed.
    // Each material below gets its own envMap explicitly.

    camera = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0.2, 4.2);

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // When post-processing is on, ToneMappingEffect in the composer does
    // ACES instead (double tone-mapping would wash things out) — so only
    // set the renderer's own tone mapping for the no-postfx fallback path.
    renderer.toneMapping = postFxEnabled
      ? THREE.NoToneMapping
      : THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Post-processing — vanilla `postprocessing` port of
    // components/JewelryPostFX.jsx (that one is @react-three/postprocessing,
    // R3F-only, so it can't be dropped into this vanilla-Three component
    // directly). Same effect stack: SMAA, mipmap Bloom, ACES Filmic tone
    // mapping, film grain, vignette. This whole block was previously
    // completely absent — the postFxEnabled dev-panel checkbox existed in
    // HeroPage2 but RingHero didn't even accept the prop, let alone build
    // a composer, so toggling it did nothing.
    let composer = null;
    let dofEffect = null;
    function buildComposer() {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));

      const effects = [new SMAAEffect()];

      if (cursorDofEnabled) {
        // Placeholder focus point/distance — overwritten every frame by
        // the raycast in the ticker below, once the ring has loaded.
        // bokehScale/focalLength here are much gentler than the original
        // peachweb-style defaults (bokehScale 3.0, focalLength 0.05) —
        // those were tuned for a wide scene with real depth spread across
        // many objects. On a single ring filling most of the frame at a
        // close camera distance, those same values produced a near-pinhole
        // in-focus circle with everything else slammed out of focus.
        dofEffect = new DepthOfFieldEffect(camera, {
          focusDistance: 0.02,
          focalLength: dofFocalLength,
          bokehScale: dofBokehScale,
          // Wider circle-of-confusion resolution reduces the "chunky"
          // blur look you'd otherwise get at close range on a small object.
          resolutionScale: 1.0,
        });
        // Start fully neutral (no blur at all) until the user clicks —
        // see the activation gate below. Setting bokehScale to 0 up front
        // means the very first rendered frame is already sharp, instead
        // of flashing blurred-then-sharp on activation.
        dofEffect.bokehScale = 0;
        effects.push(dofEffect);
      }

      effects.push(
        new BloomEffect({
          mipmapBlur: true,
          intensity: 0.18,
          luminanceThreshold: 0.9,
          luminanceSmoothing: 0.22,
        }),
        new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }),
        new NoiseEffect({ premultiply: true }),
        new VignetteEffect({ eskil: false, offset: 0.15, darkness: 0.55 }),
      );
      // Noise effect's opacity/blend intensity is a per-effect blendMode
      // property, not a constructor option, in the vanilla API. Index
      // shifts by 1 if DOF was inserted above, so find it by identity
      // rather than a hardcoded index.
      const noiseEffect = effects.find((e) => e instanceof NoiseEffect);
      if (noiseEffect) noiseEffect.blendMode.opacity.value = 0.015;

      composer.addPass(new EffectPass(camera, ...effects));
    }
    if (postFxEnabled) buildComposer();

    // ── Cursor-follow DOF raycasting ────────────────────────────────────
    // Raycasts from the camera through the cursor's NDC position against
    // the ring mesh every frame. Whatever point it hits becomes the DOF
    // focus target — hovering a gem/prong keeps it sharp while the rest
    // of the ring (and background) softly defocuses. If the ring hasn't
    // loaded yet or the ray misses, we hold the last good focus distance
    // instead of snapping the whole scene blurry.
    //
    // Blur is OFF until the user clicks the canvas area — dofEffect is
    // built with bokehScale=0 above, and stays there until dofActivated
    // flips true, then eases up to the real target scale over ~0.4s
    // instead of popping straight to full blur. Previously the blur was
    // live from the very first frame (bokehScale set directly to
    // dofBokehScale at construction), which is why the ring looked
    // blurred everywhere except a small circle around wherever the
    // cursor happened to already be on page load.
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2(0, 0);
    const worldFocusPoint = new THREE.Vector3(0, 0, 0);
    let hasDofHitEver = false;
    let dofActivated = false;
    let dofActivationT = 0; // 0..1 ramp, drives bokehScale ease-in

    function onPointerMove(e) {
      const rect = canvas.getBoundingClientRect();
      pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }
    function onActivationClick(e) {
      if (dofActivated) return;
      const rect = canvas.getBoundingClientRect();
      // Only activate on a click that actually lands within the hero's
      // canvas area — canvas has pointerEvents:"none" so we listen on
      // window, but still bound-check against its rect so a click on the
      // nav bar or scroll content elsewhere on the page doesn't trigger it.
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        return;
      }
      dofActivated = true;
    }
    if (cursorDofEnabled) {
      // pointerEvents is "none" on this canvas (see returned <canvas>
      // style below) so scroll/clicks pass through to the page content —
      // that also means the canvas itself never receives pointer events.
      // Bind to window instead, which still gives correct clientX/Y for
      // the getBoundingClientRect()-relative math above.
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("click", onActivationClick);
    }

    function updateCursorDof(dt) {
      if (!dofEffect || !ring) return;

      // Ease bokehScale toward its real value only after activation —
      // this is what makes the blur fade IN smoothly on click rather than
      // being present from the first frame or popping in instantly.
      const rampTarget = dofActivated ? 1 : 0;
      const rampSpeed = 3.5; // ~0.3–0.4s to fully ease in/out
      dofActivationT +=
        (rampTarget - dofActivationT) * (1 - Math.exp(-rampSpeed * dt));
      dofEffect.bokehScale = dofBokehScale * dofActivationT;

      if (!dofActivated) return; // don't bother raycasting until active

      raycaster.setFromCamera(pointerNDC, camera);
      const hits = raycaster.intersectObject(ring, true);

      if (hits.length > 0) {
        worldFocusPoint.copy(hits[0].point);
        hasDofHitEver = true;
      }
      if (!hasDofHitEver) return;

      // dofEffect.target expects a world-space Vector3 the effect will
      // convert to view-space depth internally — smoothing is done by
      // lerping the point itself (frame-rate independent via dt) rather
      // than a raw distance scalar, so the rack-focus transition eases
      // in 3D instead of snapping.
      if (!dofEffect.target) dofEffect.target = worldFocusPoint.clone();
      const t = 1 - Math.exp(-dofFocusLerpSpeed * dt);
      dofEffect.target.lerp(worldFocusPoint, t);
    }
    // ── End cursor-follow DOF raycasting ─────────────────────────────────

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-4, -1, -3);
    scene.add(fillLight);

    const pmrem = new PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(dracoDecoderPath);

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    const rgbeLoader = new RGBELoader();

    function loadHdr(url) {
      return new Promise((resolve, reject) => {
        rgbeLoader.load(
          url,
          (tex) => {
            // PMREM-process so the refraction shader's textureCubeUV works
            // correctly — same as your viewer's HDR pipeline.
            const envRT = pmrem.fromEquirectangular(tex);
            tex.dispose();
            resolve(envRT.texture);
          },
          undefined,
          (err) => {
            // Almost always means the URL 404'd (server returned an HTML
            // error page instead of binary HDR data) rather than a real
            // parser bug — RGBELoader's "Bad File Format" error is a
            // symptom, not the cause. Naming the URL here saves a trip
            // into the network tab.
            reject(
              new Error(
                `Failed to load HDR at "${url}" — check this file exists under /public${url}. ` +
                  `(Original error: ${err?.message || err})`,
              ),
            );
          },
        );
      });
    }

    Promise.all([
      new Promise((resolve, reject) =>
        gltfLoader.load(glbUrl, resolve, undefined, reject),
      ),
      loadHdr(metalHdrUrl),
      // Skip a second network request if both URLs are identical
      metalHdrUrl === gemHdrUrl ? Promise.resolve(null) : loadHdr(gemHdrUrl),
    ])
      .then(([gltf, loadedMetalEnv, loadedGemEnv]) => {
        if (disposed) return;

        metalEnvMap = loadedMetalEnv;
        gemEnvMap = loadedGemEnv ?? loadedMetalEnv; // reuse metal env if no separate gem HDR given

        metalMaterial = buildMetalMaterial(
          metalPreset,
          metalEnvMap,
          null,
          BEATS[0].metalEnvIntensity,
        );
        metalMaterialRef.current = metalMaterial;

        const effectiveGemPreset = gemMaterialTypeOverride
          ? { ...gemPreset, materialType: gemMaterialTypeOverride }
          : gemPreset;

        ring = gltf.scene;

        // Real classifier ported from your 3D viewer (utils/three.js ->
        // detectType/classifyMeshes), not a plain substring match. Your
        // ring-draco.glb uses export codes (D1, SS, M1, M4, WGR) rather
        // than literal words like "diamond", so this is what actually
        // gets gem vs. metal material onto the right meshes.
        const { gemMeshes, metalMeshes, debugList } = classifyRingMeshes(ring);

        // IMPORTANT: one material instance PER gem mesh, not one shared
        // instance. RoughRefractionMaterial.bvh is a single uniform — a
        // shared material can only ever hold one mesh's BVH at a time,
        // so if D1 (main stone) and SS (side stones) shared one material,
        // whichever mesh was processed last in the loop would silently
        // steal the BVH from the other, and the first mesh would render
        // by ray-tracing against the WRONG geometry (this is what was
        // making the main diamond look flat/gray instead of doing the
        // faceted internal-reflection shading your viewer does). Your
        // own useThreeScene.js avoids this the same way — see the
        // `_cachedGemMat` / `_bvhStruct` per-mesh cache in applyMaterials().
        gemMaterials = gemMeshes.map((child) => {
          const mat = buildGemMaterial(effectiveGemPreset, gemEnvMap);
          if ("envMapIntensity" in mat) {
            // Baseline matches production's calculateDiamondEnvMapIntensity
            // at neutral HDR-panel defaults (100/100/100 -> 5.0x), not a
            // flat 1.2 — that mismatch was making the stone read dim/flat
            // instead of bright and faceted like the real viewer.
            mat.envMapIntensity =
              (BEATS[0].gemEnvIntensity *
                calculateDiamondEnvMapIntensityRaw({})) /
              5.0;
          }
          child.material = mat;
          if (mat.isRoughRefractionMaterial) {
            attachBvhToGemMaterial(child, mat);
          }
          child.castShadow = false;
          child.receiveShadow = false;
          return mat;
        });
        gemMaterialsRef.current = gemMaterials;

        metalMeshes.forEach((child) => {
          child.material = metalMaterial;
          child.castShadow = false;
          child.receiveShadow = false;
        });

        if (import.meta.env.DEV) {
          console.table(debugList);
        }
        onMeshesClassified?.(debugList);

        const box = new THREE.Box3().setFromObject(ring);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.4 / maxDim;
        ring.scale.setScalar(scale);
        ring.position.sub(center.multiplyScalar(scale));

        scene.add(ring);

        ringHeroTransform.position.copy(ring.position);
        ringHeroTransform.rotation.copy(ring.rotation);
        ringHeroTransform.scale = ring.scale.x;
        // Ring's outer diameter (world units, at hero scale) — used later
        // to size it correctly against the hand's actual finger width,
        // instead of guessing an absolute scale that has no relation to
        // either model's real proportions (this was the cause of the
        // ring rendering many times too large on the hand).
        ringHeroTransform.diameter = Math.max(size.x, size.z) * scale;

        // Apply whatever HDR-panel values are already sitting in state
        // (e.g. if the user moved a slider before the async load resolved).
        applyHdrConfigToLiveMaterials();

        setupScrollTimeline();
      })
      .catch((err) => {
        console.error("RingHero: failed to load assets", err);
      });

    function getBaseValuesForFrame(frame) {
      // Find the default beats from the active beats array
      const defaultBeats = beatsRef.current.map((beat, index) => ({
        frame: beat.frame !== undefined ? beat.frame : (index * 20),
        beat
      })).sort((a, b) => a.frame - b.frame);

      // If frame exactly matches a default, return it
      const exact = defaultBeats.find(b => b.frame === frame);
      if (exact) return exact.beat;

      // Find the bounding default frames
      let lower = defaultBeats[0];
      let upper = defaultBeats[defaultBeats.length - 1];
      for (let i = 0; i < defaultBeats.length; i++) {
        if (defaultBeats[i].frame < frame) lower = defaultBeats[i];
        if (defaultBeats[i].frame > frame) {
          upper = defaultBeats[i];
          break;
        }
      }

      if (lower.frame === upper.frame) return lower.beat;

      // Interpolate between lower and upper
      const t = (frame - lower.frame) / (upper.frame - lower.frame);

      // Simple hex color interpolation helper
      const lerpColor = (c1, c2, factor) => {
        const parse = (hex) => {
          const num = parseInt(hex.slice(1), 16);
          return [num >> 16, (num >> 8) & 0xff, num & 0xff];
        };
        const rgb1 = parse(c1);
        const rgb2 = parse(c2);
        const r = Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * factor);
        const g = Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * factor);
        const b = Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * factor);
        const toHex = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      };

      const lerpNum = (n1, n2, factor) => n1 + (n2 - n1) * factor;

      const lerpVec3 = (v1, v2, factor) => ({
        x: lerpNum(v1.x, v2.x, factor),
        y: lerpNum(v1.y, v2.y, factor),
        z: lerpNum(v1.z, v2.z, factor),
        lookAtY: lerpNum(v1.lookAtY ?? 0, v2.lookAtY ?? 0, factor)
      });

      return {
        bgTop: lerpColor(lower.beat.bgTop, upper.beat.bgTop, t),
        bgBottom: lerpColor(lower.beat.bgBottom, upper.beat.bgBottom, t),
        camPos: lerpVec3(lower.beat.camPos, upper.beat.camPos, t),
        ringRot: lerpVec3(lower.beat.ringRot, upper.beat.ringRot, t),
        ringPosOffset: lerpVec3(
          lower.beat.ringPosOffset ?? { x: 0, y: 0, z: 0 },
          upper.beat.ringPosOffset ?? { x: 0, y: 0, z: 0 },
          t
        ),
        ringScale: lerpNum(lower.beat.ringScale ?? 1, upper.beat.ringScale ?? 1, t),
        metalEnvIntensity: lerpNum(lower.beat.metalEnvIntensity, upper.beat.metalEnvIntensity, t),
        gemEnvIntensity: lerpNum(lower.beat.gemEnvIntensity, upper.beat.gemEnvIntensity, t),
        cornerPark: lerpNum(lower.beat.cornerPark ?? 0, upper.beat.cornerPark ?? 0, t),
      };
    }

    function resolveTargetForFrame(frame) {
      const base = getBaseValuesForFrame(frame);
      const kf = beatKeyframesRef.current[frame];
      return {
        ...base,
        camPos: kf?.camPos ?? base.camPos,
        ringRot: kf?.ringRot ?? base.ringRot,
        ringPosOffset: kf?.ringPosOffset ?? base.ringPosOffset ?? { x: 0, y: 0, z: 0 },
        ringScale: kf?.ringScale ?? base.ringScale ?? 1,
      };
    }

    function setupScrollTimeline() {
      console.log("[RingHero] setupScrollTimeline called! Beats count:", beatsRef.current.length, "Keyframes in memory:", Object.keys(beatKeyframesRef.current));
      // Rebuild support: kill any previously-built scroll trigger/ticker
      ScrollTrigger.getAll().forEach((st) => st.kill());
      if (currentTickerFn) {
        gsap.ticker.remove(currentTickerFn);
        currentTickerFn = null;
      }

      // Collect all keyframe frames
      const userFrames = Object.keys(beatKeyframesRef.current).map(Number);
      const defaultFrames = beatsRef.current.map((beat, index) => beat.frame !== undefined ? beat.frame : (index * 20));
      const allFrames = Array.from(new Set([...defaultFrames, ...userFrames])).sort((a, b) => a - b);

      // Reset state objects back to frame 0 targets so GSAP captures the correct start values!
      const baselineTarget = resolveTargetForFrame(0);
      if (camState) {
        camState.x = baselineTarget.camPos.x;
        camState.y = baselineTarget.camPos.y;
        camState.z = baselineTarget.camPos.z;
        camState.lookAtY = baselineTarget.camPos.lookAtY ?? 0;
      }
      if (rotState) {
        rotState.x = baselineTarget.ringRot.x;
        rotState.y = baselineTarget.ringRot.y;
        rotState.z = baselineTarget.ringRot.z;
      }
      if (ringPosOffsetState) {
        ringPosOffsetState.x = baselineTarget.ringPosOffset.x;
        ringPosOffsetState.y = baselineTarget.ringPosOffset.y;
        ringPosOffsetState.z = baselineTarget.ringPosOffset.z;
      }
      if (ringScaleState) ringScaleState.value = baselineTarget.ringScale;
      if (metalEnvState) metalEnvState.value = baselineTarget.metalEnvIntensity;
      if (gemEnvState) gemEnvState.value = baselineTarget.gemEnvIntensity;
      if (bgState) {
        bgState.top = baselineTarget.bgTop;
        bgState.bottom = baselineTarget.bgBottom;
      }
      if (cornerParkState) cornerParkState.value = baselineTarget.cornerPark;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: scrollContainerSelector,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.2,
          onUpdate: (self) => {
            if (!onScrollDebugUpdate) return;
            const progress = self.progress;
            const beatPosition = progress * (beatsRef.current.length - 1);
            const beatIndex = Math.floor(beatPosition);
            const beatFraction = beatPosition - beatIndex;

            onScrollDebugUpdate({
              progress,
              beatIndex,
              beatFraction,
              beatCount: beatsRef.current.length,
              scrollY: window.scrollY,
              docHeight: document.documentElement.scrollHeight,
            });

            if (onBeatBlendUpdate) {
              onBeatBlendUpdate({
                fromIndex: beatIndex,
                toIndex: Math.min(beatIndex + 1, beatsRef.current.length - 1),
                weight: beatFraction,
              });
            }
          },
        },
      });

      // Wire up the "beat coordinate" dev panel
      if (onPoseOverrideReady) {
        onPoseOverrideReady({
          jumpToBeat: (frame) => {
            const st = tl.scrollTrigger;
            if (!st) return;
            const progress = Math.max(0, Math.min(50, frame)) / 50;
            const targetY = st.start + (st.end - st.start) * progress;
            window.scrollTo({ top: targetY, behavior: "smooth" });
          },
          jumpToProgress: (progress, smooth = true) => {
            const st = tl.scrollTrigger;
            if (!st) return;
            const targetY = st.start + (st.end - st.start) * progress;
            window.scrollTo({ top: targetY, behavior: smooth ? "smooth" : "auto" });
          },
          setCamOverride: (partial) => {
            poseOverrideRef.current.camPos = partial
              ? { ...poseOverrideRef.current.camPos, ...partial }
              : null;
          },
          setRingRotOverride: (partial) => {
            poseOverrideRef.current.ringRot = partial
              ? {
                  x: 0,
                  y: 0,
                  z: 0,
                  ...poseOverrideRef.current.ringRot,
                  ...partial,
                }
              : null;
          },
          setRingPosOffsetOverride: (partial) => {
            poseOverrideRef.current.ringPosOffset = partial
              ? { ...poseOverrideRef.current.ringPosOffset, ...partial }
              : null;
          },
          setRingScaleOverride: (value) => {
            poseOverrideRef.current.ringScale = value ?? null;
          },
          reloadRingModel: (newBeats) => {
            console.log("[RingHero] API reloadRingModel called!");
            
            // 1. If there's an existing ring model in the scene, remove and dispose it
            if (ring) {
              scene.remove(ring);
              ring.traverse((obj) => {
                if (obj.geometry) obj.geometry.dispose();
              });
              gemMaterials.forEach((mat) => mat?.dispose?.());
              gemMaterials = [];
              ring = null;
            }

            // 2. Load the GLB model again
            gltfLoader.load(glbUrl, (gltf) => {
              if (disposed) return;
              
              // 3. Process the new GLTF scene
              ring = gltf.scene;

              const effectiveGemPreset = gemMaterialTypeOverride
                ? { ...gemPreset, materialType: gemMaterialTypeOverride }
                : gemPreset;

              const { gemMeshes, metalMeshes, debugList } = classifyRingMeshes(ring);

              gemMaterials = gemMeshes.map((child) => {
                const mat = buildGemMaterial(effectiveGemPreset, gemEnvMap);
                if ("envMapIntensity" in mat) {
                  mat.envMapIntensity =
                    (beatsRef.current[0].gemEnvIntensity *
                      calculateDiamondEnvMapIntensityRaw({})) /
                    5.0;
                }
                child.material = mat;
                if (mat.isRoughRefractionMaterial) {
                  attachBvhToGemMaterial(child, mat);
                }
                child.castShadow = false;
                child.receiveShadow = false;
                return mat;
              });
              gemMaterialsRef.current = gemMaterials;

              metalMeshes.forEach((child) => {
                child.material = metalMaterial;
                child.castShadow = false;
                child.receiveShadow = false;
              });

              if (import.meta.env.DEV) {
                console.table(debugList);
              }
              onMeshesClassified?.(debugList);

              const box = new THREE.Box3().setFromObject(ring);
              const size = box.getSize(new THREE.Vector3());
              const center = box.getCenter(new THREE.Vector3());
              const maxDim = Math.max(size.x, size.y, size.z);
              const scale = 1.4 / maxDim;
              ring.scale.setScalar(scale);
              ring.position.sub(center.multiplyScalar(scale));

              scene.add(ring);

              ringHeroTransform.position.copy(ring.position);
              ringHeroTransform.rotation.copy(ring.rotation);
              ringHeroTransform.scale = ring.scale.x;
              ringHeroTransform.diameter = Math.max(size.x, size.z) * scale;

              applyHdrConfigToLiveMaterials();

              // 4. Update the beats array and rebuild the GSAP timeline
              if (newBeats) {
                beatsRef.current = newBeats;
              }
              setupScrollTimeline();
              
              console.log("[RingHero] reloadRingModel finished! Ring reloaded successfully.");
            }, undefined, (err) => {
              console.error("[RingHero] failed to reload GLB:", err);
            });
          },
          getCurrentPose: () => ({
            camPos: { ...camState },
            ringRot: { ...rotState },
            ringPosOffset: { ...ringPosOffsetState },
            ringScale: ringScaleState.value,
          }),
          saveKeyframe: (frame, data) => {
            beatKeyframesRef.current[frame] = data;
            setupScrollTimeline();
          },
          clearKeyframe: (frame) => {
            delete beatKeyframesRef.current[frame];
            setupScrollTimeline();
          },
          moveKeyframe: (oldFrame, newFrame) => {
            if (oldFrame === newFrame) return;
            const data = beatKeyframesRef.current[oldFrame];
            if (data) {
              delete beatKeyframesRef.current[oldFrame];
              beatKeyframesRef.current[newFrame] = data;
            }
            setupScrollTimeline();
          },
          getKeyframeSnapshot: () => ({ ...beatKeyframesRef.current }),
          getBaseValuesForFrame: (frame) => getBaseValuesForFrame(frame),
          getFullTimeline: () => {
            const userFramesList = Object.keys(beatKeyframesRef.current).map(Number);
            const defaultFrames = beatsRef.current.map((beat, index) => beat.frame !== undefined ? beat.frame : (index * 20));
            const allFramesList = Array.from(new Set([...defaultFrames, ...userFramesList])).sort((a, b) => a - b);
            return allFramesList.map(f => {
              const target = resolveTargetForFrame(f);
              return {
                frame: f,
                bgTop: target.bgTop,
                bgBottom: target.bgBottom,
                camPos: target.camPos,
                ringRot: target.ringRot,
                ringPosOffset: target.ringPosOffset,
                ringScale: target.ringScale,
                metalEnvIntensity: target.metalEnvIntensity,
                gemEnvIntensity: target.gemEnvIntensity,
                cornerPark: target.cornerPark,
              };
            });
          },
          setCornerParkOverride: (value) => {
            poseOverrideRef.current.cornerPark = value;
          },
        });
      }

      const initTarget = resolveTargetForFrame(0);
      camState = { ...initTarget.camPos };
      rotState = { ...initTarget.ringRot };
      ringPosOffsetState = { ...initTarget.ringPosOffset };
      ringScaleState = { value: initTarget.ringScale };
      metalEnvState = { value: initTarget.metalEnvIntensity };
      gemEnvState = { value: initTarget.gemEnvIntensity };
      bgState = { top: initTarget.bgTop, bottom: initTarget.bgBottom };
      cornerParkState = { value: initTarget.cornerPark };

      // Build timelines
      for (let i = 1; i < allFrames.length; i++) {
        const prevFrame = allFrames[i - 1];
        const currFrame = allFrames[i];
        const duration = currFrame - prevFrame;
        const prevTarget = resolveTargetForFrame(prevFrame);
        const currTarget = resolveTargetForFrame(currFrame);

        tl.fromTo(camState, {
          x: prevTarget.camPos.x,
          y: prevTarget.camPos.y,
          z: prevTarget.camPos.z,
          lookAtY: prevTarget.camPos.lookAtY ?? 0,
        }, {
          x: currTarget.camPos.x,
          y: currTarget.camPos.y,
          z: currTarget.camPos.z,
          lookAtY: currTarget.camPos.lookAtY ?? 0,
          duration: duration,
          ease: "power1.inOut",
        }, prevFrame)
        .fromTo(rotState, {
          x: prevTarget.ringRot.x,
          y: prevTarget.ringRot.y,
          z: prevTarget.ringRot.z,
        }, {
          x: currTarget.ringRot.x,
          y: currTarget.ringRot.y,
          z: currTarget.ringRot.z,
          duration: duration,
          ease: "power1.inOut",
        }, prevFrame)
        .fromTo(ringPosOffsetState, {
          x: prevTarget.ringPosOffset.x,
          y: prevTarget.ringPosOffset.y,
          z: prevTarget.ringPosOffset.z,
        }, {
          x: currTarget.ringPosOffset.x,
          y: currTarget.ringPosOffset.y,
          z: currTarget.ringPosOffset.z,
          duration: duration,
          ease: "power1.inOut",
        }, prevFrame)
        .fromTo(ringScaleState, {
          value: prevTarget.ringScale,
        }, {
          value: currTarget.ringScale,
          duration: duration,
          ease: "power1.inOut",
        }, prevFrame)
        .fromTo(metalEnvState, {
          value: prevTarget.metalEnvIntensity,
        }, {
          value: currTarget.metalEnvIntensity,
          duration: duration,
          ease: "power1.inOut",
        }, prevFrame)
        .fromTo(gemEnvState, {
          value: prevTarget.gemEnvIntensity,
        }, {
          value: currTarget.gemEnvIntensity,
          duration: duration,
          ease: "power1.inOut",
        }, prevFrame)
        .fromTo(cornerParkState, {
          value: prevTarget.cornerPark ?? 0,
        }, {
          value: currTarget.cornerPark ?? 0,
          duration: duration,
          ease: "power1.inOut",
        }, prevFrame)
        .fromTo(bgState, {
          top: prevTarget.bgTop,
          bottom: prevTarget.bgBottom,
        }, {
          top: currTarget.bgTop,
          bottom: currTarget.bgBottom,
          duration: duration,
          ease: "power1.inOut",
          onUpdate: applyBackground,
        }, prevFrame);
      }

      function applyBackground() {
        if (bgOverlayRef.current) {
          bgOverlayRef.current.style.background = `linear-gradient(180deg, ${bgState.top} 0%, ${bgState.bottom} 100%)`;
        }
      }

      // ── Unified gsap.ticker callback ─────────────────────────────────
      // Previously this file ran TWO separate loops: a requestAnimationFrame
      // loop for THREE.js rendering (animate()), and a gsap.ticker callback
      // (currentTickerFn) to write the scroll-tweened pose. They were not
      // guaranteed to fire in the same order every frame — occasionally the
      // rAF render could execute BEFORE gsap.ticker had written the new pose,
      // showing one frame of the stale position. That one-frame lag is
      // exactly what looks like a "jump". Merging both into the SAME
      // gsap.ticker callback guarantees: pose write → THREE.js render,
      // atomically, every frame. The rAF loop is removed entirely.
      currentTickerFn = () => {
        if (disposed) return;

        // ── Delta time for frame-rate-independent DOF easing ─────────────
        const now = performance.now();
        const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
        lastFrameTime = now;

        // Live dev-panel overrides win over the scroll-tweened values,
        // regardless of which beat is currently active — this is what
        // lets you tune a beat's numbers without scrubbing to it first.
        const ov = poseOverrideRef.current;
        const effCamX = ov.camPos?.x ?? camState.x;
        const effCamY = ov.camPos?.y ?? camState.y;
        const effCamZ = ov.camPos?.z ?? camState.z;
        const effRotX = ov.ringRot?.x ?? rotState.x;
        const effRotY = ov.ringRot?.y ?? rotState.y;
        const effRotZ = ov.ringRot?.z ?? rotState.z ?? 0;
        const effPosOffsetX = ov.ringPosOffset?.x ?? ringPosOffsetState.x;
        const effPosOffsetY = ov.ringPosOffset?.y ?? ringPosOffsetState.y;
        const effPosOffsetZ = ov.ringPosOffset?.z ?? ringPosOffsetState.z;
        const effScale = ov.ringScale ?? ringScaleState.value;

        // Corner-park camera move — an arc (not a straight interpolation)
        // across the Beat 1 -> Beat 2 transition, so the camera itself
        // feels like it's "moving through" the shot rather than just
        // holding still while the ring slides into the corner. Driven
        // by cornerParkState (0..1, eased across the whole beat).
        const cpOv = ov.cornerPark;
        const cp = cpOv ?? cornerParkState.value;
        const cpz = Math.max(0, cp * 1.6 - 0.6);
        // Arc shape: sin(pi * cp) is 0 at cp=0 and cp=1, peaking at
        // cp=0.5 — used to bow the camera path up/left mid-flight
        // instead of tracking the ring in a straight line, which is
        // what makes this read as a deliberate camera pan rather than a
        // static shot with a moving subject.
        const arc = Math.sin(Math.PI * Math.min(cp, 1));
        const camArcX = -0.35 * arc; // swings left mid-move
        const camArcY = 0.18 * arc; // lifts slightly mid-move
        // Slow dolly-in that tracks cp directly (not the arc), plus the
        // fast extra push from cpz right at the end. Kept lighter than
        // before now that the ring itself parks at a larger, clearly-
        // visible scale (see parkScale below) — stacking a strong dolly
        // on top of that would push it too close/large in the corner.
        const camDollyZ = -0.3 * cp - 0.2 * cpz;

        if (camera) {
          camera.position.set(
            effCamX + camArcX,
            effCamY + camArcY,
            effCamZ + camDollyZ,
          );
          // lookAtY lets a beat frame the scene lower/higher on screen
          // WITHOUT steepening the camera's pitch — raising camPos.y alone
          // while always looking at world origin (0,0,0) tilts the camera
          // sharply downward (bad top-down angle on the floor). Panning
          // the lookAt target down by roughly the same amount as camPos.y
          // keeps a shallow, natural viewing angle while still pushing the
          // ring+floor lower in the frame. Defaults to 0 (old behavior)
          // when a beat doesn't specify one.
          const effLookAtY = ov.camPos?.lookAtY ?? camState.lookAtY ?? 0;
          // Look-at target drifts slightly toward the corner as the ring
          // parks there, so the camera settles on the parked ring instead
          // of continuing to stare at empty world-origin space.
          camera.lookAt(0.55 * cp, effLookAtY - 0.3 * cp, 0);
        }

        if (metalMaterial) {
          const trim = metalMaterial.userData?._hdrTrim ?? 1;
          metalMaterial.envMapIntensity = metalEnvState.value * trim;
        }
        gemMaterials.forEach((mat) => {
          if (!("envMapIntensity" in mat)) return;
          const trim = mat.userData?._hdrTrim ?? 1;
          mat.envMapIntensity = gemEnvState.value * trim;
        });

        if (ring) {
          // Ring pose — driven purely by camPos/ringRot/ringPosOffset/
          // ringScale (scroll-tweened, or the live dev-panel override
          // above), the same way in every beat. No hand/floor branching:
          // this is what makes the beat coordinate panel actually affect
          // the ring in every beat, including what used to be the
          // on-body reveal beat.
          ring.rotation.set(effRotX, effRotY, effRotZ);

          // Corner-park blend — same cp/arc values computed above for
          // the camera, reused here so the ring's own path bows through
          // the same mid-flight arc the camera is panning through
          // (rather than the two moving independently, which reads as
          // uncoordinated). At cp=0 this is a pure no-op on position/
          // scale, so every other beat is unaffected.
          const heroX = ringHeroTransform.position.x + effPosOffsetX;
          const heroY = ringHeroTransform.position.y + effPosOffsetY;
          const heroZ = ringHeroTransform.position.z + effPosOffsetZ;
          if (cp > 0.0001) {
            // Bottom-right corner target, in the same world space the
            // hero pose lives in. Pushed further right/down than before
            // so it reads as sitting IN the corner (clearly visible,
            // not a tiny tucked-away accent) — kept modest on Z so the
            // ring doesn't clip through the camera at close cp values
            // along the arc.
            // Pulled back further still, and less "down" than before —
            // per the red/blue annotation the band needs room to sweep
            // toward the right edge rather than being crammed low into
            // the very corner.
            const cornerX = heroX + 0.7;
            const cornerY = heroY - 0.6;
            const cornerZ = heroZ + 0.25;
            // Mid-flight bow: nudge the path up and slightly left of a
            // straight line between hero and corner, using the same
            // sin(pi*cp) arc shape as the camera, so ring and camera
            // read as one coordinated move rather than two separate
            // linear interpolations crossing paths.
            const bowX = -0.25 * arc;
            const bowY = 0.15 * arc;
            ring.position.set(
              THREE.MathUtils.lerp(heroX, cornerX, cp) + bowX,
              THREE.MathUtils.lerp(heroY, cornerY, cp) + bowY,
              THREE.MathUtils.lerp(heroZ, cornerZ, cp),
            );
            // Grows past hero scale for a large, cropped close-up in
            // the corner — dialed back from 1.65 (which combined with
            // the larger offset above to push the ring off-frame
            // entirely) to 1.25, still bigger than hero scale but kept
            // on-screen.
            const parkScale = THREE.MathUtils.lerp(1, 1.25, cp);
            ring.scale.setScalar(ringHeroTransform.scale * effScale * parkScale);
          } else {
            ring.position.set(heroX, heroY, heroZ);
            ring.scale.setScalar(ringHeroTransform.scale * effScale);
          }
        }

        // ── DOF + Render (merged from the old separate rAF loop) ──────────
        // updateCursorDof writes to dofEffect.bokehScale and dofEffect.target
        // every frame; calling it here, immediately before render(), ensures
        // the DOF state is always in sync with the freshly-written camera
        // and ring pose rather than being one frame behind.
        updateCursorDof(dt);
        if (composer) composer.render();
        else if (renderer && scene && camera) renderer.render(scene, camera);
      };
      // Run the ticker once synchronously before registering it. Without
      // this, the ring renders at its raw GLB pose for the first few frames
      // before gsap.ticker fires — that stale frame is what looks like a
      // "jump on load". Running once immediately seeds the correct pose
      // before the next paint.
      currentTickerFn();
      gsap.ticker.add(currentTickerFn);
    }

    function handleResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (camera) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      renderer?.setSize(w, h);
      composer?.setSize(w, h);
    }
    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      // No cancelAnimationFrame needed — render is driven by gsap.ticker now.
      window.removeEventListener("resize", handleResize);
      if (cursorDofEnabled) {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("click", onActivationClick);
      }
      ScrollTrigger.getAll().forEach((st) => st.kill());
      if (currentTickerFn) {
        gsap.ticker.remove(currentTickerFn);
        currentTickerFn = null;
      }
      scene?.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
      });
      metalMaterial?.dispose?.();
      gemMaterials.forEach((mat) => mat?.dispose?.());
      metalEnvMap?.dispose?.();
      if (gemEnvMap && gemEnvMap !== metalEnvMap) gemEnvMap.dispose?.();
      pmrem?.dispose();
      dofEffect?.dispose?.();
      composer?.dispose();
      renderer?.dispose();
    };
  }, [
    glbUrl,
    metalHdrUrl,
    gemHdrUrl,
    metalPreset,
    gemPreset,
    gemMaterialTypeOverride,
    dracoDecoderPath,
    scrollContainerSelector,
    postFxEnabled,
    cursorDofEnabled,
    dofFocalLength,
    dofBokehScale,
    dofFocusLerpSpeed,
  ]);

  return (
    <>
      <div
        ref={bgOverlayRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background: "linear-gradient(180deg, #0d0d10 0%, #1a1a1f 100%)",
          // No CSS transition here — GSAP's bgState tween already
          // interpolates the gradient every frame via applyBackground().
          // A CSS transition on top creates a second, conflicting
          // smoothing pass that fights the scroll-driven animation.
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2,
          width: "100vw",
          height: "100vh",
          display: "block",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

/* ---------------------------------------------------------------------------
 * Usage examples:
 *
 * Default (yellow gold + refraction diamond, same HDR for both):
 *   <RingHero />
 *
 * Different HDRs per element, white gold, cheap matte gem for perf:
 *   <RingHero
 *     metalPreset={metalPresets.whiteGold}
 *     metalHdrUrl="/hdr/env_metal_001_d01c4504e0.hdr"
 *     gemHdrUrl="/hdr/jewelry_showcase.hdr"
 *     gemMaterialTypeOverride="matte"
 *   />
 *
 * If a new GLB's gem meshes aren't being detected, open DevTools —
 * this component console.tables the full mesh classification list on
 * every load in dev mode. Add missing name/code mappings to
 * KNOWN_NAME_OVERRIDES in classifyMesh.js.
 * ------------------------------------------------------------------------- */

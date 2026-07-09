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
import { diamondPreset, buildGemMaterial, attachBvhToGemMaterial } from "./gemMaterials";
import { classifyRingMeshes } from "./classifyMesh";
import { computeMetalHdrFactor, calculateDiamondEnvMapIntensityRaw, degToRad } from "./hdrControls";
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
const BEATS = [
  {
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0, y: 0.2, z: 4.2 },
    ringRot: { x: 0.15, y: 0 },
    metalEnvIntensity: 4,
    gemEnvIntensity: 1.2,
  },
  {
    bgTop: "#241a12",
    bgBottom: "#3b2417",
    camPos: { x: 0.6, y: -0.1, z: 2.6 },
    ringRot: { x: 0.5, y: 1.4 },
    metalEnvIntensity: 6,
    gemEnvIntensity: 1.6,
  },
  {
    bgTop: "#3a1c0c",
    bgBottom: "#0c0a08",
    camPos: { x: -0.4, y: 0.05, z: 1.6 },
    ringRot: { x: 0.9, y: 3.4 },
    metalEnvIntensity: 8,
    gemEnvIntensity: 2.0,
  },
  {
    bgTop: "#101014",
    bgBottom: "#000000",
    camPos: { x: 0, y: 0, z: 3.4 },
    ringRot: { x: 0.2, y: 6.2 },
    metalEnvIntensity: 5,
    gemEnvIntensity: 1.4,
  },
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
}) {
  const canvasRef = useRef(null);
  const bgOverlayRef = useRef(null);

  // Refs the ticker/apply-config code below read from every frame, plus
  // a "live materials" ref so a separate lightweight effect (below) can
  // push new HDR-config values onto already-built materials without
  // reloading the GLB/HDR.
  const metalMaterialRef = useRef(null);
  const gemMaterialsRef = useRef([]);
  const hdrConfigRef = useRef({
    metalHdrRotation, metalHdrRotationY, metalHdrScale, metalHdrPower, metalHdrGamma,
    gemHdrRotation, gemHdrRotationY, gemHdrScale, gemHdrPower, gemHdrGamma,
  });

  // Keep the ref current and re-apply immediately (this is what actually
  // makes the dev-panel sliders move the render — previously these props
  // were accepted by HeroPage2 but silently dropped by RingHero).
  useEffect(() => {
    hdrConfigRef.current = {
      metalHdrRotation, metalHdrRotationY, metalHdrScale, metalHdrPower, metalHdrGamma,
      gemHdrRotation, gemHdrRotationY, gemHdrScale, gemHdrPower, gemHdrGamma,
    };
    applyHdrConfigToLiveMaterials();
  }, [
    metalHdrRotation, metalHdrRotationY, metalHdrScale, metalHdrPower, metalHdrGamma,
    gemHdrRotation, gemHdrRotationY, gemHdrScale, gemHdrPower, gemHdrGamma,
  ]);

  function applyHdrConfigToLiveMaterials() {
    const cfg = hdrConfigRef.current;

    const metalFactor = computeMetalHdrFactor({
      scale: cfg.metalHdrScale, power: cfg.metalHdrPower, gamma: cfg.metalHdrGamma,
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
      scale: cfg.gemHdrScale, power: cfg.gemHdrPower, gamma: cfg.gemHdrGamma,
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
    let rafId;
    let disposed = false;

    scene = new THREE.Scene();
    // NOTE: no scene.environment assignment here — intentionally removed.
    // Each material below gets its own envMap explicitly.

    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
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
    renderer.toneMapping = postFxEnabled ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
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
        new VignetteEffect({ eskil: false, offset: 0.15, darkness: 0.55 })
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
        e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top || e.clientY > rect.bottom
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
      dofActivationT += (rampTarget - dofActivationT) * (1 - Math.exp(-rampSpeed * dt));
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
                  `(Original error: ${err?.message || err})`
              )
            );
          }
        );
      });
    }

    Promise.all([
      new Promise((resolve, reject) => gltfLoader.load(glbUrl, resolve, undefined, reject)),
      loadHdr(metalHdrUrl),
      // Skip a second network request if both URLs are identical
      metalHdrUrl === gemHdrUrl ? Promise.resolve(null) : loadHdr(gemHdrUrl),
    ])
      .then(([gltf, loadedMetalEnv, loadedGemEnv]) => {
        if (disposed) return;

        metalEnvMap = loadedMetalEnv;
        gemEnvMap = loadedGemEnv ?? loadedMetalEnv; // reuse metal env if no separate gem HDR given

        metalMaterial = buildMetalMaterial(metalPreset, metalEnvMap, null, BEATS[0].metalEnvIntensity);
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
            mat.envMapIntensity = BEATS[0].gemEnvIntensity * calculateDiamondEnvMapIntensityRaw({}) / 5.0;
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

        // Apply whatever HDR-panel values are already sitting in state
        // (e.g. if the user moved a slider before the async load resolved).
        applyHdrConfigToLiveMaterials();

        setupScrollTimeline();
      })
      .catch((err) => {
        console.error("RingHero: failed to load assets", err);
      });

    function setupScrollTimeline() {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: scrollContainerSelector,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        },
      });

      const camState = { ...BEATS[0].camPos };
      const rotState = { ...BEATS[0].ringRot };
      const metalEnvState = { value: BEATS[0].metalEnvIntensity };
      const gemEnvState = { value: BEATS[0].gemEnvIntensity };
      const bgState = { top: BEATS[0].bgTop, bottom: BEATS[0].bgBottom };

      for (let i = 1; i < BEATS.length; i++) {
        const beat = BEATS[i];
        const label = `beat-${i}`;

        tl.to(camState, { ...beat.camPos, duration: 1, ease: "none" }, label)
          .to(rotState, { ...beat.ringRot, duration: 1, ease: "none" }, label)
          .to(metalEnvState, { value: beat.metalEnvIntensity, duration: 1, ease: "none" }, label)
          .to(gemEnvState, { value: beat.gemEnvIntensity, duration: 1, ease: "none" }, label)
          .to(
            bgState,
            {
              top: beat.bgTop,
              bottom: beat.bgBottom,
              duration: 1,
              ease: "none",
              onUpdate: applyBackground,
            },
            label
          );
      }

      function applyBackground() {
        if (bgOverlayRef.current) {
          bgOverlayRef.current.style.background = `linear-gradient(180deg, ${bgState.top} 0%, ${bgState.bottom} 100%)`;
        }
      }

      gsap.ticker.add(() => {
        if (!camera || !ring) return;
        camera.position.set(camState.x, camState.y, camState.z);
        camera.lookAt(0, 0, 0);
        ring.rotation.set(rotState.x, rotState.y, 0);
        if (metalMaterial) {
          const trim = metalMaterial.userData?._hdrTrim ?? 1;
          metalMaterial.envMapIntensity = metalEnvState.value * trim;
        }
        gemMaterials.forEach((mat) => {
          if (!("envMapIntensity" in mat)) return;
          const trim = mat.userData?._hdrTrim ?? 1;
          mat.envMapIntensity = gemEnvState.value * trim;
        });
      });
    }

    let lastFrameTime = performance.now();
    function animate(now) {
      if (disposed) return;
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(((now ?? performance.now()) - lastFrameTime) / 1000, 0.1);
      lastFrameTime = now ?? performance.now();
      updateCursorDof(dt);
      if (composer) composer.render();
      else renderer.render(scene, camera);
    }
    animate(performance.now());

    function handleResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer?.setSize(w, h);
    }
    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      if (cursorDofEnabled) {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("click", onActivationClick);
      }
      ScrollTrigger.getAll().forEach((st) => st.kill());
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
          transition: "background 0.1s linear",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
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

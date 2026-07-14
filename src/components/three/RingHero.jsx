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
import { buildSkinMaterial } from "./skinMaterial";
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
// 5-beat storyboard (see docs/HERO2_5BEAT_PRD.md) — REORDERED:
//   1. Idle ring — no change from load.
//   2. Demerge — ring splits into 3 e-commerce-style cards (top/front/
//      side view), then re-merges into one ring.
//   3. Floor rises from below, ring rests on it, floor fades out by the
//      end of the beat.
//   4. On-body reveal — hand slides in, ring seats on the finger, then
//      backs off again (existing behavior, unchanged).
//   5. Standing spin — single ring, full 360° turn to close.
//
// NOTE: all beat-to-beat transition detection (isOnBodyExit,
// isCardsDemerge, isCardsMerge, isFloorFadeOut in setupScrollTimeline())
// is computed dynamically by comparing each beat's pose flags
// (handEntry/ringOnBody/floorEntry/floorOpacity/cardsState) against the
// PREVIOUS array entry — not by beat number — so reordering this array
// is safe and the transitions re-derive themselves for the new
// adjacency automatically.
export const BEATS = [
  {
    // Beat 1 — idle ring, exactly today's opening pose.
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0, y: 0.2, z: 4.2, lookAtY: 0 },
    ringRot: { x: 0.15, y: 0 },
    metalEnvIntensity: 4,
    gemEnvIntensity: 1.2,
    handEntry: 0,
    ringOnBody: 0,
    floorEntry: 0,
    floorOpacity: 0,
    cardsState: 0,
  },
  {
    // Beat 2 — demerge: ring splits into 3 view cards (top / front /
    // side). cardsState peaks here; it eases back to 0 into Beat 3, i.e.
    // the cards re-merge into a single ring across the outgoing
    // transition. Background intentionally matches Beat 1 exactly — no
    // background crossfade in or out of this beat.
    bgTop: "#0d0d10",
    bgBottom: "#1a1a1f",
    camPos: { x: 0, y: 0, z: 3.2, lookAtY: 0 },
    ringRot: { x: 0.15, y: 0 },
    metalEnvIntensity: 8,
    gemEnvIntensity: 2.0,
    handEntry: 0,
    ringOnBody: 0,
    floorEntry: 0,
    floorOpacity: 0,
    cardsState: 1, // 0 = single merged ring, 1 = fully split into 3 cards
  },
  {
    // Beat 3 — floor rises up from below the frame. Camera + ring pose
    // are DELIBERATELY nudged (not identical to Beat 1) so the ring
    // visibly "settles" as the floor arrives under it — a small camera
    // dip + ring tilting slightly forward/down, like a product easing
    // down onto a surface, instead of sitting perfectly static while
    // only the floor moves.
    // floorOpacity is still 1 here; it stays at 1 through Beat 4 (the
    // floor's world position does NOT move again — see floorEntry on
    // Beat 4 below) and it's floorOpacity alone that eases to 0 across
    // the Beat 3 -> Beat 4 range, i.e. the floor dissolves in place
    // instead of sinking back down.
    bgTop: "#241a12",
    bgBottom: "#3b2417",
    camPos: { x: 0.02, y: 0.05, z: 4.0, lookAtY: 0 },
    ringRot: { x: 0.32, y: 0.0 },
    // Pulls the ring down in world space so it (and the floor sitting
    // flush under it) reads lower in the viewport instead of dead-
    // center. Kept modest — camPos.y stays close to Beat 1's neutral
    // value so this offset alone does the work, rather than stacking on
    // top of an already-raised camera (which is what pushed everything
    // almost entirely off the bottom of the frame last time).
    ringPosOffset: { x: 0, y: -0.55, z: 0 },
    metalEnvIntensity: 6,
    gemEnvIntensity: 1.6,
    handEntry: 0,
    ringOnBody: 0,
    floorEntry: 1, // 0 = below frame, 1 = resting position
    floorOpacity: 1,
    cardsState: 0,
  },
  {
    // Beat 4 — on-body reveal beat: hand slides in from the right, ring
    // drops down and settles onto the finger. The floor stays at its
    // Beat 3 resting height here (floorEntry stays 1 — NOT back to 0),
    // so it can never visibly "sink"; only floorOpacity (already 0 by
    // now, tweened across the incoming Beat 3 -> Beat 4 range) controls
    // whether you can see it. Position and opacity are fully decoupled.
    bgTop: "#0c0c0e",
    bgBottom: "#000000",
    camPos: { x: 0.15, y: -0.05, z: 3.0, lookAtY: 0 },
    ringRot: { x: 0.35, y: 0.2 },
    metalEnvIntensity: 6,
    gemEnvIntensity: 1.6,
    // Hand + on-body specific state — read by setupScrollTimeline()/ticker.
    handEntry: 1, // 0 = fully offscreen right, 1 = fully in place
    ringOnBody: 1, // 0 = hero ring position, 1 = seated on the finger
    floorEntry: 1,
    floorOpacity: 0,
    cardsState: 0,
  },
  {
    // Beat 5 — standing spin: single ring, one full extra turn (2*PI on
    // top of Beat 4's resting Y) as the closing scroll range plays out.
    bgTop: "#101014",
    bgBottom: "#000000",
    camPos: { x: 0, y: 0, z: 3.4, lookAtY: 0 },
    ringRot: { x: 0.12, y: Math.PI * 2 },
    metalEnvIntensity: 5,
    gemEnvIntensity: 1.4,
    handEntry: 0,
    ringOnBody: 0,
    floorEntry: 0,
    floorOpacity: 0,
    cardsState: 0,
  },
];

// Demerge/card layout for Beat 4 — world-space X offsets and per-card
// view rotations (top / front / side), used both when building the
// clones and every frame in the ticker.
//
// The "front" slot is NOT a clone — it's the original ring itself,
// eased into the front card's scale/position instead of being hidden
// behind a 4th duplicate. Only "top" and "side" spawn real clones that
// fly outward from the center ring and shrink back into it on the way
// out — matching the storyboard ("ring gets duplicated 3 times" reads
// as 2 NEW copies emerging from the 1 that's already there, not 3 new
// + the original all visible at once).
const CARD_LAYOUT = [
  { x: -1.39, y: -0.12, z: -0.66, scale: 0.94, rot: { x: -2.12, y: -0.2, z: -2.88 }, label: "top" },
  { x: 0, y: -0.12, z: -0.68, scale: 1.02, rot: { x: 0.75, y: 0, z: 0 }, label: "front" },
  { x: 1.39, y: -0.12, z: -0.66, scale: 1.06, rot: { x: -3.14, y: -2.88, z: -2.51 }, label: "side" },
];

// Ring position INSIDE each card slot, baked in as the default (still
// overridable live via the demerge/card-layout panel — see
// DEFAULT_CARD_RING_OFFSET's use in liveRingOffset() below):
// top:   { x: 0, y: -0.18, z: 0 }
// front: { x: 0, y: -0.08, z: 0 } (front has no frame — additive on top of X/Y/Z offset above)
// side:  { x: 0.18, y: -0.2, z: 0 }
const DEFAULT_CARD_RING_OFFSET = [
  { x: 0, y: -0.18, z: 0 },
  { x: 0, y: -0.08, z: 0 },
  { x: 0.18, y: -0.2, z: 0 },
];

// Ring's resting position/rotation on the hand mesh, in the hand's local
// (post-normalization) space. Tuned against half_hand.glb's ring-finger
// placement — tweak position/rotation first if the ring sits off the
// finger on a different hand model.
const RING_ON_FINGER = {
  // Position confirmed live via the finger-probe tool (point cursor at
  // the ring-finger knuckle, read off the coordinate under it) — this
  // replaces the earlier derived-from-decoded-mesh guess, which was in
  // the right ballpark but not exact. If the hand model or its resting
  // rotation in loadHand() ever changes, re-probe rather than re-derive.
  position: { x: -5.842, y: 12.609, z: 4.253 },
  // Rotation aligns the ring's local +Y (its bore/hole axis — see
  // ringHeroTransform.diameter below, which measures across X/Z) with
  // the ring finger's actual centerline direction, derived the same
  // way. Valid for hand.rotation ≈ (0.1, -0.35, 0.05), i.e. the pose
  // set in loadHand() below — if that resting rotation changes, these
  // three numbers need to be re-derived (see /mnt/skills note in repo
  // root, or ask for the decode script again).
  rotation: { x: -1.425, y: 0.687, z: -0.785 },
  // Ring's bore (inner hole) should end up just snug around the finger.
  // This is expressed as inner-diameter-to-finger-width ratio (>1 = a bit
  // of clearance so it doesn't clip through the mesh), NOT an absolute
  // scale — the actual world-space scale is derived at runtime from the
  // ring's real diameter vs. the hand's measured finger width, so this
  // works regardless of either model's raw units.
  boreToFingerRatio: 1.08,
  // Used only if the raycast finger-width probe misses.
  fallbackFingerWidth: 0.16,
};

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

  // On-body hand reveal (beat 5) — set handGlbUrl to enable. If left null,
  // RingHero behaves exactly as before (ring-only, 4 beats).
  handGlbUrl = null,
  handSkinTone = 0xe8b898,
  // Optional real texture overrides for the procedural skin material —
  // leave null to use the generated fallback (see skinMaterial.js).
  handTextureUrl = null,
  handNormalUrl = null,
  handRoughnessUrl = null,

  // Wires up the live ring-on-finger calibration panel in HeroPage2.
  // Called once with { setRingOnFinger(partial) } after the hand loads.
  // Previously HeroPage2 called ringCalibRef.current?.setRingOnFinger(...)
  // but RingHero never invoked this prop at all, so ringCalibRef.current
  // stayed null forever and the panel's sliders silently did nothing —
  // that's the "calibration panel shows no effect" bug.
  onRingCalibrationReady = null,

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

  // Debug: raycasts the hand mesh under the cursor and shows a small
  // on-canvas readout of the hit point's coordinates in the exact space
  // RING_ON_FINGER.position expects (i.e. divided back out of hand.scale/
  // hand.position/hand.rotation) — point at the finger, read the numbers,
  // paste into the calibration panel or straight into RING_ON_FINGER.
  fingerProbeEnabled = false,
}) {
  const canvasRef = useRef(null);
  const bgOverlayRef = useRef(null);
  const probeReadoutRef = useRef(null);
  const probeDotRef = useRef(null);

  // Refs the ticker/apply-config code below read from every frame, plus
  // a "live materials" ref so a separate lightweight effect (below) can
  // push new HDR-config values onto already-built materials without
  // reloading the GLB/HDR.
  const metalMaterialRef = useRef(null);
  const gemMaterialsRef = useRef([]);
  // Live-mutable copy of RING_ON_FINGER that the calibration panel can
  // write into via onRingCalibrationReady's setRingOnFinger — starts as
  // a clone of the tuned default so calibration is opt-in, not required.
  const ringOnFingerLiveRef = useRef({
    position: { ...RING_ON_FINGER.position },
    rotation: { ...RING_ON_FINGER.rotation },
    boreToFingerRatio: RING_ON_FINGER.boreToFingerRatio,
  });
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
    ringRot: null, // { x, y } | null
    ringPosOffset: null, // { x, y, z } | null — added on top of the beat's own ring position
    ringScale: null, // number | null — multiplier on top of the beat's own ring scale
    floorRestY: null, // number | null — floor's resting Y (top-face height)
    floorPosX: null, // number | null
    floorPosZ: null, // number | null
    floorRot: null, // { x, y, z } | null — radians
    // Per-card live override for the Beat 2 demerge layout (see
    // CARD_LAYOUT above) — array of 3 slots, indices matching
    // CARD_LAYOUT's order (0 = top, 1 = front, 2 = side). Each slot is
    // either null (use CARD_LAYOUT's default) or a partial
    // { x?, z?, rot?: { x?, y? } }. Read every tick in the demerge block
    // below; the "front" slot's z/rot only affect the clones' visual
    // reference — the main ring (which IS the front card) reads its own
    // x/rot separately since it doesn't move off-center.
    cardLayout: [null, null, null],

    // Ring-only position offset WITHIN each card — independent of
    // cardLayout above. cardLayout/CARD_LAYOUT positions the card
    // "slot" (and its outline frame); this offset nudges just the ring
    // clone mesh inside that slot without moving the frame. Index
    // order matches CARD_LAYOUT (0 = top, 2 = side). Front (index 1)
    // has no frame, so its "ring position" is already just
    // cardLayout[1].x/y directly — this offset is additive on top of
    // that for consistency, but mainly meant for 0/2. Each slot is
    // either null or a partial { x?, y?, z? }.
    cardRingOffset: [null, null, null],
  });

  // Saved per-beat keyframes from the "Beat Coordinates" panel — keyed by
  // beat index (0..BEATS.length-1). A saved keyframe overrides that
  // beat's camPos/ringRot/ringPosOffset/ringScale for scroll playback
  // (not just live preview), which is what makes "Save keyframe" stick.
  // Previously this data had nowhere to go — HeroPage2 already called
  // saveKeyframe/clearKeyframe/getKeyframeSnapshot/setRingPosOffsetOverride/
  // setRingScaleOverride on the pose API, but RingHero never implemented
  // them, so those panel controls silently did nothing outside Beat 3.
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
    let rafId;
    let disposed = false;

    // On-body hand reveal state (beat 5, only active when handGlbUrl set).
    let hand = null;
    let skinMaterial = null;
    let handRestX = 0; // hand's settled local x — entry animation offsets from here
    // How far right (world units) the hand starts, pre-entry. 2.2 wasn't
    // enough at this camera's FOV/distance — the hand's fingertips were
    // still creeping into frame during beat 1 (handEntry = 0), which is
    // the "visible from the right in beat 1" bug. Pushed further out so
    // it's fully clipped until the beat-2→3 tween actually starts.
    let handEntryOffsetX = 3.4;
    // Extra push so the hand's RESTING position (entry = 1, fully "in")
    // still sits pinned near the right edge of frame instead of drifting
    // to screen-center — this was the main bug: only +0.35 was added on
    // top of the auto-centered position, nowhere near enough at this
    // camera distance/FOV to keep it off-center.
    const HAND_REST_EDGE_OFFSET = 1.35;
    // Ring's hero-scene resting transform — captured right after the
    // existing auto-fit logic runs, so the beat-5 tween has a "from".
    const ringHeroTransform = {
      position: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      scale: 1,
      diameter: 1,
    };
    let handFingerWidth = 1; // measured after hand loads — see loadHand()
    let ringOnFingerScale = 1; // derived once hand loads — see loadHand()

    // Beat 2 (floor) state — plane created up front (no GLB dependency),
    // tweened between "below frame" and "resting under the ring".
    let floor = null;
    // Fallback only, used for the brief window before the ring GLB has
    // loaded and its real bounding box can be measured (see
    // measureFloorRestY() below, called right after ringHeroTransform is
    // set up). -0.62 was a guess that didn't actually match the ring's
    // lowest point at Beat 2's tilt, which is why the floor plane sat
    // visibly below the ring instead of touching it.
    let FLOOR_REST_Y = -0.62;
    // Set this to a number (e.g. -0.705) to PIN the floor's resting
    // height and skip the auto-measurement below entirely — use this
    // once you've dialed in a value with the Floor Calibration panel
    // and want it to stick permanently, since editing FLOOR_REST_Y's
    // initial guess above does nothing (measureFloorRestY() overwrites
    // it a few dozen lines down, every load, from the ring's actual
    // geometry). Leave as `null` to keep the auto-measured behavior.
    const FLOOR_REST_Y_MANUAL_OVERRIDE = -0.73;
    const FLOOR_HIDDEN_Y = -3.2;

    // Measures the ring's actual lowest world-space point at a given
    // rotation + position offset, so the floor can snap flush against
    // it instead of guessing a fixed Y or hand-tuning a magic number.
    // Ring geometry isn't a flat-bottomed box (and this model's meshes
    // carry a large baked-in rotation from the source file — see
    // ring-draco.glb's node transforms), so tilting/offsetting it
    // changes where its lowest point actually is; a hardcoded constant
    // can't track that automatically.
    function measureFloorRestY(ringObj, rotX, rotY, offsetY = 0) {
      const savedRotX = ringObj.rotation.x;
      const savedRotY = ringObj.rotation.y;
      const savedRotZ = ringObj.rotation.z;
      const savedPosY = ringObj.position.y;
      ringObj.rotation.set(rotX, rotY, 0);
      ringObj.position.y = ringHeroTransform.position.y + offsetY;
      ringObj.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(ringObj);
      ringObj.rotation.set(savedRotX, savedRotY, savedRotZ);
      ringObj.position.y = savedPosY;
      ringObj.updateMatrixWorld(true);
      // Tiny negative clearance so the floor sits just touching the
      // ring's underside rather than clipping a hair into it.
      return box.min.y - 0.006;
    }

    // Beat 4 (demerge/cards) state — clones + line-outline card frames,
    // built once the ring GLB has loaded & classified (they clone `ring`
    // and reuse its already-built materials, no extra HDR/texture cost).
    let cardClones = []; // [{ mesh, x, rot }]
    let cardFrames = []; // THREE.LineSegments, one per card

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

    // ── Finger probe (debug) ────────────────────────────────────────────
    // Independent of the DOF raycaster above — always tracks the cursor
    // (regardless of cursorDofEnabled) and, when the hand is loaded and
    // visible, raycasts against it. Reports the hit point converted back
    // into the exact coordinate space RING_ON_FINGER.position/rotation
    // expects, so you can literally point at a knuckle and read off the
    // numbers instead of guessing from screenshots.
    const probeRaycaster = new THREE.Raycaster();
    const probeNDC = new THREE.Vector2(-999, -999); // off-screen until first move
    function onProbePointerMove(e) {
      const rect = canvas.getBoundingClientRect();
      probeNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      probeNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }
    if (fingerProbeEnabled) {
      window.addEventListener("pointermove", onProbePointerMove);
    }

    function updateFingerProbe() {
      if (!fingerProbeEnabled) return;
      const readoutEl = probeReadoutRef.current;
      const dotEl = probeDotRef.current;
      if (!readoutEl) return;

      if (!hand || !hand.visible) {
        readoutEl.textContent = "finger probe: hand not visible in this beat";
        if (dotEl) dotEl.style.display = "none";
        return;
      }

      probeRaycaster.setFromCamera(probeNDC, camera);
      const hits = probeRaycaster.intersectObject(hand, true);
      if (!hits.length) {
        readoutEl.textContent =
          "finger probe: point at the hand to sample a coordinate";
        if (dotEl) dotEl.style.display = "none";
        return;
      }

      const hit = hits[0];
      const worldPt = hit.point; // THREE.Vector3, world space

      // Convert world hit point -> the "gltf.scene local" space that
      // hand.position/hand.scale operate directly on (i.e. undo scale
      // and translation, but NOT hand.rotation, since RING_ON_FINGER's
      // offset is rotated by hand.rotation at apply-time — see the
      // ticker above — so the field itself is defined in hand's
      // UNROTATED local frame, same as loadHand()'s auto-fit measures).
      const local = worldPt
        .clone()
        .sub(hand.position)
        .divideScalar(hand.scale.x);
      // undo hand.rotation to get back to the pre-rotation frame that
      // RING_ON_FINGER.position is actually specified in
      const inverseQuat = new THREE.Quaternion()
        .setFromEuler(hand.rotation)
        .invert();
      local.applyQuaternion(inverseQuat);

      readoutEl.textContent =
        `RING_ON_FINGER.position candidate:\n` +
        `x: ${local.x.toFixed(3)}, y: ${local.y.toFixed(3)}, z: ${local.z.toFixed(3)}\n` +
        `(world: ${worldPt.x.toFixed(2)}, ${worldPt.y.toFixed(2)}, ${worldPt.z.toFixed(2)})`;

      if (dotEl) {
        // Project world point back to screen space to place the dot
        const screenPt = worldPt.clone().project(camera);
        const x = (screenPt.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-screenPt.y * 0.5 + 0.5) * window.innerHeight;
        dotEl.style.display = "block";
        dotEl.style.left = `${x}px`;
        dotEl.style.top = `${y}px`;
      }
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
    // Beat 2 floor — a real 3D brick (BoxGeometry, has actual thickness),
    // starts below the frame and invisible. Independent of the ring GLB
    // load so it's ready immediately. Small footprint so it reads as a
    // plinth under the ring rather than a full-frame sheet, and having
    // genuine depth means it never flattens into a thin line/sheet
    // silhouette at grazing camera angles the way a rotated plane does.
    const floorGeo = new THREE.BoxGeometry(3.5, 2.5, 1.0);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xff0000, // TEMP DEBUG COLOR — revert to 0x18181a once positioning is confirmed
      metalness: 0.25,
      roughness: 0.65,
      transparent: true,
      opacity: 0,
    });
    floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = FLOOR_HIDDEN_Y;
    floor.visible = false;
    scene.add(floor);

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

        // Now that the ring's real geometry/scale/position is in place,
        // measure where its underside actually sits at the floor beat's
        // tilt AND ring position offset, and use that as the floor's
        // resting height, instead of the -0.62 guess (see FLOOR_REST_Y
        // declaration above) or a hand-tuned magic number that drifts
        // out of sync the moment the floor beat's numbers change.
        // NOTE: floor is BEATS[2] post-reorder (idle, demerge, floor,
        // onbody, spin) — do not hardcode BEATS[1] here, that's the
        // demerge beat now.
        FLOOR_REST_Y =
          FLOOR_REST_Y_MANUAL_OVERRIDE ??
          measureFloorRestY(
            ring,
            BEATS[2].ringRot.x,
            BEATS[2].ringRot.y,
            BEATS[2].ringPosOffset?.y ?? 0,
          );

        // Beat 4 — build the 3 demerge clones + card frame outlines now
        // that `ring` exists and its materials are assigned. clone(true)
        // duplicates the mesh hierarchy but shares material references,
        // so this costs no extra HDR/texture memory. Start fully
        // collapsed (scale 0, hidden) — the ticker below grows/shrinks
        // them as cardsState eases 0 -> 1 -> 0 across Beat 4.
        cardClones = CARD_LAYOUT.map((entry, layoutIndex) => ({
          entry,
          layoutIndex,
        }))
          .filter(({ entry }) => entry.label !== "front")
          .map(({ entry, layoutIndex }) => {
            const clone = ring.clone(true);
            clone.visible = false;
            clone.scale.setScalar(0);
            scene.add(clone);
            return {
              mesh: clone,
              x: entry.x,
              z: entry.z,
              rot: entry.rot,
              layoutIndex,
            };
          });

        cardFrames = CARD_LAYOUT.map(({ x }) => {
          const frameGeo = new THREE.EdgesGeometry(
            new THREE.PlaneGeometry(1.15, 1.5),
          );
          const frameMat = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
          });
          const frame = new THREE.LineSegments(frameGeo, frameMat);
          frame.position.set(x, 0, -0.15);
          scene.add(frame);
          return frame;
        });

        // Apply whatever HDR-panel values are already sitting in state
        // (e.g. if the user moved a slider before the async load resolved).
        applyHdrConfigToLiveMaterials();

        if (handGlbUrl) {
          loadHand();
        } else {
          setupScrollTimeline();
        }
      })
      .catch((err) => {
        console.error("RingHero: failed to load assets", err);
      });

    function loadHand() {
      gltfLoader.load(
        handGlbUrl,
        (handGltf) => {
          if (disposed) return;
          hand = handGltf.scene;

          const { material: builtSkinMaterial } = buildSkinMaterial({
            renderer,
            skinTone: handSkinTone,
            textureUrl: handTextureUrl,
            normalUrl: handNormalUrl,
            roughnessUrl: handRoughnessUrl,
            envMap: metalEnvMap,
            envMapIntensity: 1.1,
          });
          skinMaterial = builtSkinMaterial;

          hand.traverse((child) => {
            if (child.isMesh) {
              child.material = skinMaterial;
              child.castShadow = false;
              child.receiveShadow = false;
            }
          });

          // Auto-fit hand exactly like the ring — normalize scale/center so
          // it works regardless of the source model's raw units/pivot.
          const handBox = new THREE.Box3().setFromObject(hand);
          const handSize = handBox.getSize(new THREE.Vector3());
          const handCenter = handBox.getCenter(new THREE.Vector3());
          const handMaxDim = Math.max(handSize.x, handSize.y, handSize.z);
          const handScale = 2.6 / handMaxDim;
          hand.scale.setScalar(handScale);
          hand.position.sub(handCenter.multiplyScalar(handScale));

          // Estimate the ring-finger's width by raycasting straight down
          // through the hand at RING_ON_FINGER's local (x, z) — measuring
          // the actual mesh thickness there instead of guessing a fixed
          // number, so this adapts if the hand model changes.
          handFingerWidth =
            measureFingerWidth(hand, handScale) ??
            RING_ON_FINGER.fallbackFingerWidth;

          // Derive the ring's on-finger scale as a real ratio: how big
          // does the ring's hero-scale diameter need to be multiplied to
          // match (finger width * boreToFingerRatio)? This replaces the
          // old hardcoded absolute scale (0.62) that had no relation to
          // either model's actual proportions and caused the ring to
          // render many times too large relative to the hand.
          const desiredWorldDiameter =
            handFingerWidth * ringOnFingerLiveRef.current.boreToFingerRatio;
          ringOnFingerScale =
            ringHeroTransform.diameter > 0.0001
              ? ringHeroTransform.scale *
                (desiredWorldDiameter / ringHeroTransform.diameter)
              : ringHeroTransform.scale * 0.3;

          if (import.meta.env.DEV) {
            console.log(
              "[RingHero] on-body calibration — fingerWidth:",
              handFingerWidth.toFixed(4),
              "ringHeroScale:",
              ringHeroTransform.scale.toFixed(4),
              "ringHeroDiameter:",
              ringHeroTransform.diameter.toFixed(4),
              "-> ringOnFingerScale:",
              ringOnFingerScale.toFixed(4),
            );
          }

          // Settle a little lower/forward-right so the ring finger sits
          // near screen center once it slides in — offsets are on top of
          // the auto-centered position above.
          handRestX = hand.position.x + HAND_REST_EDGE_OFFSET;
          hand.position.x = handRestX + handEntryOffsetX; // start offscreen right
          hand.position.y -= 0.55;
          hand.rotation.set(0.1, -0.35, 0.05);

          scene.add(hand);
          setupScrollTimeline();

          // Wire up the live calibration panel now that hand/ring are both
          // loaded and ringOnFingerScale has an initial value. setRingOnFinger
          // mutates ringOnFingerLiveRef in place (read every frame by the
          // ticker above) and recomputes ringOnFingerScale so boreToFingerRatio
          // changes take effect immediately too, not just position/rotation.
          if (onRingCalibrationReady) {
            onRingCalibrationReady({
              setRingOnFinger: (partial) => {
                const live = ringOnFingerLiveRef.current;
                if (partial.position)
                  Object.assign(live.position, partial.position);
                if (partial.rotation)
                  Object.assign(live.rotation, partial.rotation);
                if (typeof partial.boreToFingerRatio === "number") {
                  live.boreToFingerRatio = partial.boreToFingerRatio;
                  const desiredWorldDiameter =
                    handFingerWidth * live.boreToFingerRatio;
                  ringOnFingerScale =
                    ringHeroTransform.diameter > 0.0001
                      ? ringHeroTransform.scale *
                        (desiredWorldDiameter / ringHeroTransform.diameter)
                      : ringHeroTransform.scale * 0.3;
                }
              },
            });
          }
        },
        undefined,
        (err) => {
          console.error("RingHero: failed to load hand GLB", err);
          setupScrollTimeline(); // still run the ring-only timeline
        },
      );
    }

    // Casts a small vertical ray fan through the hand mesh at the
    // RING_ON_FINGER local (x,z) target to measure the finger's actual
    // width in world units at hand's current scale. Returns null if the
    // ray misses (falls back to a hand-tuned constant instead).
    function measureFingerWidth(handObj, handObjScale) {
      const localX = ringOnFingerLiveRef.current.position.x;
      const localY = ringOnFingerLiveRef.current.position.y;
      const localZ = ringOnFingerLiveRef.current.position.z;

      // Convert local (pre-hand-transform) coords to world space using the
      // hand's current scale/position at measurement time (rotation is
      // near-zero here so this approximation is fine for a width probe).
      const worldX = localX * handObjScale + handObj.position.x;
      const worldY = localY * handObjScale + handObj.position.y;
      const worldZ = localZ * handObjScale + handObj.position.z;

      const rayOrigin = new THREE.Vector3(worldX - 1, worldY, worldZ);
      const rayDir = new THREE.Vector3(1, 0, 0);
      const ray = new THREE.Raycaster(rayOrigin, rayDir, 0, 2);
      const hits = ray.intersectObject(handObj, true);
      if (hits.length < 2) return null;

      const xs = hits.map((h) => h.point.x).sort((a, b) => a - b);
      const width = xs[xs.length - 1] - xs[0];
      return width > 0.001 ? width : null;
    }

    // Merges a beat's hardcoded defaults with any saved keyframe for
    // that beat index (see beatKeyframesRef) — a keyframe's fields win
    // where present, everything else falls back to BEATS[i]. This is
    // what makes "Save keyframe" apply to ANY beat, not just Beat 3.
    function resolveBeatTarget(index) {
      const base = BEATS[index];
      const kf = beatKeyframesRef.current[index];
      return {
        camPos: kf?.camPos ?? base.camPos,
        ringRot: kf?.ringRot ?? base.ringRot,
        // Falls back to the beat's own ringPosOffset (if the BEATS[]
        // entry defines one, e.g. Beat 2 pushing the ring down in world
        // space) before falling back to zero — lets a beat shift the
        // ring's position without needing a dev-panel keyframe saved.
        ringPosOffset: kf?.ringPosOffset ??
          base.ringPosOffset ?? { x: 0, y: 0, z: 0 },
        ringScale: kf?.ringScale ?? 1,
      };
    }

    function setupScrollTimeline() {
      // Rebuild support: kill any previously-built scroll trigger/ticker
      // callback first, so calling this again (e.g. after saving a
      // keyframe) replaces the timeline instead of stacking a duplicate
      // one on top of it.
      ScrollTrigger.getAll().forEach((st) => st.kill());
      if (currentTickerFn) {
        gsap.ticker.remove(currentTickerFn);
        currentTickerFn = null;
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: scrollContainerSelector,
          start: "top top",
          end: "bottom bottom",
          // scrub smooths GSAP's own reading of scroll position on top
          // of whatever it's given. Previously this had to fight raw,
          // chunky native scroll input (see Lenis setup in HeroPage2.jsx)
          // single-handedly — 1 was laggy enough to expose visible
          // "catch-up" snaps after each input burst, 0.3 was snappy
          // enough to expose the raw chunkiness directly as stepping.
          // Now that Lenis feeds ScrollTrigger an already-continuous
          // scroll signal, 0.5 is enough to smooth GSAP's own frame-to-
          // frame interpolation without re-introducing a noticeable lag.
          scrub: 0.5,
          onUpdate: (self) => {
            if (!onScrollDebugUpdate) return;
            // self.progress is 0->1 across the WHOLE tracked range, same
            // number that drives every beat's blend/pose tween below —
            // multiplying by (BEATS.length - 1) gives a fractional "beat
            // position" (e.g. 2.35 = 35% of the way from beat 2 to beat 3).
            const beatPosition = self.progress * (BEATS.length - 1);
            onScrollDebugUpdate({
              progress: self.progress,
              beatIndex: Math.floor(beatPosition),
              beatFraction: beatPosition - Math.floor(beatPosition),
              beatCount: BEATS.length,
              scrollY: window.scrollY,
              docHeight: document.documentElement.scrollHeight,
            });
          },
        },
      });

      // Wire up the "beat coordinate" dev panel — works across ALL
      // beats, not just on-body. jumpToBeat scrolls the page so beat i's
      // label is centered in the scrub range (handy for eyeballing a
      // beat while you tune it); the setters just mutate poseOverrideRef,
      // read every tick below. saveKeyframe/clearKeyframe/getKeyframeSnapshot
      // and the ring position/scale overrides used to be called by
      // HeroPage2 but were never implemented here, so they silently did
      // nothing outside the on-body beat — now they rebuild the timeline
      // so a save actually sticks on scroll, in any beat.
      if (onPoseOverrideReady) {
        onPoseOverrideReady({
          jumpToBeat: (index) => {
            const st = tl.scrollTrigger;
            if (!st) return;
            const clamped = Math.max(0, Math.min(BEATS.length - 1, index));
            const progress = clamped / (BEATS.length - 1);
            const targetY = st.start + (st.end - st.start) * progress;
            window.scrollTo({ top: targetY, behavior: "smooth" });
          },
          setCamOverride: (partial) => {
            poseOverrideRef.current.camPos = partial
              ? { ...poseOverrideRef.current.camPos, ...partial }
              : null;
          },
          setRingRotOverride: (partial) => {
            poseOverrideRef.current.ringRot = partial
              ? { ...poseOverrideRef.current.ringRot, ...partial }
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
          setFloorRestYOverride: (value) => {
            poseOverrideRef.current.floorRestY = value;
          },
          setFloorPosOverride: (partial) => {
            // partial: { x?, z? } | null. X/Z are independent fields (not
            // merged like camPos/ringPosOffset) since floor position only
            // has two axes worth overriding here — Y already has its own
            // dedicated setFloorRestYOverride above.
            if (!partial) {
              poseOverrideRef.current.floorPosX = null;
              poseOverrideRef.current.floorPosZ = null;
              return;
            }
            if ("x" in partial) poseOverrideRef.current.floorPosX = partial.x;
            if ("z" in partial) poseOverrideRef.current.floorPosZ = partial.z;
          },
          setFloorRotOverride: (partial) => {
            poseOverrideRef.current.floorRot = partial
              ? {
                  x: 0,
                  y: 0,
                  z: 0,
                  ...poseOverrideRef.current.floorRot,
                  ...partial,
                }
              : null;
          },
          // Reads back wherever the scroll-tweened pose ACTUALLY is right
          // now (camState/rotState/etc, updated every tick below), not a
          // hardcoded beat default. The panel calls this right before
          // flipping "live" on, so enabling override seeds from the
          // current on-screen pose instead of snapping the ring/camera
          // to whatever stale numbers happened to be sitting in the
          // panel's React state (e.g. Beat 1's numbers, if the panel was
          // never used to select a beat yet) — that snap was the "enabling
          // live override jumps the coordinates" bug.
          getCurrentPose: () => ({
            camPos: { ...camState },
            ringRot: { ...rotState },
            ringPosOffset: { ...ringPosOffsetState },
            ringScale: ringScaleState.value,
            floorRestY: poseOverrideRef.current.floorRestY ?? FLOOR_REST_Y,
            floorPosX: poseOverrideRef.current.floorPosX ?? 0,
            floorPosZ: poseOverrideRef.current.floorPosZ ?? 0,
            floorRot: poseOverrideRef.current.floorRot ?? { x: 0, y: 0, z: 0 },
          }),
          saveKeyframe: (index, data) => {
            beatKeyframesRef.current[index] = data;
            setupScrollTimeline();
          },
          clearKeyframe: (index) => {
            delete beatKeyframesRef.current[index];
            setupScrollTimeline();
          },
          getKeyframeSnapshot: () => ({ ...beatKeyframesRef.current }),
          // Beat 2 demerge card-layout panel — index matches CARD_LAYOUT
          // (0 = top, 1 = front, 2 = side). partial merges onto whatever
          // that slot already has; pass null to clear just that slot back
          // to CARD_LAYOUT's baked-in default.
          setCardLayoutOverride: (index, partial) => {
            const cur = poseOverrideRef.current.cardLayout;
            const next = [...cur];
            next[index] = partial
              ? {
                  ...cur[index],
                  ...partial,
                  rot: { ...cur[index]?.rot, ...partial.rot },
                }
              : null;
            poseOverrideRef.current.cardLayout = next;
          },
          resetCardLayoutOverride: () => {
            poseOverrideRef.current.cardLayout = [null, null, null];
          },
          // Ring-only position offset inside a card slot — see
          // cardRingOffset declaration above. Same merge/clear pattern
          // as setCardLayoutOverride, just x/y/z, no rot/scale (rotation
          // is already ring-only via cardLayout's rot field, which never
          // touches the frame).
          setCardRingOffsetOverride: (index, partial) => {
            const cur = poseOverrideRef.current.cardRingOffset;
            const next = [...cur];
            next[index] = partial ? { ...cur[index], ...partial } : null;
            poseOverrideRef.current.cardRingOffset = next;
          },
          resetCardRingOffsetOverride: () => {
            poseOverrideRef.current.cardRingOffset = [null, null, null];
          },
        });
      }

      const initTarget = resolveBeatTarget(0);
      const camState = { ...initTarget.camPos };
      const rotState = { ...initTarget.ringRot };
      const ringPosOffsetState = { ...initTarget.ringPosOffset };
      const ringScaleState = { value: initTarget.ringScale };
      const metalEnvState = { value: BEATS[0].metalEnvIntensity };
      const gemEnvState = { value: BEATS[0].gemEnvIntensity };
      const bgState = { top: BEATS[0].bgTop, bottom: BEATS[0].bgBottom };
      // Parallel 0->1 scalar per segment, same timing as bgState's tween
      // below — lets onBeatBlendUpdate report a clean crossfade weight
      // without having to reverse-engineer it out of the color strings.
      const blendState = { value: 0 };
      const handEntryState = { value: BEATS[0].handEntry ?? 0 };
      const ringOnBodyState = { value: BEATS[0].ringOnBody ?? 0 };
      const floorEntryState = { value: BEATS[0].floorEntry ?? 0 };
      const floorOpacityState = { value: BEATS[0].floorOpacity ?? 0 };
      const cardsState = { value: BEATS[0].cardsState ?? 0 };

      for (let i = 1; i < BEATS.length; i++) {
        const beat = BEATS[i];
        const prevBeat = BEATS[i - 1];
        const label = `beat-${i}`;

        // Beat 3 -> Beat 4 is the ONE transition where the ring is
        // coming OFF the hand (prevBeat.ringOnBody === 1, this beat's
        // ringOnBody === 0) at the same time the hand exits. Left as a
        // single simultaneous tween, the ring's on-finger target chases
        // the hand's already-moving position, reading as "the ring
        // rides off to the right with the hand." Staggering it so the
        // ring detaches and returns toward center FIRST, then the hand
        // continues out afterward, makes the ring retrace its own
        // entry path home instead of trailing the hand offscreen — the
        // hand-entry (incoming) tween is untouched, it was already
        // correct.
        const isOnBodyExit =
          (prevBeat.ringOnBody ?? 0) === 1 && (beat.ringOnBody ?? 0) === 0;

        // Beat 3 -> Beat 4: ring detaches from the hand and demerges
        // into 3 cards. Storyboard order is "ring comes back to its
        // original position FIRST, then the 2 clone cards emerge from
        // it" — cardsState must not start ramping until the
        // isOnBodyExit sub-timeline below has put the ring back at its
        // hero pose (onBody === 0).
        const isDemergeIn =
          (prevBeat.cardsState ?? 0) === 0 && (beat.cardsState ?? 0) === 1;
        // Beat 4 -> Beat 5: the 2 clone cards should merge back into the
        // center ring FIRST, with the center ring holding still, and
        // only once that merge is done should the ring's own pose/
        // rotation start moving into Beat 5 (the standing-spin entry).
        const isDemergeOut =
          (prevBeat.cardsState ?? 0) === 1 && (beat.cardsState ?? 0) === 0;
        // The floor's fade-out (Beat 2 -> Beat 3) needs to finish BEFORE
        // the hand is meaningfully on-screen, or the two read as
        // fighting for the same frame — used below both to delay the
        // hand's entry and to speed up the floor's fade.
        const floorFadingOutHere =
          (prevBeat.floorOpacity ?? 0) > (beat.floorOpacity ?? 0);

        // camPos/ringRot/ringPosOffset/ringScale all go through
        // resolveBeatTarget() so a saved dev-panel keyframe for this
        // beat wins over the hardcoded BEATS[i] default. On the
        // demerge-out transition these are held back until the cards
        // have finished merging back into the ring, so the ring
        // doesn't start spinning into Beat 5 while the clones are
        // still flying home.
        const target = resolveBeatTarget(i);
        const poseLabel = isDemergeOut ? label + "+=0.5" : label;
        const poseDuration = isDemergeOut ? 0.5 : 1;

        tl.to(
          camState,
          { ...target.camPos, duration: poseDuration, ease: "none" },
          poseLabel,
        )
          .to(
            rotState,
            { ...target.ringRot, duration: poseDuration, ease: "none" },
            poseLabel,
          )
          .to(
            ringPosOffsetState,
            {
              ...target.ringPosOffset,
              duration: poseDuration,
              ease: "none",
            },
            poseLabel,
          )
          // Y alone is re-tweened with the SAME ease as floorEntryState
          // ("power2.out") so the ring's vertical settle and the floor's
          // rise arrive in lockstep at every point along the scrub, not
          // just at the start/end. Without this, ringPosOffsetState.y
          // moved linearly while floorEntryState eased with power2.out —
          // same duration, same start/end values, but different curves —
          // so mid-transition (e.g. ~95% into Beat 1->2) the floor had
          // already reached its resting height while the ring was still
          // above its final offset, opening a visible gap under the
          // ring. This second .to() overwrites .y on top of the .x/.z
          // set above (GSAP applies tweens in order), keeping x/z linear
          // and only changing y's curve to match the floor.
          .to(
            ringPosOffsetState,
            {
              y: target.ringPosOffset.y,
              duration: poseDuration,
              ease: "power2.out",
            },
            poseLabel,
          )
          .to(
            ringScaleState,
            { value: target.ringScale, duration: poseDuration, ease: "none" },
            poseLabel,
          )
          .to(
            metalEnvState,
            { value: beat.metalEnvIntensity, duration: 1, ease: "none" },
            label,
          )
          .to(
            gemEnvState,
            { value: beat.gemEnvIntensity, duration: 1, ease: "none" },
            label,
          );

        if (isOnBodyExit) {
          tl.to(
            ringOnBodyState,
            {
              value: beat.ringOnBody ?? ringOnBodyState.value,
              duration: 0.45,
              ease: "power2.in",
            },
            label,
          ).to(
            handEntryState,
            {
              value: beat.handEntry ?? handEntryState.value,
              duration: 0.65,
              ease: "power2.inOut",
            },
            label + "+=0.35",
          );
        } else {
          // Delay + shorten the hand's entry on the floor-fade-out
          // transition so it only starts once the floor is essentially
          // gone (see floorOpacityState tween below, sped up on the
          // same transition via the same floorFadingOutHere flag).
          const handLabel = floorFadingOutHere ? label + "+=0.3" : label;
          const handDuration = floorFadingOutHere ? 0.7 : 1;
          tl.to(
            handEntryState,
            {
              value: beat.handEntry ?? handEntryState.value,
              duration: handDuration,
              ease: "power2.out",
            },
            handLabel,
          ).to(
            ringOnBodyState,
            {
              value: beat.ringOnBody ?? ringOnBodyState.value,
              duration: handDuration,
              ease: "power2.inOut",
            },
            handLabel,
          );
        }

        tl.to(
          floorEntryState,
          {
            value: beat.floorEntry ?? floorEntryState.value,
            duration: 1,
            ease: "power2.out",
          },
          label,
        )
          .to(
            floorOpacityState,
            {
              value: beat.floorOpacity ?? floorOpacityState.value,
              // Fade OUT fast — finishes well before the hand arrives
              // (see handLabel/handDuration above). Fade IN can stay
              // gradual, riding alongside the floor rising into place.
              // NOTE: this must compare BEATS values (prevBeat vs beat),
              // not floorOpacityState.value — at the point this loop
              // runs, the tweens haven't played yet, so
              // floorOpacityState.value is still whatever it was
              // initialized to (0) for every iteration, not the value
              // this transition will actually animate FROM during
              // scroll. Comparing against it here silently always took
              // the "fade in" branch, which is why the floor was still
              // visible well into Beat 3.
              duration: floorFadingOutHere ? 0.35 : 1,
              ease: floorFadingOutHere ? "power1.in" : "none",
            },
            label,
          )
          .to(
            cardsState,
            {
              value: beat.cardsState ?? cardsState.value,
              // Demerge-in waits for the ring to land back home first;
              // demerge-out runs FIRST (cards merge home) and finishes
              // right as poseLabel/poseDuration above kick the ring's
              // own pose into its Beat 5 motion.
              duration: isDemergeIn || isDemergeOut ? 0.5 : 1,
              ease: "power2.inOut",
            },
            isDemergeIn ? label + "+=0.5" : label,
          )
          .to(
            bgState,
            {
              top: beat.bgTop,
              bottom: beat.bgBottom,
              duration: 1,
              ease: "none",
              onUpdate: applyBackground,
            },
            label,
          )
          .fromTo(
            blendState,
            { value: 0 },
            {
              value: 1,
              duration: 1,
              ease: "none",
              onUpdate: () => emitBeatBlend(i - 1, i, blendState.value),
            },
            label,
          );
      }

      function applyBackground() {
        if (bgOverlayRef.current) {
          bgOverlayRef.current.style.background = `linear-gradient(180deg, ${bgState.top} 0%, ${bgState.bottom} 100%)`;
        }
      }

      function emitBeatBlend(fromIndex, toIndex, weight) {
        onBeatBlendUpdate?.({ fromIndex, toIndex, weight });
      }

      currentTickerFn = () => {
        if (!camera || !ring) return;

        // Live dev-panel overrides win over the scroll-tweened values,
        // regardless of which beat is currently active — this is what
        // lets you tune a beat's numbers without scrubbing to it first.
        const ov = poseOverrideRef.current;
        const effCamX = ov.camPos?.x ?? camState.x;
        const effCamY = ov.camPos?.y ?? camState.y;
        const effCamZ = ov.camPos?.z ?? camState.z;
        const effRotX = ov.ringRot?.x ?? rotState.x;
        const effRotY = ov.ringRot?.y ?? rotState.y;
        const effPosOffsetX = ov.ringPosOffset?.x ?? ringPosOffsetState.x;
        const effPosOffsetY = ov.ringPosOffset?.y ?? ringPosOffsetState.y;
        const effPosOffsetZ = ov.ringPosOffset?.z ?? ringPosOffsetState.z;
        const effScale = ov.ringScale ?? ringScaleState.value;

        camera.position.set(effCamX, effCamY, effCamZ);
        // lookAtY lets a beat frame the scene lower/higher on screen
        // WITHOUT steepening the camera's pitch — raising camPos.y alone
        // while always looking at world origin (0,0,0) tilts the camera
        // sharply downward (bad top-down angle on the floor). Panning
        // the lookAt target down by roughly the same amount as camPos.y
        // keeps a shallow, natural viewing angle while still pushing the
        // ring+floor lower in the frame. Defaults to 0 (old behavior)
        // when a beat doesn't specify one.
        const effLookAtY = ov.camPos?.lookAtY ?? camState.lookAtY ?? 0;
        camera.lookAt(0, effLookAtY, 0);

        if (metalMaterial) {
          const trim = metalMaterial.userData?._hdrTrim ?? 1;
          metalMaterial.envMapIntensity = metalEnvState.value * trim;
        }
        gemMaterials.forEach((mat) => {
          if (!("envMapIntensity" in mat)) return;
          const trim = mat.userData?._hdrTrim ?? 1;
          mat.envMapIntensity = gemEnvState.value * trim;
        });

        // Hand slides in from the right as handEntryState eases 0 -> 1.
        if (hand) {
          const entry = handEntryState.value;
          hand.position.x = handRestX + handEntryOffsetX * (1 - entry);
          // Tiny settle-rotation as it arrives, so it doesn't feel like a
          // rigid cardboard cutout sliding in.
          hand.rotation.y = -0.35 + 0.12 * (1 - entry);
          // Belt-and-suspenders: fully hide it once it's close enough to
          // "offscreen" that it shouldn't be contributing to the frame
          // at all, instead of relying purely on position pushing it
          // past the camera's edge (which is what let it peek in on
          // beat 1 before handEntryOffsetX was increased above).
          hand.visible = entry > 0.01;
        }

        // Ring blends between its hero-scene pose (rotState-driven, as
        // before) and sitting on the hand's finger (RING_ON_FINGER, in the
        // hand's local space) as ringOnBodyState eases 0 -> 1.
        const onBody = ringOnBodyState.value;
        if (onBody <= 0.001 || !hand) {
          ring.rotation.set(effRotX, effRotY, 0);
          ring.position.set(
            ringHeroTransform.position.x + effPosOffsetX,
            ringHeroTransform.position.y + effPosOffsetY,
            ringHeroTransform.position.z + effPosOffsetZ,
          );
          ring.scale.setScalar(ringHeroTransform.scale * effScale);

          // TEMP DEBUG — logs whenever the ring's position/scale changes
          // by more than a tiny epsilon between two consecutive frames,
          // which is what a real "jump" looks like at the data level
          // (as opposed to a smooth per-frame delta). Remove once the
          // jump's cause is identified — this is not meant to ship.
          if (window.__ringDebugLast) {
            const last = window.__ringDebugLast;
            const dx = Math.abs(ring.position.x - last.x);
            const dy = Math.abs(ring.position.y - last.y);
            const dz = Math.abs(ring.position.z - last.z);
            const ds = Math.abs(ring.scale.x - last.scale);
            const JUMP_THRESHOLD = 0.02; // world units/frame
            if (
              dx > JUMP_THRESHOLD ||
              dy > JUMP_THRESHOLD ||
              dz > JUMP_THRESHOLD ||
              ds > JUMP_THRESHOLD
            ) {
              console.warn(
                "[RingHero DEBUG] ring pos/scale jump detected:",
                "\n  from:",
                last,
                "\n  to:  ",
                {
                  x: ring.position.x,
                  y: ring.position.y,
                  z: ring.position.z,
                  scale: ring.scale.x,
                },
                "\n  delta:",
                { dx, dy, dz, ds },
                "\n  scrollY:",
                window.scrollY,
              );
            }
          }
          window.__ringDebugLast = {
            x: ring.position.x,
            y: ring.position.y,
            z: ring.position.z,
            scale: ring.scale.x,
          };
        } else {
          // Target = hand's world transform composed with the ring's
          // local on-finger offset. The offset is defined in the hand's
          // LOCAL space, so it must be rotated by the hand's current
          // orientation before being added to the hand's world position —
          // previously this added the raw local numbers directly as world
          // deltas, which only happened to look right at rotation.y = 0
          // and drifted the ring off the finger as soon as the hand
          // rotated during its entry animation.
          const liveCalib = ringOnFingerLiveRef.current;
          const localOffset = new THREE.Vector3(
            liveCalib.position.x,
            liveCalib.position.y,
            liveCalib.position.z,
          ).multiplyScalar(hand.scale.x);
          localOffset.applyEuler(hand.rotation);
          const targetPos = hand.position.clone().add(localOffset);
          const targetScale =
            ringHeroTransform.scale * (1 - onBody) + ringOnFingerScale * onBody;

          ring.position.lerpVectors(
            ringHeroTransform.position,
            targetPos,
            onBody,
          );
          ring.scale.setScalar(targetScale);

          ring.rotation.set(
            THREE.MathUtils.lerp(rotState.x, liveCalib.rotation.x, onBody),
            THREE.MathUtils.lerp(rotState.y, liveCalib.rotation.y, onBody),
            THREE.MathUtils.lerp(0, liveCalib.rotation.z, onBody),
          );
        }

        // Beat 2 — floor rises from below and fades in place. Offset by
        // half the brick's height so its TOP FACE lands at restY (the
        // ring's measured underside), not the box's center — a
        // BoxGeometry's pivot is its center, unlike the old flat plane
        // whose single surface WAS its position. restY/FLOOR_REST_Y is
        // now measured WITH Beat 2's ringPosOffset already baked in (see
        // measureFloorRestY call above), so no extra offset is added
        // here — doing so would double-count it and reintroduce drift.
        if (floor) {
          const fe = floorEntryState.value;
          const fo = floorOpacityState.value;
          const restY = poseOverrideRef.current.floorRestY ?? FLOOR_REST_Y;
          const floorHalfHeight = floor.geometry.parameters.height / 2;
          floor.position.y = THREE.MathUtils.lerp(
            FLOOR_HIDDEN_Y,
            restY - floorHalfHeight,
            fe,
          );
          // X/Z position and rotation are plain overrides (not part of
          // the rise/fade tween) — default to 0 so the floor keeps its
          // original centered, unrotated placement until the panel
          // touches these.
          floor.position.x = poseOverrideRef.current.floorPosX ?? 0;
          floor.position.z = poseOverrideRef.current.floorPosZ ?? 0.26;
          const floorRot = poseOverrideRef.current.floorRot;
          floor.rotation.set(
            floorRot?.x ?? 0,
            floorRot?.y ?? 0,
            floorRot?.z ?? 0,
          );
          floor.material.opacity = fo * 0.85;
          floor.visible = fo > 0.01 || fe > 0.01;
        }

        // Beat 4 — demerge into 3 cards (top/front/side) and back.
        // The main ring itself IS the front card — it eases from hero
        // scale/position down to the front card's scale/z-offset as
        // cardsState -> 1 (instead of shrinking to 0 and being replaced
        // by a 4th clone). Only the top/side clones grow outward from
        // it and shrink back into it on the reverse, matching the
        // storyboard's "2 copies emerge from the 1 that's there".
        const cs = cardsState.value;
        // Live per-card overrides from the demerge/card-layout dev panel
        // (see poseOverrideRef.cardLayout above) — each slot, when set,
        // wins over CARD_LAYOUT's default x/z/rot for that card, matching
        // the same "live wins over baked-in value" pattern as camPos/
        // ringRot/etc elsewhere in this ticker.
        const cardOv = poseOverrideRef.current.cardLayout ?? [null, null, null];
        const liveCard = (layoutIndex) => {
          const base = CARD_LAYOUT[layoutIndex];
          const ov = cardOv[layoutIndex];
          return {
            x: ov?.x ?? base.x,
            y: ov?.y ?? base.y,
            z: ov?.z ?? base.z,
            scale: ov?.scale ?? base.scale,
            rot: {
              x: ov?.rot?.x ?? base.rot.x,
              y: ov?.rot?.y ?? base.rot.y,
              z: ov?.rot?.z ?? base.rot.z,
            },
          };
        };
        // Ring-only offset inside its card slot (does NOT move the
        // outline frame — see cardRingOffset declaration up top).
        const ringOffOv = poseOverrideRef.current.cardRingOffset ?? [
          null,
          null,
          null,
        ];
        const liveRingOffset = (layoutIndex) => {
          const ov = ringOffOv[layoutIndex];
          const def = DEFAULT_CARD_RING_OFFSET[layoutIndex];
          return {
            x: ov?.x ?? def.x,
            y: ov?.y ?? def.y,
            z: ov?.z ?? def.z,
          };
        };
        if (onBody <= 0.001) {
          // Blend FROM the ring's actual current scale/z (whatever
          // effScale/effPosOffsetZ just set a few lines above — including
          // any live dev-panel override) instead of always starting from
          // the bare ringHeroTransform values. At cs=0 this must be a
          // pure no-op on scale/z, or any beat/override that sets a
          // nonzero scale or z-offset gets silently discarded here every
          // frame — previously this always lerped from
          // ringHeroTransform.scale/position.z regardless of cs, which
          // only happened to look right because no BEATS[] entry uses a
          // non-default scale or z-offset yet.
          const front = liveCard(1);
          const frontRingOff = liveRingOffset(1);
          const baseScale = ringHeroTransform.scale * effScale;
          const baseZ = ringHeroTransform.position.z + effPosOffsetZ;
          const frontCardScale = ringHeroTransform.scale * 0.72 * front.scale;
          ring.scale.setScalar(
            THREE.MathUtils.lerp(baseScale, frontCardScale, cs),
          );
          ring.position.z = THREE.MathUtils.lerp(
            baseZ,
            baseZ + front.z + frontRingOff.z,
            cs,
          );
          // X/Y always blend toward the front card's position — safe to
          // leave unconditional (unlike rotation below) because `cs`
          // already gates this to zero everywhere outside Beat 2, and
          // front.x/front.y default to CARD_LAYOUT's own baked-in
          // values (0.03/0) when no override is set, which is
          // indistinguishable from "centered" to the eye. Previously
          // this was gated behind `if (cardOv[1] || ringOffOv[1])`,
          // which was both unnecessary (cs already protects it) and
          // fragile — merging a partial override (e.g. touching ONLY
          // the Y slider) could leave cardOv[1] in a shape where this
          // still evaluated correctly, but any future partial-merge
          // edge case could silently drop Y updates. Removing the gate
          // removes that whole class of bug.
          ring.position.x = THREE.MathUtils.lerp(
            ring.position.x,
            front.x + frontRingOff.x,
            cs,
          );
          ring.position.y = THREE.MathUtils.lerp(
            ring.position.y,
            front.y + frontRingOff.y,
            cs,
          );
          // Rotation stays gated — CARD_LAYOUT's front.rot (0.78, 0, 0)
          // is a deliberately different pose than the ring's normal
          // beat rotation, so applying it unconditionally would spin
          // the front card into that pose by default even with no
          // panel override touched. Only apply once the panel has
          // explicitly set that axis.
          if (cardOv[1]?.rot?.x != null) {
            ring.rotation.x = THREE.MathUtils.lerp(
              ring.rotation.x,
              front.rot.x,
              cs,
            );
          }
          if (cardOv[1]?.rot?.y != null) {
            ring.rotation.y = THREE.MathUtils.lerp(
              ring.rotation.y,
              front.rot.y,
              cs,
            );
          }
          if (cardOv[1]?.rot?.z != null) {
            ring.rotation.z = THREE.MathUtils.lerp(
              ring.rotation.z,
              front.rot.z,
              cs,
            );
          }
        }
        if (cardClones.length) {
          cardClones.forEach(({ mesh, layoutIndex }) => {
            const card = liveCard(layoutIndex);
            const ringOff = liveRingOffset(layoutIndex);
            const visible = cs > 0.01;
            mesh.visible = visible;
            mesh.scale.setScalar(
              ringHeroTransform.scale * 0.72 * card.scale * cs,
            );
            // Ring mesh position = card slot position + ring-only offset,
            // both scaled by cs so the ring still grows in from center
            // during demerge-in/out. The card frame below intentionally
            // does NOT get ringOff — that's what keeps this a "ring
            // position inside the slot" control instead of moving the
            // slot itself.
            mesh.position.set(
              (card.x + ringOff.x) * cs,
              (card.y + ringOff.y) * cs,
              (card.z + ringOff.z) * cs,
            );
            mesh.rotation.set(card.rot.x, card.rot.y, card.rot.z);
          });
          cardFrames.forEach((frame, i) => {
            const card = liveCard(i);
            frame.material.opacity = cs * 0.45;
            frame.position.x = card.x * cs;
            frame.position.y = card.y * cs;
            // z was previously never set here, so the frame stayed at
            // its initial z (-0.15) regardless of the card's Z offset —
            // any Z tuning visually detached the mesh from its frame.
            frame.position.z = card.z * cs - 0.15 * (1 - cs);
            frame.visible = cs > 0.01;
          });
        }
      };
      // Run the ticker once synchronously, right now, before it's ever
      // registered with gsap.ticker. Without this, `ring` gets added to
      // the scene at its raw GLB rotation/position and metalMaterial
      // keeps whatever envMapIntensity buildMetalMaterial() initialized
      // it to — neither is touched until currentTickerFn's first actual
      // callback — but the plain requestAnimationFrame loop in animate()
      // is already rendering every frame regardless of gsap.ticker, so
      // it can render several frames of the raw/unlit ring before GSAP's
      // ticker gets its first tick and snaps everything into place. That
      // snap is the "ring jumps into position on first scroll" bug: it
      // isn't the scroll triggering a jump at all, it's the very first
      // correctly-posed frame finally arriving a beat late.
      currentTickerFn();
      gsap.ticker.add(currentTickerFn);
    }

    let lastFrameTime = performance.now();
    function animate(now) {
      if (disposed) return;
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(
        ((now ?? performance.now()) - lastFrameTime) / 1000,
        0.1,
      );
      lastFrameTime = now ?? performance.now();
      updateCursorDof(dt);
      updateFingerProbe();
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
      if (fingerProbeEnabled) {
        window.removeEventListener("pointermove", onProbePointerMove);
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
      skinMaterial?.dispose?.();
      floor?.material?.dispose?.();
      cardFrames.forEach((f) => f.material?.dispose?.());
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
    handGlbUrl,
    handSkinTone,
    handTextureUrl,
    handNormalUrl,
    handRoughnessUrl,
    fingerProbeEnabled,
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
          zIndex: 2,
          width: "100vw",
          height: "100vh",
          display: "block",
          pointerEvents: "none",
        }}
      />
      {fingerProbeEnabled && (
        <>
          {/* Small crosshair dot placed at the last raycast hit point,
              projected to screen space every frame in updateFingerProbe(). */}
          <div
            ref={probeDotRef}
            style={{
              position: "fixed",
              zIndex: 60,
              width: 10,
              height: 10,
              marginLeft: -5,
              marginTop: -5,
              borderRadius: "50%",
              border: "2px solid #4da3ff",
              background: "rgba(77,163,255,0.35)",
              pointerEvents: "none",
              display: "none",
            }}
          />
          <pre
            ref={probeReadoutRef}
            style={{
              position: "fixed",
              bottom: 16,
              left: 16,
              zIndex: 60,
              margin: 0,
              padding: "10px 12px",
              background: "rgba(20,20,22,0.85)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              color: "#fff",
              fontSize: 11,
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
              pointerEvents: "none",
              maxWidth: 320,
            }}
          >
            finger probe: move your cursor over the hand
          </pre>
        </>
      )}
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
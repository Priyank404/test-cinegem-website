/**
 * HeroPage2.jsx
 * -------------------------------------------------------------------------
 * Full page that wires up RingHero.jsx as a fixed 3D scroll-background,
 * with real DOM content scrolling on top of it — same structure as
 * peachweb.io (fixed canvas behind, tall content div drives scroll).
 *
 * Uses the @/ alias (matches your vite.config.js / jsconfig setup).
 * Plug this into your router as a route/page, e.g. in App.jsx:
 *
 *   import HeroPage2 from '@/pages/HeroPage2'
 *   <Route path="/hero2" element={<HeroPage2 />} />
 *
 * Nav bar, section copy, and CTA are placeholders — replace with your
 * real portfolio content. Keep the 4 <section> blocks in sync with the
 * 4 BEATS defined in RingHero.jsx: add/remove both together.
 *
 * Dev-only tuning panel: set SHOW_DEV_PANEL to false (or delete the
 * <MaterialDevPanel /> usage) before shipping — it's a plain overlay
 * with no dependency beyond React state, fine during dev but not
 * something you want visible to site visitors. The HDR rotation/scale/
 * power/gamma sliders mirror your production viewer's dev controls
 * (useHdrSync.js) 1:1, both in field names and in the underlying math
 * (see hdrControls.js) — same defaults (100/100/100 = neutral, 0° =
 * no rotation).
 * -------------------------------------------------------------------------
 */

import { useState, useRef, useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import RingHero, { BEATS } from "@/components/three/RingHero";
import BeatBackground from "@/components/three/BeatBackground";
import SideRaysBeatLayer from "@/components/effects/SideRaysBeatLayer";
import SideRays from "@/components/effects/SideRays";
import LightRays from "@/components/effects/LightRays";
import CenterRays from "@/components/effects/CenterRays";

// ---------------------------------------------------------------------
// Beat 2 background-effect switch. Flip BEAT2_EFFECT to try a different
// rays component in the same slot — everything else (beatIndex, the
// blend-weight crossfade, z-index) stays identical because it all lives
// in SideRaysBeatLayer, not here. Add a new key to BEAT2_EFFECT_CONFIGS
// to try something else later.
// ---------------------------------------------------------------------
const BEAT2_EFFECT = "lightRays"; // "sideRays" | "lightRays" | "centerRays"

const BEAT2_EFFECT_CONFIGS = {
  sideRays: {
    component: SideRays,
    props: {
      speed: 5,
      rayColor1: "#70c41c",
      rayColor2: "#10B981",
      intensity: 3,
      spread: 3,
      origin: "top-right",
      tilt: -60,
      saturation: 1.5,
      blend: 0.73,
      falloff: 0.5,
      opacity: 1,
    },
  },
  lightRays: {
    component: LightRays,
    props: {
      raysOrigin: "top-center",
      raysColor: "#6cd068",
      raysSpeed: 1,
      lightSpread: 2,
      rayLength: 3,
      followMouse: true,
      mouseInfluence: 0.1,
      noiseAmount: 0,
      distortion: 0,
      pulsating: false,
      fadeDistance: 1,
      saturation: 1.8,
    },
  },
  centerRays: {
    component: CenterRays,
    props: {
      raysColor: "#6cd068",
      raysSpeed: 1,
      rayCount: 12,
      lightSpread: 1,
      rayLength: 1.2,
      followMouse: true,
      mouseInfluence: 0.15,
      noiseAmount: 0,
      distortion: 0,
      pulsating: false,
      fadeDistance: 1,
      saturation: 1.8,
    },
  },
};
import ScrollDebugHud from "@/components/three/ScrollDebugHud";
import { metalPresets } from "@/components/three/metalMaterials";
import "./HeroPage2.css";

gsap.registerPlugin(ScrollTrigger);

const SHOW_DEV_PANEL = true;

// Defaults for a single HDR control group — reused for both metal and gem.
const DEFAULT_HDR_CONFIG = {
  rotation: 0,
  rotationY: 0,
  scale: 100,
  power: 100,
  gamma: 100,
};

export default function HeroPage2() {
  // Smooth-scroll layer — RingHero.jsx's docblock mentions Lenis as part
  // of the intended stack, but nothing was ever wiring it up: the page
  // was running on raw native scroll, so wheel/trackpad input arrived in
  // whatever discrete chunks the OS/browser delivers (this is especially
  // chunky on Windows mouse wheels — one "notch" can be a big scrollY
  // jump). GSAP's ScrollTrigger scrub was just reading that chunky
  // window.scrollY directly, so no scrub value alone could fully smooth
  // it out — a low scrub (snappy) exposed every raw step, a high scrub
  // (laggy) papered over it but felt like a delayed "catch-up" snap
  // instead. Lenis intercepts the wheel/touch events itself and emits a
  // continuously-interpolated scroll position every animation frame, so
  // there's an actually-smooth signal for ScrollTrigger to read in the
  // first place, regardless of scrub. lenis.on("scroll") calling
  // ScrollTrigger.update() is the documented way to keep the two in
  // sync (see gsap.com/resources/Lenis) — without it, Lenis would
  // smooth the page's visual scroll but ScrollTrigger would still be
  // watching raw window.scrollY on its own timer and the two could
  // drift out of step.
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      // Kept intentionally light — this only interpolates native
      // scroll input into something continuous; RingHero's own
      // ScrollTrigger scrub value is what actually controls how the
      // 3D scene lags/tracks that (now-smooth) scroll position.
    });

    // Drive Lenis from GSAP's OWN ticker instead of a separate, competing
    // requestAnimationFrame loop. Two independent rAF loops (one for
    // Lenis, one for gsap.ticker/currentTickerFn in RingHero.jsx) aren't
    // guaranteed to fire in the same order every frame — occasionally
    // gsap.ticker's callback (which reads the scrub-tweened camera/ring
    // state and writes it to the 3D scene) could run BEFORE Lenis had
    // pushed that frame's scroll update into ScrollTrigger, using
    // slightly stale scroll data for one frame. That's a plausible
    // source of an intermittent position/size snap — most frames line
    // up fine, occasionally one doesn't, which matches "the jump comes
    // back" (not present every time, only some scrolls). Routing both
    // through the same ticker guarantees lenis.raf() runs, then
    // ScrollTrigger.update() picks it up, then RingHero's own ticker
    // reads the now-current value, all within one single tick — this is
    // the integration pattern GSAP's own docs recommend for Lenis
    // (gsap.com/resources/Lenis). gsap.ticker's time argument is
    // milliseconds already multiplied out; Lenis expects raw ms too, so
    // no conversion is needed (`time * 1000` is only needed if using
    // gsap.ticker's "raw" deltaRatio-based frame arg — passing the
    // already-ms `time` GSAP hands the callback works directly).
    function lenisTick(time) {
      lenis.raf(time * 1000);
    }
    gsap.ticker.add(lenisTick);
    // Let Lenis solely own scroll-driven timing instead of GSAP silently
    // skipping ticks after a tab goes idle/backgrounded — this avoids a
    // "jump" the moment you return to the tab, where GSAP would
    // otherwise try to catch up several skipped frames at once.
    gsap.ticker.lagSmoothing(0);

    // Keep ScrollTrigger's internal scroll tracking synced to Lenis's
    // interpolated position every time Lenis emits a scroll update,
    // rather than trusting its own separate scroll listener.
    lenis.on("scroll", ScrollTrigger.update);

    return () => {
      lenis.off("scroll", ScrollTrigger.update);
      gsap.ticker.remove(lenisTick);
      lenis.destroy();
    };
  }, []);

  // Live-tunable knobs, independent per element — this is what actually
  // proves metal and gem aren't cross-contaminating each other's HDR.
  // These two files are the ones that actually exist in /public/hdr —
  // the previous "/hdr/studio_small.hdr" default 404'd, which is why
  // RGBELoader was throwing "Bad File Format" and the ring never
  // rendered at all.
  const [metalPresetKey, setMetalPresetKey] = useState("yellowGold");
  const [metalHdrUrl, setMetalHdrUrl] = useState(
    "/hdr/env_metal_001_d01c4504e0.hdr",
  );
  const [gemHdrUrl, setGemHdrUrl] = useState(
    "/hdr/LUMA-Unsaid-R_D-DIA-Mirrored-Automation-shapes-Wave-R3.hdr",
  );
  const [gemMode, setGemMode] = useState(null); // null = preset default ("refraction"), or "matte"
  const [meshDebugList, setMeshDebugList] = useState([]);

  // Rotation / scale / power / gamma — same shape as your viewer's
  // useHdrSync.js, one group per element.
  const [metalHdrConfig, setMetalHdrConfig] = useState(DEFAULT_HDR_CONFIG);
  const [gemHdrConfig, setGemHdrConfig] = useState(DEFAULT_HDR_CONFIG);

  const [postFxEnabled, setPostFxEnabled] = useState(true);
  const [panelVisible, setPanelVisible] = useState(true);
  // Debug finger-probe toggle — see RingHero's fingerProbeEnabled prop.
  // Point at the hand in the on-body beat and read off the exact
  // RING_ON_FINGER coordinate under the cursor.
  const [fingerProbeEnabled, setFingerProbeEnabled] = useState(false);

  // Ring-on-finger live calibration — RingHero hands us get/set functions
  // once its scene is ready (see onRingCalibrationReady below). We store
  // them in a ref (not state) since calling them shouldn't trigger a
  // React re-render — the 3D scene updates itself every frame regardless.
  const ringCalibRef = useRef(null);
  const [calibValues, setCalibValues] = useState({
    x: -5.842,
    y: 12.609,
    z: 4.253,
    rx: -1.425,
    ry: 0.687,
    rz: -0.785,
    boreRatio: 1.08,
  });
  const [calibPanelVisible, setCalibPanelVisible] = useState(true);

  // Standalone floor panel — independent of the Beat Coordinates panel's
  // "Live override" workflow (that one only applies while a beat is
  // selected + live is checked, and is really meant for the full
  // cam/ring/floor tuning pass). This one drives the floor's full
  // position (X/Y/Z) and rotation directly, any time, via the
  // setFloorRestYOverride/setFloorPosOverride/setFloorRotOverride API
  // RingHero exposes — works standalone without touching camera/ring/
  // beat state at all.
  const [floorValues, setFloorValues] = useState({
    x: 0,
    y: -0.62,
    z: 0,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
  });
  const [floorPanelVisible, setFloorPanelVisible] = useState(true);

  function updateFloor(partial) {
    const next = { ...floorValues, ...partial };
    setFloorValues(next);
    poseApiRef.current?.setFloorRestYOverride(next.y);
    poseApiRef.current?.setFloorPosOverride({ x: next.x, z: next.z });
    poseApiRef.current?.setFloorRotOverride({
      x: next.rotX,
      y: next.rotY,
      z: next.rotZ,
    });
  }

  // Beat coordinate panel — works across ALL beats (not just on-body).
  // poseApiRef holds the jumpToBeat/setCamOverride/etc functions RingHero
  // hands back once its scroll timeline is set up (see onPoseOverrideReady
  // below). coordPanelVisible/coordValues drive the panel UI itself.
  const poseApiRef = useRef(null);
  // BeatBackground's imperative handle — RingHero calls onBeatBlendUpdate
  // every scroll-scrubbed frame, we forward it straight through via ref
  // (no state) so the interactive background layer stays in lockstep
  // with the ring's own beat position without an extra render cycle.
  const beatBackgroundRef = useRef(null);
  const sideRaysRef = useRef(null);
  // ScrollDebugHud's imperative handle — see onScrollDebugUpdate below.
  const scrollDebugRef = useRef(null);
  const [coordPanelVisible, setCoordPanelVisible] = useState(true);
  const [coordValues, setCoordValues] = useState({
    beatIndex: 0,
    live: false,
    camX: 0,
    camY: 0.2,
    camZ: 4.2,
    rotX: 0.15,
    rotY: 0,
    posX: 0,
    posY: 0,
    posZ: 0,
    scale: 1,
    floorRestY: -0.62,
  });
  // Which beats currently have a saved keyframe — drives the badge on
  // each beat-select button. Synced from RingHero's beatKeyframesRef via
  // getKeyframeSnapshot() right after every save/clear.
  const [savedBeats, setSavedBeats] = useState(new Set());

  function updateCalib(partial) {
    const next = { ...calibValues, ...partial };
    setCalibValues(next);
    ringCalibRef.current?.setRingOnFinger({
      position: { x: next.x, y: next.y, z: next.z },
      rotation: { x: next.rx, y: next.ry, z: next.rz },
      boreToFingerRatio: next.boreRatio,
    });
  }

  // Selecting a beat prefills the sliders from that beat's current
  // BEATS[] values (read-only reference), UNLESS a keyframe was already
  // saved for it — in that case prefill from the saved keyframe instead,
  // so re-opening a beat you already tuned shows your saved numbers, not
  // the original defaults.
  function selectCoordBeat(index) {
    const b = BEATS[index];
    const snap = poseApiRef.current?.getKeyframeSnapshot?.() ?? {};
    const kf = snap[index];
    setCoordValues((prev) => ({
      ...prev,
      beatIndex: index,
      camX: kf?.camPos?.x ?? b.camPos.x,
      camY: kf?.camPos?.y ?? b.camPos.y,
      camZ: kf?.camPos?.z ?? b.camPos.z,
      rotX: kf?.ringRot?.x ?? b.ringRot.x,
      rotY: kf?.ringRot?.y ?? b.ringRot.y,
      posX: kf?.ringPosOffset?.x ?? 0,
      posY: kf?.ringPosOffset?.y ?? 0,
      posZ: kf?.ringPosOffset?.z ?? 0,
      scale: kf?.ringScale ?? 1,
    }));
    poseApiRef.current?.jumpToBeat(index);
  }

  function applyLiveOverride(next) {
    poseApiRef.current?.setCamOverride({
      x: next.camX,
      y: next.camY,
      z: next.camZ,
    });
    poseApiRef.current?.setRingRotOverride({ x: next.rotX, y: next.rotY });
    poseApiRef.current?.setRingPosOffsetOverride({
      x: next.posX,
      y: next.posY,
      z: next.posZ,
    });
    poseApiRef.current?.setRingScaleOverride(next.scale);
    poseApiRef.current?.setFloorRestYOverride(next.floorRestY);
  }

  function updateCoord(partial) {
    const next = { ...coordValues, ...partial };
    setCoordValues(next);
    if (!next.live) return;
    applyLiveOverride(next);
  }

  function toggleCoordLive(live) {
    if (live) {
      // Seed from wherever the scroll-tweened pose actually is right
      // now (whatever beat/transition is currently on screen), not
      // whatever stale values happen to be sitting in coordValues —
      // otherwise flipping "live" on snaps the ring/camera to those
      // stale numbers (e.g. Beat 1's defaults if no beat was ever
      // selected in the panel), which reads as "enabling override
      // changes the coordinates from default."
      const current = poseApiRef.current?.getCurrentPose?.();
      const next = {
        ...coordValues,
        live,
        ...(current
          ? {
              camX: current.camPos.x,
              camY: current.camPos.y,
              camZ: current.camPos.z,
              rotX: current.ringRot.x,
              rotY: current.ringRot.y,
              posX: current.ringPosOffset.x,
              posY: current.ringPosOffset.y,
              posZ: current.ringPosOffset.z,
              scale: current.ringScale,
              floorRestY: current.floorRestY,
            }
          : {}),
      };
      setCoordValues(next);
      applyLiveOverride(next);
    } else {
      const next = { ...coordValues, live };
      setCoordValues(next);
      poseApiRef.current?.setCamOverride(null);
      poseApiRef.current?.setRingRotOverride(null);
      poseApiRef.current?.setRingPosOffsetOverride(null);
      poseApiRef.current?.setRingScaleOverride(null);
      poseApiRef.current?.setFloorRestYOverride(null);
    }
  }

  function refreshSavedBeats() {
    const snap = poseApiRef.current?.getKeyframeSnapshot?.() ?? {};
    setSavedBeats(new Set(Object.keys(snap).map(Number)));
  }

  // Persists the current slider values as beat `beatIndex`'s keyframe —
  // plays back on scroll from then on, no "live" toggle required. Does
  // NOT touch the live-override state, so you can keep previewing while
  // stacking up saves across multiple beats.
  function saveCoordKeyframe() {
    const { beatIndex, camX, camY, camZ, rotX, rotY, posX, posY, posZ, scale } =
      coordValues;
    poseApiRef.current?.saveKeyframe(beatIndex, {
      camPos: { x: camX, y: camY, z: camZ },
      ringRot: { x: rotX, y: rotY },
      ringPosOffset: { x: posX, y: posY, z: posZ },
      ringScale: scale,
    });
    refreshSavedBeats();
  }

  function clearCoordKeyframe() {
    poseApiRef.current?.clearKeyframe(coordValues.beatIndex);
    refreshSavedBeats();
  }

  return (
    <div className="hero2-page">
      {/* Per-beat interactive Three.js background — sits behind the ring
          canvas but above the plain gradient (see z-index comments in
          BeatBackground.jsx / RingHero.jsx). Crossfades using the exact
          blend weight RingHero reports via onBeatBlendUpdate below, so
          it never drifts from the ring's own scroll position. */}
      <BeatBackground ref={beatBackgroundRef} />

      {/* React Bits SideRays, pinned as a fixed layer that only fades in
          during Beat 2 (index 1) — see SideRaysBeatLayer.jsx for how the
          crossfade weight is derived from onBeatBlendUpdate below. */}
      <SideRaysBeatLayer
        ref={sideRaysRef}
        beatIndex={1}
        as={BEAT2_EFFECT_CONFIGS[BEAT2_EFFECT].component}
        {...BEAT2_EFFECT_CONFIGS[BEAT2_EFFECT].props}
      />

      {/* Live scroll/beat readout — bottom-left HUD, dev-only. */}
      <ScrollDebugHud ref={scrollDebugRef} />

      {/* Fixed 3D background — canvas + gradient overlay, pinned behind
          everything else via z-index (see RingHero.jsx inline styles) */}
      <RingHero
        glbUrl="/models/ring-draco.glb"
        metalHdrUrl={metalHdrUrl}
        gemHdrUrl={gemHdrUrl}
        metalPreset={metalPresets[metalPresetKey]}
        gemMaterialTypeOverride={gemMode}
        dracoDecoderPath="/draco/"
        scrollContainerSelector="#scroll-content"
        onMeshesClassified={setMeshDebugList}
        metalHdrRotation={metalHdrConfig.rotation}
        metalHdrRotationY={metalHdrConfig.rotationY}
        metalHdrScale={metalHdrConfig.scale}
        metalHdrPower={metalHdrConfig.power}
        metalHdrGamma={metalHdrConfig.gamma}
        gemHdrRotation={gemHdrConfig.rotation}
        gemHdrRotationY={gemHdrConfig.rotationY}
        gemHdrScale={gemHdrConfig.scale}
        gemHdrPower={gemHdrConfig.power}
        gemHdrGamma={gemHdrConfig.gamma}
        postFxEnabled={postFxEnabled}
        handGlbUrl="/models/half_hand.glb"
        fingerProbeEnabled={fingerProbeEnabled}
        onRingCalibrationReady={(api) => {
          ringCalibRef.current = api;
        }}
        onPoseOverrideReady={(api) => {
          poseApiRef.current = api;
        }}
        onBeatBlendUpdate={(blend) => {
          beatBackgroundRef.current?.setBlend(blend);
          sideRaysRef.current?.setBlend(blend);
        }}
        onScrollDebugUpdate={(info) => {
          scrollDebugRef.current?.setDebug(info);
        }}
      />

      {SHOW_DEV_PANEL && (
        <button
          onClick={() => setFingerProbeEnabled((v) => !v)}
          style={{
            position: "fixed",
            top: 84,
            right: 480,
            zIndex: 51,
            background: fingerProbeEnabled
              ? "rgba(77,163,255,0.25)"
              : "rgba(20,20,22,0.9)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 8,
            padding: "8px 12px",
            color: "#fff",
            fontSize: 11,
            fontFamily: "monospace",
            cursor: "pointer",
            backdropFilter: "blur(6px)",
          }}
        >
          {fingerProbeEnabled ? "Hide finger probe" : "Show finger probe"}
        </button>
      )}

      {SHOW_DEV_PANEL && calibPanelVisible && (
        <RingCalibrationPanel
          values={calibValues}
          onChange={updateCalib}
          onHide={() => setCalibPanelVisible(false)}
        />
      )}
      {SHOW_DEV_PANEL && !calibPanelVisible && (
        <button
          onClick={() => setCalibPanelVisible(true)}
          style={{
            position: "fixed",
            top: 84,
            right: 310,
            zIndex: 51,
            background: "rgba(20,20,22,0.9)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 8,
            padding: "8px 12px",
            color: "#fff",
            fontSize: 11,
            fontFamily: "monospace",
            cursor: "pointer",
            backdropFilter: "blur(6px)",
          }}
        >
          Show ring calibration
        </button>
      )}

      {SHOW_DEV_PANEL && floorPanelVisible && (
        <FloorCalibrationPanel
          values={floorValues}
          onChange={updateFloor}
          onHide={() => setFloorPanelVisible(false)}
        />
      )}
      {SHOW_DEV_PANEL && !floorPanelVisible && (
        <button
          onClick={() => setFloorPanelVisible(true)}
          style={{
            position: "fixed",
            top: 84,
            right: 750,
            zIndex: 51,
            background: "rgba(20,20,22,0.9)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 8,
            padding: "8px 12px",
            color: "#fff",
            fontSize: 11,
            fontFamily: "monospace",
            cursor: "pointer",
            backdropFilter: "blur(6px)",
          }}
        >
          Show floor calibration
        </button>
      )}

      {SHOW_DEV_PANEL && coordPanelVisible && (
        <BeatCoordPanel
          values={coordValues}
          savedBeats={savedBeats}
          onSelectBeat={selectCoordBeat}
          onChange={updateCoord}
          onToggleLive={toggleCoordLive}
          onSave={saveCoordKeyframe}
          onClear={clearCoordKeyframe}
          onHide={() => setCoordPanelVisible(false)}
        />
      )}
      {SHOW_DEV_PANEL && !coordPanelVisible && (
        <button
          onClick={() => setCoordPanelVisible(true)}
          style={{
            position: "fixed",
            top: 84,
            right: 590,
            zIndex: 51,
            background: "rgba(20,20,22,0.9)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 8,
            padding: "8px 12px",
            color: "#fff",
            fontSize: 11,
            fontFamily: "monospace",
            cursor: "pointer",
            backdropFilter: "blur(6px)",
          }}
        >
          Show beat coords
        </button>
      )}

      {SHOW_DEV_PANEL && (
        <>
          {/* Always-visible toggle — stays on screen even when the panel
              itself is hidden, so there's a way back in. Positioned above
              where the panel sits (bottom-right) so it doesn't overlap it. */}
          <button
            onClick={() => setPanelVisible((v) => !v)}
            style={{
              position: "fixed",
              // Nav bar occupies top:0 with ~24px vertical padding plus
              // button height, so this sits clear below it rather than
              // overlapping the "Get in touch" button in the corner.
              top: 84,
              right: 20,
              zIndex: 51,
              background: "rgba(20,20,22,0.9)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              padding: "8px 12px",
              color: "#fff",
              fontSize: 11,
              fontFamily: "monospace",
              cursor: "pointer",
              backdropFilter: "blur(6px)",
            }}
          >
            {panelVisible ? "Hide dev panel" : "Show dev panel"}
          </button>

          {panelVisible && (
            <MaterialDevPanel
              metalPresetKey={metalPresetKey}
              setMetalPresetKey={setMetalPresetKey}
              metalHdrUrl={metalHdrUrl}
              setMetalHdrUrl={setMetalHdrUrl}
              gemHdrUrl={gemHdrUrl}
              setGemHdrUrl={setGemHdrUrl}
              gemMode={gemMode}
              setGemMode={setGemMode}
              meshDebugList={meshDebugList}
              metalHdrConfig={metalHdrConfig}
              setMetalHdrConfig={setMetalHdrConfig}
              gemHdrConfig={gemHdrConfig}
              setGemHdrConfig={setGemHdrConfig}
              postFxEnabled={postFxEnabled}
              setPostFxEnabled={setPostFxEnabled}
            />
          )}
        </>
      )}

      {/* Simple fixed nav, sits above the canvas */}
      <nav className="hero2-nav">
        <span className="hero2-logo">Your Name</span>
        <div className="hero2-nav-links">
          <a href="#work">Work</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </div>
        <a href="#contact" className="hero2-cta-btn">
          Get in touch →
        </a>
      </nav>

      {/* Tall scrollable content — its height drives the ScrollTrigger
          timeline inside RingHero. Must match id used in
          scrollContainerSelector prop above. */}
      {/* One <section> per BEATS[i] entry in RingHero.jsx — keep both in
          sync (see docs/HERO2_5BEAT_PRD.md). 5 beats: idle -> floor ->
          on-body -> demerge/cards -> standing spin. */}
      <div id="scroll-content" className="hero2-scroll-content">
        {/* Beat 1 — idle ring */}
        <section className="hero2-section">
          <div className="hero2-section-inner">
            <h1>
              Crafted in
              <br />
              3D. Rendered
              <br />
              in real time.
            </h1>
            <p>
              A portfolio built the same way the jewelry it showcases is made —
              precisely, and with light doing most of the work.
            </p>
          </div>
        </section>

        {/* Beat 2 — floor rises, ring rests on it, floor fades out */}
        <section id="work" className="hero2-section">
          <div className="hero2-section-inner align-right">
            <h2>Grounded in the details</h2>
            <p>
              From render automation pipelines to real-time WebGL viewers — the
              same eye for material and light, just running in a browser instead
              of a render queue.
            </p>
          </div>
        </section>

        {/* Beat 3 — on-body reveal */}
        <section id="onbody" className="hero2-section">
          <div className="hero2-section-inner align-right">
            <h2>Seen the way it'll be worn</h2>
            <p>
              Off the mount and onto the hand — the same ring, the same light,
              now read against skin instead of a studio backdrop.
            </p>
            <a
              href="/onbody"
              className="hero2-cta-btn"
              style={{ marginTop: 20 }}
            >
              Full on-body gallery →
            </a>
          </div>
        </section>

        {/* Beat 4 — demerge into top / front / side view cards */}
        <section id="views" className="hero2-section">
          <div className="hero2-section-inner">
            <h2>Every angle, considered</h2>
            <p>
              Top, front, and side — the same render, the same materials, broken
              out the way a product page needs them.
            </p>
          </div>
        </section>

        {/* Beat 5 — standing spin, closing beat */}
        <section id="contact" className="hero2-section hero2-section-cta">
          <div className="hero2-section-inner">
            <h2>Let's build something</h2>
            <p>Available for freelance and full-time roles.</p>
            <a href="mailto:you@example.com" className="hero2-cta-btn large">
              Say hello →
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * MaterialDevPanel
 * -------------------------------------------------------------------------
 * Floating overlay for live-tuning metal preset, per-element HDR URLs,
 * per-element HDR rotation/scale/power/gamma (mirrors your viewer's dev
 * controls), post-processing toggle, and gem material mode while you're
 * developing. Pure React state, no extra deps. Remove or hide
 * (SHOW_DEV_PANEL = false) before shipping.
 * -------------------------------------------------------------------------
 */
/**
 * RingCalibrationPanel
 * -------------------------------------------------------------------------
 * Live sliders for the ring's on-finger position/rotation/scale-ratio
 * (RING_ON_FINGER in RingHero.jsx). Moves the ring in real time as you
 * drag — scroll to the on-body beat (3rd section) to see it while
 * adjusting. Values are also logged to the console (via RingHero's
 * recomputeRingOnFingerScale) so you can copy the final numbers back
 * into RING_ON_FINGER's default in RingHero.jsx once you're happy, and
 * then remove this panel for production.
 * -------------------------------------------------------------------------
 */
function RingCalibrationPanel({ values, onChange, onHide }) {
  const row = (label, key, min, max, step) => (
    <label style={{ display: "block", marginBottom: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 2,
        }}
      >
        <span>{label}</span>
        <span style={{ opacity: 0.6 }}>{values[key]}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={values[key]}
        onChange={(e) => onChange({ [key]: Number(e.target.value) })}
        style={{ width: "100%" }}
      />
    </label>
  );

  const codeSnippet = `position: { x: ${values.x}, y: ${values.y}, z: ${values.z} },
rotation: { x: ${values.rx}, y: ${values.ry}, z: ${values.rz} },
boreToFingerRatio: ${values.boreRatio},`;

  return (
    <div
      style={{
        position: "fixed",
        top: 84,
        right: 310,
        zIndex: 51,
        background: "rgba(20,20,22,0.92)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 10,
        padding: "14px 16px",
        color: "#fff",
        fontSize: 12,
        fontFamily: "monospace",
        width: 260,
        maxHeight: "85vh",
        overflowY: "auto",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 12, opacity: 0.8 }}>
          RING-ON-FINGER CALIBRATION
        </span>
        <button
          onClick={onHide}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            opacity: 0.6,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ opacity: 0.55, marginBottom: 10, lineHeight: 1.4 }}>
        Scroll to the 3rd section ("Seen the way it'll be worn") to see the ring
        move as you drag these.
      </div>

      <div style={{ opacity: 0.7, marginBottom: 4 }}>
        Position (hand-local space)
      </div>
      {row("X (left/right on finger)", "x", -10, 10, 0.02)}
      {row("Y (up/down the finger)", "y", -15, 15, 0.02)}
      {row("Z (toward/away from palm)", "z", -10, 10, 0.02)}

      <div style={{ opacity: 0.7, marginBottom: 4, marginTop: 10 }}>
        Rotation (radians)
      </div>
      {row("Rot X", "rx", -3.14, 3.14, 0.01)}
      {row("Rot Y", "ry", -3.14, 3.14, 0.01)}
      {row("Rot Z", "rz", -3.14, 3.14, 0.01)}

      <div style={{ opacity: 0.7, marginBottom: 4, marginTop: 10 }}>Fit</div>
      {row("Bore-to-finger ratio", "boreRatio", 0.8, 2, 0.01)}

      <div style={{ marginTop: 12, marginBottom: 4, opacity: 0.55 }}>
        Copy into RING_ON_FINGER once happy:
      </div>
      <pre
        style={{
          background: "rgba(255,255,255,0.06)",
          padding: "8px 10px",
          borderRadius: 6,
          fontSize: 10,
          whiteSpace: "pre-wrap",
          margin: 0,
        }}
      >
        {codeSnippet}
      </pre>
    </div>
  );
}

/**
 * FloorCalibrationPanel
 * -------------------------------------------------------------------------
 * Standalone floor control — full X/Y/Z position and X/Y/Z rotation,
 * driving the floor directly via setFloorRestYOverride/setFloorPosOverride/
 * setFloorRotOverride, independent of the Beat Coordinates panel's
 * beat-select + live-override workflow. Works any time (RingHero applies
 * these overrides unconditionally every tick, see the floor block in
 * RingHero.jsx's ticker), though the floor is only actually visible
 * during/around Beat 2 (floorEntry/floorOpacity > 0), so scroll there to
 * see the effect. Once happy, copy the printed values into RingHero.jsx —
 * Y maps to FLOOR_REST_Y_MANUAL_OVERRIDE (see the comment beside
 * FLOOR_REST_Y's declaration), X/Z/rotation map to the floor mesh's
 * initial position.x/.z and rotation right after it's created.
 * -------------------------------------------------------------------------
 */
function FloorCalibrationPanel({ values, onChange, onHide }) {
  const row = (label, key, min, max, step) => (
    <label style={{ display: "block", marginBottom: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 2,
        }}
      >
        <span>{label}</span>
        <span style={{ opacity: 0.6 }}>{values[key]}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={values[key]}
        onChange={(e) => onChange({ [key]: Number(e.target.value) })}
        style={{ width: "100%" }}
      />
    </label>
  );

  const codeSnippet = `// Y — set FLOOR_REST_Y_MANUAL_OVERRIDE in RingHero.jsx:
FLOOR_REST_Y_MANUAL_OVERRIDE = ${values.y};
// X/Z — set on the floor mesh right after it's created:
floor.position.x = ${values.x};
floor.position.z = ${values.z};
// Rotation (radians):
floor.rotation.set(${values.rotX}, ${values.rotY}, ${values.rotZ});`;

  return (
    <div
      style={{
        position: "fixed",
        top: 84,
        right: 750,
        zIndex: 51,
        background: "rgba(20,20,22,0.92)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 10,
        padding: "14px 16px",
        color: "#fff",
        fontSize: 12,
        fontFamily: "monospace",
        width: 280,
        maxHeight: "85vh",
        overflowY: "auto",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 12, opacity: 0.8 }}>
          FLOOR CALIBRATION
        </span>
        <button
          onClick={onHide}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            opacity: 0.6,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ opacity: 0.55, marginBottom: 10, lineHeight: 1.4 }}>
        Scroll to Beat 2 ("the floor rises") to see this. Full position +
        rotation control over the floor slab.
      </div>

      <div style={{ opacity: 0.7, marginBottom: 4 }}>Position</div>
      {row("X (left/right)", "x", -3, 3, 0.005)}
      {row("Y (up/down — top face height)", "y", -2, 1, 0.005)}
      {row("Z (toward/away from camera)", "z", -3, 3, 0.005)}

      <div style={{ opacity: 0.7, marginBottom: 4, marginTop: 10 }}>
        Rotation (radians)
      </div>
      {row("Rot X (tilt forward/back)", "rotX", -1.57, 1.57, 0.005)}
      {row("Rot Y (spin)", "rotY", -3.14, 3.14, 0.005)}
      {row("Rot Z (roll)", "rotZ", -1.57, 1.57, 0.005)}

      <div style={{ marginTop: 12, marginBottom: 4, opacity: 0.55 }}>
        Copy into RingHero.jsx once happy:
      </div>
      <pre
        style={{
          background: "rgba(255,255,255,0.06)",
          padding: "8px 10px",
          borderRadius: 6,
          fontSize: 10,
          whiteSpace: "pre-wrap",
          margin: 0,
        }}
      >
        {codeSnippet}
      </pre>
    </div>
  );
}

/**
 * BeatCoordPanel
 * -------------------------------------------------------------------------
 * Live camera-position / ring-rotation / floor-height tuning that works
 * across ALL 5 beats, not just the on-body one. Pick a beat (jumps the
 * scroll there and prefills sliders from that beat's current BEATS[]
 * values), flip "Live override" on, and drag — RingHero applies these on
 * top of the scroll-tweened values every frame (see poseOverrideRef in
 * RingHero.jsx). Read the code snippet at the bottom and paste the
 * numbers back into the matching BEATS[i] entry once you're happy;
 * sliders never mutate BEATS directly.
 * -------------------------------------------------------------------------
 */
function BeatCoordPanel({
  values,
  savedBeats,
  onSelectBeat,
  onChange,
  onToggleLive,
  onSave,
  onClear,
  onHide,
}) {
  const row = (label, key, min, max, step) => (
    <label style={{ display: "block", marginBottom: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 2,
        }}
      >
        <span>{label}</span>
        <span style={{ opacity: 0.6 }}>{values[key]}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={values[key]}
        onChange={(e) => onChange({ [key]: Number(e.target.value) })}
        style={{ width: "100%" }}
      />
    </label>
  );

  const beatLabels = [
    "1 · idle",
    "2 · floor",
    "3 · on-body",
    "4 · cards",
    "5 · spin",
  ];

  const codeSnippet = `camPos: { x: ${values.camX}, y: ${values.camY}, z: ${values.camZ} },
ringRot: { x: ${values.rotX}, y: ${values.rotY} },
ringPosOffset: { x: ${values.posX}, y: ${values.posY}, z: ${values.posZ} },
ringScale: ${values.scale},
// floor rest Y (beat 2 only): ${values.floorRestY}`;

  return (
    <div
      style={{
        position: "fixed",
        top: 84,
        right: 590,
        zIndex: 51,
        background: "rgba(20,20,22,0.92)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 10,
        padding: "14px 16px",
        color: "#fff",
        fontSize: 12,
        fontFamily: "monospace",
        width: 280,
        maxHeight: "85vh",
        overflowY: "auto",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 12, opacity: 0.8 }}>
          BEAT COORDINATES
        </span>
        <button
          onClick={onHide}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            opacity: 0.6,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ opacity: 0.55, marginBottom: 10, lineHeight: 1.4 }}>
        Pick a beat to jump there + prefill sliders (full ring control now —
        position, rotation, and scale — in every beat, not just on-body). Flip
        "Live override" to preview, then "Save keyframe" to make it stick on
        scroll. A dot marks beats with a saved keyframe.
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          marginBottom: 10,
        }}
      >
        {beatLabels.map((label, i) => (
          <button
            key={i}
            onClick={() => onSelectBeat(i)}
            style={{
              position: "relative",
              background:
                values.beatIndex === i
                  ? "rgba(77,163,255,0.35)"
                  : "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 6,
              padding: "4px 8px",
              color: "#fff",
              fontSize: 10,
              fontFamily: "monospace",
              cursor: "pointer",
            }}
          >
            {label}
            {savedBeats?.has(i) && (
              <span
                style={{
                  position: "absolute",
                  top: -3,
                  right: -3,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#4dff8e",
                  border: "1px solid rgba(0,0,0,0.4)",
                }}
              />
            )}
          </button>
        ))}
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={values.live}
          onChange={(e) => onToggleLive(e.target.checked)}
        />
        Live override (preview in any beat)
      </label>

      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 12,
        }}
      >
        <button
          onClick={onSave}
          style={{
            flex: 1,
            background: "rgba(77,255,142,0.18)",
            border: "1px solid rgba(77,255,142,0.4)",
            borderRadius: 6,
            padding: "6px 8px",
            color: "#fff",
            fontSize: 11,
            fontFamily: "monospace",
            cursor: "pointer",
          }}
        >
          Save keyframe
        </button>
        <button
          onClick={onClear}
          disabled={!savedBeats?.has(values.beatIndex)}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 6,
            padding: "6px 8px",
            color: "#fff",
            fontSize: 11,
            fontFamily: "monospace",
            cursor: savedBeats?.has(values.beatIndex) ? "pointer" : "default",
            opacity: savedBeats?.has(values.beatIndex) ? 1 : 0.4,
          }}
        >
          Clear keyframe
        </button>
      </div>

      <div style={{ opacity: 0.7, marginBottom: 4 }}>Camera position</div>
      {row("Cam X", "camX", -3, 3, 0.01)}
      {row("Cam Y", "camY", -2, 2, 0.01)}
      {row("Cam Z", "camZ", 1, 8, 0.01)}

      <div style={{ opacity: 0.7, marginBottom: 4, marginTop: 10 }}>
        Ring rotation (radians)
      </div>
      {row("Rot X", "rotX", -3.14, 3.14, 0.01)}
      {row("Rot Y", "rotY", -6.3, 6.3, 0.01)}

      <div style={{ opacity: 0.7, marginBottom: 4, marginTop: 10 }}>
        Ring position offset
      </div>
      {row("Pos X", "posX", -2, 2, 0.01)}
      {row("Pos Y", "posY", -2, 2, 0.01)}
      {row("Pos Z", "posZ", -2, 2, 0.01)}

      <div style={{ opacity: 0.7, marginBottom: 4, marginTop: 10 }}>
        Ring scale
      </div>
      {row("Scale", "scale", 0.2, 2.5, 0.01)}

      <div style={{ opacity: 0.7, marginBottom: 4, marginTop: 10 }}>
        Floor rest height (beat 2 only)
      </div>
      {row("Floor Y", "floorRestY", -2, 1, 0.01)}

      <div style={{ marginTop: 12, marginBottom: 4, opacity: 0.55 }}>
        Copy into the selected beat's BEATS[i] entry once happy:
      </div>
      <pre
        style={{
          background: "rgba(255,255,255,0.06)",
          padding: "8px 10px",
          borderRadius: 6,
          fontSize: 10,
          whiteSpace: "pre-wrap",
          margin: 0,
        }}
      >
        {codeSnippet}
      </pre>
    </div>
  );
}

function MaterialDevPanel({
  metalPresetKey,
  setMetalPresetKey,
  metalHdrUrl,
  setMetalHdrUrl,
  gemHdrUrl,
  setGemHdrUrl,
  gemMode,
  setGemMode,
  meshDebugList = [],
  metalHdrConfig,
  setMetalHdrConfig,
  gemHdrConfig,
  setGemHdrConfig,
  postFxEnabled,
  setPostFxEnabled,
}) {
  const gemCount = meshDebugList.filter((m) => m.type === "gem").length;
  const metalCount = meshDebugList.filter((m) => m.type === "metal").length;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 50,
        background: "rgba(20,20,22,0.9)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 10,
        padding: "14px 16px",
        color: "#fff",
        fontSize: 12,
        fontFamily: "monospace",
        width: 280,
        maxHeight: "85vh",
        overflowY: "auto",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          marginBottom: 10,
          fontSize: 12,
          opacity: 0.8,
        }}
      >
        MATERIAL DEV PANEL
      </div>

      {/* Per-mesh classification — this is the part that actually tells
          you whether gem/metal assignment is correct, instead of
          eyeballing the render. Populated by RingHero's
          onMeshesClassified callback once the GLB loads. */}
      <div
        style={{
          marginBottom: 12,
          padding: "8px 10px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: 6,
        }}
      >
        <div style={{ opacity: 0.6, marginBottom: 6 }}>
          Mesh classification{" "}
          {meshDebugList.length > 0 &&
            `(${gemCount} gem / ${metalCount} metal)`}
        </div>
        {meshDebugList.length === 0 ? (
          <div style={{ opacity: 0.4 }}>Loading…</div>
        ) : (
          meshDebugList.map((m) => (
            <div
              key={m.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "2px 0",
                color: m.type === "gem" ? "#8ecbff" : "#ffd88e",
              }}
            >
              <span>{m.name}</span>
              <span>{m.type}</span>
            </div>
          ))
        )}
      </div>

      <label style={{ display: "block", marginBottom: 10 }}>
        Metal preset
        <select
          value={metalPresetKey}
          onChange={(e) => setMetalPresetKey(e.target.value)}
          style={selectStyle}
        >
          <option value="yellowGold">Yellow Gold</option>
          <option value="whiteGold">White Gold</option>
          <option value="roseGold">Rose Gold</option>
          <option value="platinum">Platinum</option>
        </select>
      </label>

      <label style={{ display: "block", marginBottom: 10 }}>
        Metal HDR URL
        <input
          type="text"
          value={metalHdrUrl}
          onChange={(e) => setMetalHdrUrl(e.target.value)}
          style={inputStyle}
        />
      </label>

      <HdrConfigGroup
        label="Metal HDR controls"
        config={metalHdrConfig}
        setConfig={setMetalHdrConfig}
      />

      <label style={{ display: "block", marginTop: 14, marginBottom: 10 }}>
        Gem HDR URL
        <input
          type="text"
          value={gemHdrUrl}
          onChange={(e) => setGemHdrUrl(e.target.value)}
          style={inputStyle}
        />
      </label>

      <label style={{ display: "block", marginBottom: 10 }}>
        Gem material
        <select
          value={gemMode ?? "default"}
          onChange={(e) =>
            setGemMode(e.target.value === "default" ? null : e.target.value)
          }
          style={selectStyle}
        >
          <option value="default">Preset default (refraction)</option>
          <option value="matte">Matte (cheap)</option>
        </select>
      </label>

      <HdrConfigGroup
        label="Gem HDR controls"
        config={gemHdrConfig}
        setConfig={setGemHdrConfig}
      />

      {/* Post-processing toggle — ported from components/JewelryPostFX.jsx
          (SMAA + mipmap Bloom + ACES Filmic tone mapping + grain +
          vignette). Useful to flip off during dev to isolate whether an
          artifact is coming from the shader or from bloom/grain. */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 14,
          marginBottom: 4,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={postFxEnabled}
          onChange={(e) => setPostFxEnabled(e.target.checked)}
        />
        Post-processing (Bloom / SMAA / Vignette)
      </label>

      <div
        style={{ marginTop: 10, fontSize: 10, opacity: 0.5, lineHeight: 1.4 }}
      >
        Set metal/gem HDR URLs to different files to confirm they don't affect
        each other. Rotation/scale/power/gamma match your 3D viewer's dev
        controls — 100/100/100 and 0° are neutral.
      </div>
    </div>
  );
}

/**
 * HdrConfigGroup
 * -------------------------------------------------------------------------
 * Rotation (X/Y), scale, power, gamma sliders for one HDR (metal or
 * gem) — same 5 controls, same ranges/units as your viewer's dev panel.
 * -------------------------------------------------------------------------
 */
function HdrConfigGroup({ label, config, setConfig }) {
  const update = (key) => (e) =>
    setConfig((prev) => ({ ...prev, [key]: Number(e.target.value) }));

  return (
    <div
      style={{
        marginBottom: 6,
        padding: "8px 10px",
        background: "rgba(255,255,255,0.04)",
        borderRadius: 6,
      }}
    >
      <div style={{ opacity: 0.6, marginBottom: 8 }}>{label}</div>

      <SliderRow
        label="Rotation"
        value={config.rotation}
        min={-180}
        max={180}
        step={1}
        unit="°"
        onChange={update("rotation")}
      />
      <SliderRow
        label="Rotation Y"
        value={config.rotationY}
        min={-180}
        max={180}
        step={1}
        unit="°"
        onChange={update("rotationY")}
      />
      <SliderRow
        label="Scale"
        value={config.scale}
        min={0}
        max={300}
        step={1}
        onChange={update("scale")}
      />
      <SliderRow
        label="Power"
        value={config.power}
        min={0}
        max={300}
        step={1}
        onChange={update("power")}
      />
      <SliderRow
        label="Gamma"
        value={config.gamma}
        min={10}
        max={300}
        step={1}
        onChange={update("gamma")}
      />
    </div>
  );
}

function SliderRow({ label, value, min, max, step, unit = "", onChange }) {
  return (
    <label style={{ display: "block", marginBottom: 6 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 2,
        }}
      >
        <span>{label}</span>
        <span style={{ opacity: 0.6 }}>
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        style={{ width: "100%" }}
      />
    </label>
  );
}

const selectStyle = {
  display: "block",
  width: "100%",
  marginTop: 4,
  background: "#1a1a1e",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 12,
  fontFamily: "monospace",
};

const inputStyle = {
  ...selectStyle,
};

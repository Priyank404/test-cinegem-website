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
import { Link } from "react-router-dom";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import RingHero, { BEATS } from "@/components/three/RingHero";
import VantaBeatFogBackground from "@/components/effects/VantaBeatFogBackground";
import VantaFogControlPanel from "@/components/effects/VantaFogControlPanel";
import {
  loadBeatFogPresets,
  saveBeatFogPresets,
  resetBeatFogPresets,
  BEAT_FOG_PRESETS,
} from "@/components/effects/beatFogPresets";
import TitleGlassyCard from "@/components/ui/TitleGlassyCard";
import ContentGlassyCard from "@/components/ui/ContentGlassyCard";
import TimelineEditor from "@/components/three/TimelineEditor";
import { metalPresets } from "@/components/three/metalMaterials";
import "./HeroPage2.css";

gsap.registerPlugin(ScrollTrigger);

// ---------------------------------------------------------------------
// Global frame timeline. The whole scroll (all 5 beats) is mapped to a
// single continuous frame range, NOT a per-beat 0–50 scale:
//   Beat 1:  frame   0 –  10
//   Beat 2:  frame  11 –  61
//   Beat 3:  frame  61 – 111
//   Beat 4:  frame 111 – 161
//   Beat 5:  frame 161 – 211
// TOTAL_FRAMES is the top of that range — everything that used to do
// `progress * 50` (a local, beat-relative frame) now does
// `progress * TOTAL_FRAMES` so slider/timing values line up with the
// actual global frame the ring/timeline is on.
// ---------------------------------------------------------------------
const TOTAL_FRAMES = 260;

// Global frame (0–260 scale, same as everything else in this file) at
// which the ring starts auto-rotating on its own — a continuous 360°
// spin — and the global frame at which the "Explore 3D Viewer" link
// fades in. Both turn back OFF once scroll leaves this frame range
// (scrolls past END, or back up past START), exactly like every other
// beat-scoped animation in this file — nothing here permanently latches.
// RingHero's BEATS[] array (and its autoRotateStartFrame/EndFrame props)
// live on a separate 0–50 LOCAL frame scale, so these are converted
// below via `(frame / TOTAL_FRAMES) * 50` wherever passed into RingHero —
// keep these constants in the global scale so they line up with every
// other frame number in this file (card timing, etc).
const AUTO_ROTATE_GLOBAL_FRAME = 215;
const AUTO_ROTATE_GLOBAL_END_FRAME = 260; // end of scroll — Beat 5/6 boundary
const EXPLORE_LINK_GLOBAL_FRAME = 220;
const EXPLORE_LINK_GLOBAL_END_FRAME = 260;

// Footer reveal — a fixed-position footer panel that slides up from
// below the viewport as the user reaches the very end of the scroll,
// same effect as peachweb.io's bottom-of-page footer. Starts sliding in
// at global frame 245, fully in place (translateY 0) by frame 260 (the
// top of TOTAL_FRAMES — the last possible scroll position). Driven by a
// continuous 0->1 progress value (not a class toggle) so it tracks the
// scrollbar 1:1 in both directions, exactly like every other
// scroll-scrubbed effect in this file.
const FOOTER_REVEAL_GLOBAL_START_FRAME = 245;
const FOOTER_REVEAL_GLOBAL_END_FRAME = 260;
// How far (world units, same scale as BEATS[].ringPosOffset.y) the ring
// lifts upward as the footer slides into place, so the footer panel
// doesn't cover it. Applied smoothly via poseApiRef's live
// ringPosOffset override, scaled by the same footerT progress (0 -> 1)
// that drives the footer's own translateY below. Tune this up/down if
// the ring still clips behind the footer or lifts too far.
const FOOTER_RING_LIFT_AMOUNT = 0.25;

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
    // Custom easing: exponential decay curve — feels like genuine physical
    // inertia (fast start, smooth deceleration) rather than the default
    // linear lerp that Lenis ships with. t^3-based so the tail end is very
    // gradual, preventing the abrupt "clunk" stop that linear lerp produces
    // right at the scroll target.
    const lenisEasing = (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t));

    const lenis = new Lenis({
      duration: 1.4, // longer inertia tail — was 1.1
      easing: lenisEasing,
      smoothWheel: true,
      // Kept intentionally light — this only interpolates native
      // scroll input into something continuous; RingHero's own
      // ScrollTrigger scrub value is what actually controls how the
      // 3D scene lags/tracks that (now-smooth) scroll position.
    });

    // Scroll to the top immediately on initialization
    lenis.scrollTo(0, { immediate: true });

    // Drive Lenis from GSAP's OWN ticker instead of a separate, competing
    // requestAnimationFrame loop. Two independent rAF loops (one for
    // Lenis, one for gsap.ticker/currentTickerFn in RingHero.jsx) aren't
    // guaranteed to fire in the same order every frame — occasionally
    // gsap.ticker's callback (which reads the scrub-tweened camera/ring
    // state and writes it to the 3D scene) could run BEFORE Lenis had
    // pushed that frame's scroll update into ScrollTrigger, using
    // slightly stale scroll data for one frame. Routing both through
    // the same ticker guarantees lenis.raf() runs, then
    // ScrollTrigger.update() picks it up, then RingHero's own ticker
    // reads the now-current value, all within one single tick.
    //
    // gsap.ticker's `time` argument is in SECONDS. Lenis.raf() expects
    // MILLISECONDS — hence `time * 1000`.
    //
    // Delta is capped at 100ms: if the tab was backgrounded and GSAP
    // tried to catch up across many skipped frames, we clamp the single
    // tick fed to Lenis so it doesn't snap the scroll position forward
    // by a large amount all at once (the "jump on tab return" bug).
    let lastLenisTime = null;
    function lenisTick(time) {
      const ms = time * 1000;
      if (lastLenisTime === null) {
        lastLenisTime = ms;
      }
      const delta = ms - lastLenisTime;
      lastLenisTime = ms;
      // Feed Lenis only the capped delta added to the last known time so
      // it continues from where it left off rather than teleporting.
      lenis.raf(lastLenisTime - Math.max(0, delta - 100));
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

  const [postFxEnabled, setPostFxEnabled] = useState(false);
  const [panelVisible, setPanelVisible] = useState(true);
  // Independent from panelVisible — hides/shows the bottom "3D Animation
  // Timeline & Channel Box" bar (TimelineEditor) without touching the
  // MaterialDevPanel sliders. Defaults to visible, same as panelVisible.
  const [timelineVisible, setTimelineVisible] = useState(true);

  // Tracks the live window width so the dev panel can display the
  // ACTUAL resolved px value of the clamp()'d card widths at the
  // current viewport — not just the static 1920px-reference number
  // stored in layoutConfig. Updates on resize so the readout stays
  // live if you resize the browser while the panel is open.
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1920,
  );
  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Beat coordinate panel — works across ALL beats.
  // poseApiRef holds the jumpToBeat/setCamOverride/etc functions RingHero
  // hands back once its scroll timeline is set up (see onPoseOverrideReady
  // below). coordPanelVisible/coordValues drive the panel UI itself.
  const poseApiRef = useRef(null);
  // RingHero calls onBeatBlendUpdate every scroll-scrubbed frame; we
  // forward { fromIndex, toIndex, weight } straight through via ref (no
  // state) so the interactive background layer stays in lockstep with
  // the ring's own scroll position without an extra render cycle. Drives
  // a Vanta FOG instance per beat — this is now the only background
  // layer (the old particle/shader BeatBackground has been removed).
  const vantaBeatRef = useRef(null);
  const [beatFogOptions, setBeatFogOptions] = useState(loadBeatFogPresets);
  const [fogPanelBeat, setFogPanelBeat] = useState(0);
  const [showFogPanel, setShowFogPanel] = useState(false);
  // TimelineEditor's imperative handle — see onScrollDebugUpdate below.
  const timelineRef = useRef(null);
  const scrollDebounceRef = useRef(null);
  // Tracks the last global frame reported by RingHero's scroll ticker, so
  // the card-timing preview can be recomputed live (see the
  // cardTimingConfig useEffect below) any time a timing slider changes,
  // without requiring the user to scroll first.
  const lastFrameRef = useRef(0);

  // Refs for the new glassy overlay gallery components
  const beat2OverlayRef = useRef(null);
  const beat2SlideTrackRef = useRef(null);
  const beat2Slide1Ref = useRef(null);
  const beat2Slide2Ref = useRef(null);
  const beat2Slide3Ref = useRef(null);
  const beat2VideoRef = useRef(null);

  const beat3OverlayRef = useRef(null);
  const beat3SlideTrackRef = useRef(null);
  const beat3Slide1Ref = useRef(null);
  const beat3Slide2Ref = useRef(null);
  const beat3Slide3Ref = useRef(null);
  const beat3VideoRef = useRef(null);

  const beat4OverlayRef = useRef(null);

  // "Explore 3D Viewer" text link that fades in during the tail of Beat 5
  // (see EXPLORE_LINK_GLOBAL_FRAME / _END_FRAME constants above) once the
  // ring's auto-rotate has kicked in. Visibility is re-evaluated every
  // scroll tick — it turns back off if the user scrolls out of that
  // range in either direction, same as every other beat-scoped element
  // here. Kept as a direct DOM style/class write inside the same
  // scroll callback as everything else, rather than React state, to
  // avoid re-rendering on every scroll tick.
  const exploreLinkRef = useRef(null);

  // Footer reveal panel — see FOOTER_REVEAL_GLOBAL_START_FRAME/_END_FRAME
  // above. Written directly every scroll tick (translateY %, not a class
  // toggle) so it slides in/out in lockstep with the scrollbar rather
  // than snapping or CSS-transitioning, same rationale as exploreLinkRef.
  const footerRevealRef = useRef(null);

  // Fixed nav header ref — stays visible during scroll, slides up only during footer reveal
  const navRef = useRef(null);

  const [coordValues, setCoordValues] = useState({
    activeFrame: 0,
    live: false,
    camX: 0,
    camY: 0.2,
    camZ: 4.2,
    rotX: 0.15,
    rotY: 0,
    rotZ: 0,
    posX: 0,
    posY: 0,
    posZ: 0,
    scale: 1,
  });
  // Which frames currently have a saved keyframe — drives the markers.
  const [savedBeats, setSavedBeats] = useState(new Set());

  // Developers card layout config state (drives Title/Content positions)
  const [layoutConfig, setLayoutConfig] = useState({
    contentLeft: 9.5,
    contentTop: 15.5,
    contentWidth: 940,
    contentHeight: 520,
    titleLeft: 59.5,
    titleTop: 15.5,
    titleWidth: 360,
    heightAnchor: "top", // "center" | "top" | "bottom"
  });

  // Beat 3's own swapped-position config — independent of layoutConfig
  // above (which still drives Beat 2, and Beat 3's own pre-swap/default
  // position). This only controls where the content/title cards end up
  // AFTER the Beat 3 swap animation completes. Persisted separately so
  // tuning Beat 3 never touches Beat 2.
  const DEFAULT_BEAT3_LAYOUT_CONFIG = {
    contentLeft: 9.5,
    contentTop: 15.5,
    titleLeft: 9.5,
    titleTop: 15.5,
  };
  const [beat3LayoutConfig, setBeat3LayoutConfig] = useState(() => {
    try {
      const saved = window.localStorage.getItem("hero2Beat3LayoutConfigV2");
      if (saved) {
        return { ...DEFAULT_BEAT3_LAYOUT_CONFIG, ...JSON.parse(saved) };
      }
    } catch (err) {
      console.warn("Could not read saved Beat 3 layout config:", err);
    }
    return DEFAULT_BEAT3_LAYOUT_CONFIG;
  });

  function saveBeat3LayoutConfig() {
    try {
      window.localStorage.setItem(
        "hero2Beat3LayoutConfigV2",
        JSON.stringify(beat3LayoutConfig),
      );
      alert("Beat 3 layout saved!");
    } catch (err) {
      console.error("Failed to save Beat 3 layout config:", err);
      alert("Could not save Beat 3 layout (see console).");
    }
  }

  // Card timing config — controls when each Beat's card enters/exits, now
  // expressed on the GLOBAL frame scale (0–211) instead of a per-beat
  // 0–50 scale. Beat 2 spans global frames 11–61, Beat 3 spans 61–111,
  // so these entry/exit values are chosen to fall inside those windows.
  const DEFAULT_CARD_TIMING_CONFIG = {
    beat2EntryStart: 25,
    beat2EntryEnd: 35,
    beat2ExitStart: 51,
    beat2ExitEnd: 61,
    beat3EntryStart: 75,
    beat3EntryEnd: 85,
    beat3ExitStart: 101,
    beat3ExitEnd: 111,
    // Beat 4 card starts sliding up from the bottom at frame 117, finishes
    // expanding to fullscreen at frame 145, then vanishes by frame 170.
    beat4EntryStart: 117,
    beat4EntryEnd: 145,
    beat4ExitStart: 155,
    beat4ExitEnd: 170,
  };
  const [cardTimingConfig, setCardTimingConfig] = useState(() => {
    try {
      const saved = window.localStorage.getItem("hero2CardTimingConfig");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Force the card to start entering at frame 117, finish expanding
        // to fullscreen at frame 145, and fully vanish by frame 170,
        // overriding any stale values a user might have saved previously.
        parsed.beat4EntryStart = 117;
        parsed.beat4EntryEnd = 145;
        parsed.beat4ExitStart = 155;
        parsed.beat4ExitEnd = 170;
        return { ...DEFAULT_CARD_TIMING_CONFIG, ...parsed };
      }
    } catch (err) {
      console.warn("Could not read saved card timing config:", err);
    }
    return DEFAULT_CARD_TIMING_CONFIG;
  });

  // Selecting a frame prefills the sliders from that frame's interpolated
  // base values, UNLESS a keyframe was already saved for it.
  function selectCoordFrame(frame) {
    const snap = poseApiRef.current?.getKeyframeSnapshot?.() ?? {};
    const kf = snap[frame];
    const base = poseApiRef.current?.getBaseValuesForFrame?.(frame) ?? {
      camPos: { x: 0, y: 0.2, z: 4.2 },
      ringRot: { x: 0.15, y: 0, z: 0 },
      ringPosOffset: { x: 0, y: 0, z: 0 },
      ringScale: 1,
    };
    setCoordValues((prev) => ({
      ...prev,
      activeFrame: frame,
      camX: kf?.camPos?.x ?? base.camPos.x,
      camY: kf?.camPos?.y ?? base.camPos.y,
      camZ: kf?.camPos?.z ?? base.camPos.z,
      rotX: kf?.ringRot?.x ?? base.ringRot.x,
      rotY: kf?.ringRot?.y ?? base.ringRot.y,
      rotZ: kf?.ringRot?.z ?? base.ringRot.z ?? 0,
      posX: kf?.ringPosOffset?.x ?? base.ringPosOffset?.x ?? 0,
      posY: kf?.ringPosOffset?.y ?? base.ringPosOffset?.y ?? 0,
      posZ: kf?.ringPosOffset?.z ?? base.ringPosOffset?.z ?? 0,
      scale: kf?.ringScale ?? base.ringScale ?? 1,
    }));
    poseApiRef.current?.jumpToBeat(frame);
  }

  function applyLiveOverride(next) {
    poseApiRef.current?.setCamOverride({
      x: next.camX,
      y: next.camY,
      z: next.camZ,
    });
    poseApiRef.current?.setRingRotOverride({
      x: next.rotX,
      y: next.rotY,
      z: next.rotZ,
    });
    poseApiRef.current?.setRingPosOffsetOverride({
      x: next.posX,
      y: next.posY,
      z: next.posZ,
    });
    poseApiRef.current?.setRingScaleOverride(next.scale);
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
              rotZ: current.ringRot.z ?? 0,
              posX: current.ringPosOffset.x,
              posY: current.ringPosOffset.y,
              posZ: current.ringPosOffset.z,
              scale: current.ringScale,
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
    }
  }

  function refreshSavedBeats() {
    const snap = poseApiRef.current?.getKeyframeSnapshot?.() ?? {};
    setSavedBeats(new Set(Object.keys(snap).map(Number)));
  }

  // Persists the current slider values as a keyframe at activeFrame —
  // plays back on scroll from then on, no "live" toggle required.
  function saveCoordKeyframe(optionalData) {
    const dataToSave =
      optionalData && optionalData.activeFrame !== undefined
        ? optionalData
        : coordValues;
    const {
      activeFrame,
      camX,
      camY,
      camZ,
      rotX,
      rotY,
      rotZ,
      posX,
      posY,
      posZ,
      scale,
    } = dataToSave;
    poseApiRef.current?.saveKeyframe(activeFrame, {
      camPos: { x: camX, y: camY, z: camZ },
      ringRot: { x: rotX, y: rotY, z: rotZ },
      ringPosOffset: { x: posX, y: posY, z: posZ },
      ringScale: scale,
    });
    refreshSavedBeats();
  }

  function clearCoordKeyframe() {
    poseApiRef.current?.clearKeyframe(coordValues.activeFrame);
    refreshSavedBeats();
  }

  function moveCoordKeyframe(oldFrame, newFrame) {
    if (oldFrame === newFrame) return;
    poseApiRef.current?.moveKeyframe?.(oldFrame, newFrame);
    refreshSavedBeats();
    selectCoordFrame(newFrame);
  }

  // ---------------------------------------------------------------------
  // applyCardOverlayFrame
  // -----------------------------------------------------------------------
  // Pure DOM-mutation pass that positions/fades the Beat 2 and Beat 3
  // glassy overlays for a given GLOBAL frame, using whatever
  // cardTimingConfig values are current at call time. This is the exact
  // math that used to live inline inside onScrollDebugUpdate — pulled out
  // so it can ALSO be called from the cardTimingConfig useEffect below
  // (live slider preview) without needing an actual scroll event to
  // trigger it. Reads config fresh every call (not memoized) so it always
  // reflects the latest slider values.
  // ---------------------------------------------------------------------
  function applyCardOverlayFrame(frame, config) {
    // ---- BEAT 2 ----
    const b2es = config.beat2EntryStart;
    const b2ee = config.beat2EntryEnd;
    const b2xs = config.beat2ExitStart;
    const b2xe = config.beat2ExitEnd;

    let beat2YOffset = 800;
    let beat2Opacity = 0;

    if (frame < b2es) {
      beat2YOffset = 800;
      beat2Opacity = 0;
    } else if (frame >= b2es && frame < b2ee) {
      const t = (frame - b2es) / Math.max(0.001, b2ee - b2es);
      const easeT = t * t * (3 - 2 * t);
      beat2YOffset = 800 * (1 - easeT);
      beat2Opacity = easeT;
    } else if (frame >= b2ee && frame < b2xs) {
      beat2YOffset = 0;
      beat2Opacity = 1;
    } else if (frame >= b2xs && frame <= b2xe) {
      const t = (frame - b2xs) / Math.max(0.001, b2xe - b2xs);
      const easeT = t * t * (3 - 2 * t);
      beat2YOffset = -800 * easeT;
      beat2Opacity = 1 - easeT;
    } else {
      beat2YOffset = -800;
      beat2Opacity = 0;
    }

    if (beat2OverlayRef.current) {
      beat2OverlayRef.current.style.transform = `translateY(${beat2YOffset}px)`;
      beat2OverlayRef.current.style.opacity = beat2Opacity;
      beat2OverlayRef.current.style.pointerEvents =
        beat2Opacity > 0.05 ? "auto" : "none";
    }

    if (frame >= b2ee && frame <= b2xe) {
      const activeRange = Math.max(0.001, b2xs - b2ee);
      const trackProgress = Math.min(
        1,
        Math.max(0, (frame - b2ee) / activeRange),
      );
      const totalSlides = 3;
      const slideH = beat2Slide1Ref.current?.clientHeight ?? 380;
      const containerH =
        beat2SlideTrackRef.current?.parentElement?.clientHeight ?? 380;
      const maxScrollOffset = Math.max(0, totalSlides * slideH - containerH);
      const pxOffset = trackProgress * maxScrollOffset;
      if (beat2SlideTrackRef.current) {
        beat2SlideTrackRef.current.style.transform = `translateY(-${pxOffset}px)`;
      }
      const dominant = trackProgress < 0.35 ? 0 : trackProgress < 0.7 ? 1 : 2;
      if (beat2VideoRef.current) {
        if (dominant === 2) {
          if (beat2VideoRef.current.paused)
            beat2VideoRef.current.play().catch(() => {});
        } else {
          if (!beat2VideoRef.current.paused) beat2VideoRef.current.pause();
        }
      }
    } else {
      if (beat2SlideTrackRef.current) {
        beat2SlideTrackRef.current.style.transform = "translateY(0px)";
      }
      if (beat2VideoRef.current && !beat2VideoRef.current.paused) {
        beat2VideoRef.current.pause();
      }
    }

    // ---- BEAT 3 ----
    const b3es = config.beat3EntryStart;
    const b3ee = config.beat3EntryEnd;
    const b3xs = config.beat3ExitStart;
    const b3xe = config.beat3ExitEnd;

    let beat3YOffset = 800;
    let beat3Opacity = 0;

    if (frame < b3es) {
      beat3YOffset = 800;
      beat3Opacity = 0;
    } else if (frame >= b3es && frame < b3ee) {
      const t = (frame - b3es) / Math.max(0.001, b3ee - b3es);
      const easeT = t * t * (3 - 2 * t);
      beat3YOffset = 800 * (1 - easeT);
      beat3Opacity = easeT;
    } else if (frame >= b3ee && frame < b3xs) {
      beat3YOffset = 0;
      beat3Opacity = 1;
    } else if (frame >= b3xs && frame <= b3xe) {
      const t = (frame - b3xs) / Math.max(0.001, b3xe - b3xs);
      const easeT = t * t * (3 - 2 * t);
      beat3YOffset = -800 * easeT;
      beat3Opacity = 1 - easeT;
    } else {
      beat3YOffset = -800;
      beat3Opacity = 0;
    }

    if (beat3OverlayRef.current) {
      beat3OverlayRef.current.style.transform = `translateY(${beat3YOffset}px)`;
      beat3OverlayRef.current.style.opacity = beat3Opacity;
      beat3OverlayRef.current.style.pointerEvents =
        beat3Opacity > 0.05 ? "auto" : "none";
    }

    // NOTE: Beat 3's content/title cards no longer need a runtime swap —
    // they're rendered with their own static beat3LayoutConfig position
    // directly in JSX (see the Beat 3 Layout block below), so there's
    // nothing to reposition here at all.

    if (frame >= b3ee && frame <= b3xe) {
      const activeRange = Math.max(0.001, b3xs - b3ee);
      const trackProgress = Math.min(
        1,
        Math.max(0, (frame - b3ee) / activeRange),
      );
      const totalSlides = 3;
      const slideH = beat3Slide1Ref.current?.clientHeight ?? 380;
      const containerH =
        beat3SlideTrackRef.current?.parentElement?.clientHeight ?? 380;
      const maxScrollOffset = Math.max(0, totalSlides * slideH - containerH);
      const pxOffset = trackProgress * maxScrollOffset;
      if (beat3SlideTrackRef.current) {
        beat3SlideTrackRef.current.style.transform = `translateY(-${pxOffset}px)`;
      }
      const dominant = trackProgress < 0.35 ? 0 : trackProgress < 0.7 ? 1 : 2;
      if (beat3VideoRef.current) {
        if (dominant === 2) {
          if (beat3VideoRef.current.paused)
            beat3VideoRef.current.play().catch(() => {});
        } else {
          if (!beat3VideoRef.current.paused) beat3VideoRef.current.pause();
        }
      }
    } else {
      if (beat3SlideTrackRef.current) {
        beat3SlideTrackRef.current.style.transform = "translateY(0px)";
      }
      if (beat3VideoRef.current && !beat3VideoRef.current.paused) {
        beat3VideoRef.current.pause();
      }
    }

    // ---- BEAT 4 ----
    const b4es = config.beat4EntryStart;
    const b4ee = config.beat4EntryEnd;
    const b4xs = config.beat4ExitStart;
    const b4xe = config.beat4ExitEnd;

    // Center point of entry/exit
    const b4midEntry = b4es + (b4ee - b4es) / 2;
    const b4midExit = b4xs + (b4xe - b4xs) / 2;

    let beat4Width = "60vw";
    let beat4Height = "35vh";
    let beat4YOffset = 100; // in vh (fully down)
    let beat4Opacity = 0;
    let beat4BorderRadius = "24px";

    if (frame < b4es) {
      beat4Width = "60vw";
      beat4Height = "35vh";
      beat4YOffset = 100;
      beat4Opacity = 0;
      beat4BorderRadius = "24px";
    } else if (frame >= b4es && frame < b4midEntry) {
      // Bottom to Center (keeps small card size)
      const t = (frame - b4es) / Math.max(0.001, b4midEntry - b4es);
      const easeT = t * t * (3 - 2 * t);
      beat4Width = "60vw";
      beat4Height = "35vh";
      beat4YOffset = 100 * (1 - easeT);
      beat4BorderRadius = "24px";
      beat4Opacity = easeT;
    } else if (frame >= b4midEntry && frame < b4ee) {
      // Center to Fullscreen (expands from small card size to fullscreen)
      const t = (frame - b4midEntry) / Math.max(0.001, b4ee - b4midEntry);
      const easeT = t * t * (3 - 2 * t);
      beat4Width = `${60 + (100 - 60) * easeT}vw`;
      beat4Height = `${35 + (100 - 35) * easeT}vh`;
      beat4YOffset = 0;
      beat4BorderRadius = `${24 * (1 - easeT)}px`;
      beat4Opacity = 1;
    } else if (frame >= b4ee && frame < b4xs) {
      // Steady Fullscreen
      beat4Width = "100vw";
      beat4Height = "100vh";
      beat4YOffset = 0;
      beat4BorderRadius = "0px";
      beat4Opacity = 1;
    } else if (frame >= b4xs && frame < b4midExit) {
      // Fullscreen to Center (shrinks from fullscreen back to small card size)
      const t = (frame - b4xs) / Math.max(0.001, b4midExit - b4xs);
      const easeT = t * t * (3 - 2 * t);
      beat4Width = `${100 - (100 - 60) * easeT}vw`;
      beat4Height = `${100 - (100 - 35) * easeT}vh`;
      beat4YOffset = 0;
      beat4BorderRadius = `${24 * easeT}px`;
      beat4Opacity = 1;
    } else if (frame >= b4midExit && frame <= b4xe) {
      // Center to Top (keeps small card size while moving off screen)
      const t = (frame - b4midExit) / Math.max(0.001, b4xe - b4midExit);
      const easeT = t * t * (3 - 2 * t);
      beat4Width = "60vw";
      beat4Height = "35vh";
      beat4YOffset = -100 * easeT;
      beat4BorderRadius = "24px";
      beat4Opacity = 1 - easeT;
    } else {
      beat4Width = "60vw";
      beat4Height = "35vh";
      beat4YOffset = -100;
      beat4Opacity = 0;
      beat4BorderRadius = "24px";
    }

    if (beat4OverlayRef.current) {
      beat4OverlayRef.current.style.width = beat4Width;
      beat4OverlayRef.current.style.height = beat4Height;
      beat4OverlayRef.current.style.transform = `translate(-50%, -50%) translateY(${beat4YOffset}vh)`;
      beat4OverlayRef.current.style.borderRadius = beat4BorderRadius;
      beat4OverlayRef.current.style.opacity = beat4Opacity;
      beat4OverlayRef.current.style.pointerEvents =
        beat4Opacity > 0.05 ? "auto" : "none";
    }
  }

  // Live preview: any time a card-timing slider changes, immediately
  // re-apply the overlay at whatever frame the page is currently
  // sitting on (lastFrameRef, kept in sync by the scroll handler below).
  // This is what makes dragging a timing slider show its effect right
  // away instead of requiring the user to scroll first.
  useEffect(() => {
    applyCardOverlayFrame(lastFrameRef.current, cardTimingConfig);
  }, [cardTimingConfig]);

  // Persists cardTimingConfig to localStorage as a dedicated, explicit
  // save action — separate from "Reset Timing". Values are picked back
  // up on next load via the lazy useState initializer below, so tuned
  // timings survive a refresh instead of silently reverting to defaults.
  function saveCardTimingConfig() {
    try {
      window.localStorage.setItem(
        "hero2CardTimingConfig",
        JSON.stringify(cardTimingConfig),
      );
      alert("Card timing saved!");
    } catch (err) {
      console.error("Failed to save card timing config:", err);
      alert("Could not save card timing (see console).");
    }
  }

  // Automatically turn off live override when the user scrolls the page
  // so the scroll animation plays smoothly and doesn't freeze.
  useEffect(() => {
    const handleWindowScroll = () => {
      if (coordValues.live) {
        toggleCoordLive(false);
      }
    };
    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleWindowScroll);
  }, [coordValues.live]);

  // Converts a stored px width (tuned against a 1920px reference design)
  // into a fluid clamp() string: min px floor, vw-scaled preferred value,
  // max px ceiling (the original tuned value, so it matches exactly at
  // 1920px). Used anywhere layoutConfig's *Width numbers get turned into
  // an inline style, since inline styles override the CSS clamp() rules
  // in HeroPage2.css and were silently making the cards fixed-width again.
  const REFERENCE_VW = 1920;
  function pxToClampVw(px, minPx) {
    const vw = (px / REFERENCE_VW) * 100;
    return `max(${minPx}px, ${vw.toFixed(3)}vw)`;
  }

  // Mirrors pxToClampVw's math but returns the actual resolved number in
  // px for a given viewport width, instead of a CSS string — this is
  // what the dev panel shows so the readout reflects reality (dynamic)
  // instead of just echoing back the static reference value.
  function resolvedClampPx(px, minPx, vpWidth) {
    const vw = (px / REFERENCE_VW) * 100;
    const preferred = (vw / 100) * vpWidth;
    return Math.round(Math.max(minPx, preferred));
  }

  // Anchors the title card's LEFT edge relative to the content card's
  // ACTUAL edge (via CSS calc()), instead of two independent left%
  // values drifting apart. Without this, both cards' widths cap out at
  // their clamp() max on large screens while their left% positions keep
  // spreading — on an ultrawide monitor the gap between them can balloon
  // to 700px+. calc() re-evaluates on resize automatically, so this
  // stays correct at any viewport width with zero JS involved at
  // runtime.
  //
  // direction:
  //   "right" — content sits LEFT of title (Beat 2's normal layout).
  //             title.left = content.left% + content.width + gap
  //   "left"  — content sits RIGHT of title (Beat 3's swapped layout).
  //             title.left = content.left% - title.width - gap
  //             (title card ends up positioned to content's left)
  //
  // The gap itself is a small clamp(): never below 40px (your floor),
  // gently scales up on very large screens (matching how the 3D ring
  // stays "corner pinned" regardless of screen size), capped so it
  // never runs away either.
  function getTitleLeftCalc(
    contentLeftStyle,
    contentWidthPx,
    titleWidthPx,
    direction = "right",
  ) {
    const gapClamp = "max(40px, 2vw)";
    if (direction === "left") {
      const titleWidthClamp = pxToClampVw(titleWidthPx, 200);
      return `calc(${contentLeftStyle} - ${titleWidthClamp} - ${gapClamp})`;
    }
    const contentWidthClamp = pxToClampVw(contentWidthPx, 320);
    return `calc(${contentLeftStyle} + ${contentWidthClamp} + ${gapClamp})`;
  }

  const getContentCardStyle = () => {
    const { contentLeft, contentTop, contentWidth } = layoutConfig;
    return {
      position: "absolute",
      left: `${contentLeft}%`,
      top: `${contentTop}%`,
      width: pxToClampVw(contentWidth, 320),
      bottom: "20px", // always stretches to 20px from screen bottom
    };
  };

  return (
    <div className="hero2-page">
      {/* Per-beat background — Vanta FOG, one preset per beat
          (beatFogPresets.js). Crossfades using the exact blend weight
          RingHero reports via onBeatBlendUpdate below, so it never
          drifts from the ring's own scroll position. (The old particle/
          shader BeatBackground layer has been removed — this is now the
          only background layer.) */}
      <VantaBeatFogBackground
        ref={vantaBeatRef}
        beatOptions={beatFogOptions}
        zIndex={1}
      />

      {/* Dev-only tuning panel for the per-beat Vanta FOG colors/blur/
          zoom/speed above. Toggle with the small button; "Save as
          default" persists the whole 5-beat array to localStorage. Strip
          this block for production if you don't want it shippable. */}
      <button
        onClick={() => setShowFogPanel((v) => !v)}
        style={{
          position: "fixed",
          bottom: 16,
          left: 16,
          zIndex: 1000,
          padding: "6px 12px",
          fontSize: 11,
          fontFamily: "monospace",
          background: "#121212",
          color: "#FAF9F6",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        Fog Panel: {showFogPanel ? "On" : "Off"}
      </button>
      {showFogPanel && (
        <VantaFogControlPanel
          beatIndex={fogPanelBeat}
          onBeatIndexChange={setFogPanelBeat}
          beatCount={beatFogOptions.length}
          options={beatFogOptions[fogPanelBeat]}
          onChange={(next) =>
            setBeatFogOptions((all) =>
              all.map((o, i) => (i === fogPanelBeat ? next : o)),
            )
          }
          onSaveAsDefault={() => saveBeatFogPresets(beatFogOptions)}
          onResetToShipped={() => {
            resetBeatFogPresets();
            setBeatFogOptions(BEAT_FOG_PRESETS);
          }}
        />
      )}

      {/* Live scroll/beat readout integrated inside the Animation Timeline */}

      {/* Glassmorphism Title & Content Cards Overlay */}
      <div className="glassy-content-overlay">
        {/* Beat 2 Layout */}
        <div ref={beat2OverlayRef} className="glassy-beat-layout">
          <ContentGlassyCard
            className="beat-content-left"
            style={getContentCardStyle()}
          >
            <div className="glassy-slide-container">
              <div ref={beat2SlideTrackRef} className="glassy-slide-track">
                {/* Slide 1: First 2 images */}
                <div ref={beat2Slide1Ref} className="glassy-slide">
                  <div className="glassy-grid-2">
                    <div className="glassy-grid-item">
                      <img src="/1.png" alt="Yellow Gold band" />
                    </div>
                    <div className="glassy-grid-item">
                      <img src="/2.png" alt="Pave close up" />
                    </div>
                  </div>
                </div>

                {/* Slide 2: Next 2 images */}
                <div ref={beat2Slide2Ref} className="glassy-slide">
                  <div className="glassy-grid-2">
                    <div className="glassy-grid-item">
                      <img src="/3.png" alt="Prong profiles" />
                    </div>
                    <div className="glassy-grid-item">
                      <img src="/4.png" alt="Diamond cuts" />
                    </div>
                  </div>
                </div>

                {/* Slide 3: Video */}
                <div ref={beat2Slide3Ref} className="glassy-slide">
                  <div className="glassy-video-container">
                    <video
                      ref={beat2VideoRef}
                      src="/MarquiseSideStone_HiddenHalo_Cushion_533985AX-R.mp4"
                      loop
                      muted
                      playsInline
                    />
                  </div>
                </div>
              </div>
            </div>
          </ContentGlassyCard>
          <TitleGlassyCard
            className="beat-title-right"
            style={{
              left: getTitleLeftCalc(
                `${layoutConfig.contentLeft}%`,
                layoutConfig.contentWidth,
                layoutConfig.titleWidth,
                "right",
              ),
              top: `${layoutConfig.titleTop}%`,
              width: pxToClampVw(layoutConfig.titleWidth, 200),
            }}
            subtitle="01 — PRODUCT SHOWCASE"
            title="Classic E-Commerce Visuals"
            description="High-fidelity 360° product photography, macro detail grids, and studio lighting tailored for luxury jewellery collections."
            href="/classic"
            linkText="EXPLORE →"
          />
        </div>

        {/* Beat 3 Layout — content/title cards use their OWN static
            beat3LayoutConfig position (already the "swapped" layout),
            instead of sharing layoutConfig with Beat 2 and being
            repositioned at runtime. This avoids any visible swap since
            the cards are simply born in their final spot. */}
        <div ref={beat3OverlayRef} className="glassy-beat-layout">
          <ContentGlassyCard
            className="beat-content-left"
            style={{
              position: "absolute",
              left: `calc(100% - ${layoutConfig.contentLeft}% - ${pxToClampVw(layoutConfig.contentWidth, 320)})`,
              top: `${beat3LayoutConfig.contentTop}%`,
              width: pxToClampVw(layoutConfig.contentWidth, 320),
              bottom: "20px",
            }}
          >
            <div className="glassy-slide-container">
              <div ref={beat3SlideTrackRef} className="glassy-slide-track">
                {/* Slide 1: 5-column masonry collage layout matching reference design */}
                <div ref={beat3Slide1Ref} className="glassy-slide">
                  <div className="glassy-grid-masonry">
                    {/* Column 1 */}
                    <div className="glassy-masonry-column">
                      <div className="glassy-grid-item" style={{ flex: 1 }}>
                        <img
                          src="/Creative%20visuals/Beauty.png"
                          alt="Beauty Model Jewellery"
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 1.4 }}>
                        <img
                          src="/Creative%20visuals/Figaro-BR-CH-Y-V1.png"
                          alt="Figaro Bracelet Chain"
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 0.8 }}>
                        <img
                          src="/Creative%20visuals/R1-L2-P1-SB-Y-V4.png"
                          alt="Pave Band Ring"
                        />
                      </div>
                    </div>

                    {/* Column 2 */}
                    <div className="glassy-masonry-column">
                      <div className="glassy-grid-item" style={{ flex: 0.75 }}>
                        <video
                          ref={beat3VideoRef}
                          src="/Creative%20visuals/A6-R3-HQ.mp4"
                          loop
                          muted
                          autoPlay
                          playsInline
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 2.25 }}>
                        <img
                          src="/Creative%20visuals/NB-1%20LO%20R.png"
                          alt="Ring Render Low Angle"
                        />
                      </div>
                    </div>

                    {/* Column 3 */}
                    <div className="glassy-masonry-column">
                      <div className="glassy-grid-item" style={{ flex: 1.5 }}>
                        <img
                          src="/Creative%20visuals/NP-1-YG-LS2-V2.png"
                          alt="Yellow Gold Pendant"
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 1.0 }}>
                        <video
                          src="/Creative%20visuals/B4%20ANimated.mp4"
                          loop
                          muted
                          autoPlay
                          playsInline
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 1.2 }}>
                        <img
                          src="/Creative%20visuals/R4-L2-Y-V4.png"
                          alt="Gold Ring Studio"
                        />
                      </div>
                    </div>

                    {/* Column 4 */}
                    <div className="glassy-masonry-column">
                      <div className="glassy-grid-item" style={{ flex: 1.0 }}>
                        <img
                          src="/Creative%20visuals/R6-L2-Y-V1.png"
                          alt="Ring Profile"
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 0.65 }}>
                        <video
                          src="/Creative%20visuals/KC-A01-TR1%20.mp4"
                          loop
                          muted
                          autoPlay
                          playsInline
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 1.1 }}>
                        <img
                          src="/Creative%20visuals/RG01_Out2_0000.png"
                          alt="Ring Outdoor Macro"
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 0.95 }}>
                        <img
                          src="/Creative%20visuals/RG01-Y-B-V1.png"
                          alt="Ring Band View"
                        />
                      </div>
                    </div>

                    {/* Column 5 */}
                    <div className="glassy-masonry-column">
                      <div className="glassy-grid-item" style={{ flex: 0.4 }}>
                        <img
                          src="/Creative%20visuals/4%20Ring%20Banner%20T4%20HQ_.jpg"
                          alt="Ring Collection Banner"
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 2.8 }}>
                        <video
                          src="/MarquiseSideStone_HiddenHalo_Cushion_533985AX-R.mp4"
                          loop
                          muted
                          autoPlay
                          playsInline
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 2: 5-column masonry collage with shuffled layout rhythm */}
                <div ref={beat3Slide2Ref} className="glassy-slide">
                  <div className="glassy-grid-masonry">
                    {/* Column 1 */}
                    <div className="glassy-masonry-column">
                      <div className="glassy-grid-item" style={{ flex: 1.2 }}>
                        <img
                          src="/Creative%20visuals/RG01-Y-B-V2.png"
                          alt="Ring Detail V2"
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 1.3 }}>
                        <video
                          src="/Creative%20visuals/360%20Turntable%20black.mp4"
                          loop
                          muted
                          autoPlay
                          playsInline
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 0.7 }}>
                        <img
                          src="/Creative%20visuals/RG01-Y-B-V3.png"
                          alt="Ring Detail V3"
                        />
                      </div>
                    </div>

                    {/* Column 2 */}
                    <div className="glassy-masonry-column">
                      <div className="glassy-grid-item" style={{ flex: 0.8 }}>
                        <img
                          src="/Creative%20visuals/RG01-Y-B-V4.png"
                          alt="Ring Detail V4"
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 2.2 }}>
                        <img
                          src="/Band%20Ring%20With%20Enamel%20Marquise-Y-V1.jpg"
                          alt="Enamel Marquise Band"
                        />
                      </div>
                    </div>

                    {/* Column 3 */}
                    <div className="glassy-masonry-column">
                      <div className="glassy-grid-item" style={{ flex: 1.4 }}>
                        <img
                          src="/Creative%20visuals/Ring%202-Color%20BG-V1-R3.png"
                          alt="Two-Tone Ring"
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 1.1 }}>
                        <img
                          src="/Creative%20visuals/Ring%202-Color%20BG-V1-R6.png"
                          alt="Two-Tone Ring 2"
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 1.2 }}>
                        <video
                          src="/Creative%20visuals/M-Video.mp4"
                          loop
                          muted
                          autoPlay
                          playsInline
                        />
                      </div>
                    </div>

                    {/* Column 4 */}
                    <div className="glassy-masonry-column">
                      <div className="glassy-grid-item" style={{ flex: 1.0 }}>
                        <img
                          src="/G7P25CLACRAW0113D00-TZPDP00005-14Y-V1-WB.png"
                          alt="Diamond Ring 14Y"
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 0.7 }}>
                        <img
                          src="/G7P25CLACRAW0113D00-TZPDP00005-CPG-V2-WB.png"
                          alt="Rose Gold Ring"
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 1.2 }}>
                        <video
                          src="/Creative%20visuals/Multishot%20Brown.mp4"
                          loop
                          muted
                          autoPlay
                          playsInline
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 0.8 }}>
                        <img src="/1.png" alt="Yellow Gold Band Close-up" />
                      </div>
                    </div>

                    {/* Column 5 */}
                    <div className="glassy-masonry-column">
                      <div className="glassy-grid-item" style={{ flex: 0.45 }}>
                        <img src="/2.png" alt="Pave Macro" />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 2.75 }}>
                        <video
                          src="/Creative%20visuals/S4.mp4"
                          loop
                          muted
                          autoPlay
                          playsInline
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 3: 5-column masonry collage variation */}
                <div ref={beat3Slide3Ref} className="glassy-slide">
                  <div className="glassy-grid-masonry">
                    {/* Column 1 */}
                    <div className="glassy-masonry-column">
                      <div className="glassy-grid-item" style={{ flex: 1.1 }}>
                        <img src="/3.png" alt="Prong Profiles" />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 1.3 }}>
                        <img src="/4.png" alt="Diamond Cuts" />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 0.8 }}>
                        <video
                          src="/Creative%20visuals/Webptimized.mp4"
                          loop
                          muted
                          autoPlay
                          playsInline
                        />
                      </div>
                    </div>

                    {/* Column 2 */}
                    <div className="glassy-masonry-column">
                      <div className="glassy-grid-item" style={{ flex: 0.85 }}>
                        <video
                          src="/Creative%20visuals/VIDEO.1.128.mp4"
                          loop
                          muted
                          autoPlay
                          playsInline
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 2.15 }}>
                        <img
                          src="/Creative%20visuals/ring.png"
                          alt="Classic Ring Render"
                        />
                      </div>
                    </div>

                    {/* Column 3 */}
                    <div className="glassy-masonry-column">
                      <div className="glassy-grid-item" style={{ flex: 1.5 }}>
                        <video
                          src="/Creative%20visuals/FK-A1-Final-HQ.mp4"
                          loop
                          muted
                          autoPlay
                          playsInline
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 0.9 }}>
                        <img
                          src="/Creative%20visuals/Beauty.png"
                          alt="Beauty Shot"
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 1.3 }}>
                        <img
                          src="/Creative%20visuals/Figaro-BR-CH-Y-V1.png"
                          alt="Figaro Bracelet"
                        />
                      </div>
                    </div>

                    {/* Column 4 */}
                    <div className="glassy-masonry-column">
                      <div className="glassy-grid-item" style={{ flex: 0.9 }}>
                        <img
                          src="/Creative%20visuals/R1-L2-P1-SB-Y-V4.png"
                          alt="Pave Band"
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 0.75 }}>
                        <video
                          src="/Creative%20visuals/A6-R3-HQ.mp4"
                          loop
                          muted
                          autoPlay
                          playsInline
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 1.15 }}>
                        <img
                          src="/Creative%20visuals/NP-1-YG-LS2-V2.png"
                          alt="Pendant Render"
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 0.9 }}>
                        <img
                          src="/Creative%20visuals/R4-L2-Y-V4.png"
                          alt="Gold Ring"
                        />
                      </div>
                    </div>

                    {/* Column 5 */}
                    <div className="glassy-masonry-column">
                      <div className="glassy-grid-item" style={{ flex: 0.4 }}>
                        <img
                          src="/Creative%20visuals/RG01_Out2_0000.png"
                          alt="Outdoor Macro"
                        />
                      </div>
                      <div className="glassy-grid-item" style={{ flex: 2.8 }}>
                        <video
                          src="/Creative%20visuals/ZBZ-A4-Final-HQ.mp4"
                          loop
                          muted
                          autoPlay
                          playsInline
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ContentGlassyCard>
          <TitleGlassyCard
            className="beat-title-right"
            style={{
              left: `calc(100% - (${layoutConfig.contentLeft}% + ${pxToClampVw(layoutConfig.contentWidth, 320)} + max(40px, 2vw) + ${pxToClampVw(layoutConfig.titleWidth, 200)}))`,
              top: `${beat3LayoutConfig.titleTop}%`,
              width: pxToClampVw(layoutConfig.titleWidth, 200),
            }}
            subtitle="02 — CREATIVE CINEMATICS"
            title="Creative Visuals"
            description="Cinematic animations, dynamic lighting studies, and stylized visual storytelling that elevates your brand identity."
            href="/creative-visuals"
            linkText="EXPLORE →"
          />
        </div>

        {/* Beat 4 Layout (Emerging / Fullscreen Box for On-Body Visuals) */}
        <Link
          to="/onbody"
          ref={beat4OverlayRef}
          className="beat4-box-overlay group cursor-pointer block text-decoration-none relative overflow-hidden"
        >
          <img
            src="/Gemini_Generated_Image_udnfihudnfihudnf.png"
            alt="On-Body Visualization Showcase"
            className="beat4-media group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-8 md:p-12 text-[#FCFBFA] z-10 pointer-events-auto">
            <span className="text-[#C5A059] font-label text-[10px] tracking-[0.3em] uppercase font-semibold block mb-2">
              03 — ON-BODY VISUALIZATION
            </span>
            <h2 className="font-[Poppins] font-semibold text-2xl sm:text-4xl md:text-5xl text-[#FCFBFA] mb-2 leading-tight">
              On-Body Visuals
            </h2>
            <p className="font-[Poppins] font-light text-xs sm:text-sm md:text-base text-[#FCFBFA]/90 max-w-xl mb-5 leading-relaxed">
              Realistic digital human integration and high-contrast skin tone interaction showcasing jewellery scale, fit, and elegance.
            </p>
            <div className="btn-primary inline-flex items-center gap-2 py-3 px-6 text-xs font-semibold tracking-widest uppercase rounded-md text-[#FCFBFA] w-fit">
              EXPLORE →
            </div>
          </div>
        </Link>
      </div>

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
        autoRotateStartFrame={(AUTO_ROTATE_GLOBAL_FRAME / TOTAL_FRAMES) * 50}
        autoRotateEndFrame={(AUTO_ROTATE_GLOBAL_END_FRAME / TOTAL_FRAMES) * 50}
        autoRotateSpeed={0.6}
        interactiveRotateStartFrame={
          (AUTO_ROTATE_GLOBAL_FRAME / TOTAL_FRAMES) * 50
        }
        interactiveRotateEndFrame={
          (AUTO_ROTATE_GLOBAL_END_FRAME / TOTAL_FRAMES) * 50
        }
        onPoseOverrideReady={(api) => {
          poseApiRef.current = api;
          refreshSavedBeats();
        }}
        onBeatBlendUpdate={(blend) => {
          vantaBeatRef.current?.setBlend(blend);
        }}
        onScrollDebugUpdate={(info) => {
          if (timelineRef.current) {
            const currentPose = poseApiRef.current?.getCurrentPose?.();
            timelineRef.current.update(info, currentPose);
          }

          const frame = info.progress * TOTAL_FRAMES;
          const roundedFrame = Math.round(frame);

          // Keep the last-known global frame available outside this
          // callback (the live-preview useEffect on cardTimingConfig
          // reads it) and apply the beat 2/3 overlay math for this frame.
          lastFrameRef.current = frame;
          applyCardOverlayFrame(frame, cardTimingConfig);

          // "Explore 3D Viewer" link — visible only while the global frame
          // is within [EXPLORE_LINK_GLOBAL_FRAME, _END_FRAME], i.e. only
          // during its own beat. Toggled every tick (not a one-way
          // latch), so it hides again if the user scrolls back up past
          // EXPLORE_LINK_GLOBAL_FRAME.
          if (exploreLinkRef.current) {
            const showExploreLink =
              frame >= EXPLORE_LINK_GLOBAL_FRAME &&
              frame <= EXPLORE_LINK_GLOBAL_END_FRAME;
            exploreLinkRef.current.classList.toggle(
              "is-visible",
              showExploreLink,
            );
          }

          // Footer reveal — 0 (fully hidden below viewport) -> 1 (fully
          // in place) as frame goes from FOOTER_REVEAL_GLOBAL_START_FRAME
          // to _END_FRAME. Clamped so it holds at 0 before frame 245 and
          // stays at 1 if somehow scrolled past 260 (shouldn't happen,
          // 260 is TOTAL_FRAMES). Reverses smoothly on scroll-up since
          // it's driven by the same continuous progress value every
          // tick, not a one-way reveal.
          if (footerRevealRef.current) {
            const footerT = Math.min(
              1,
              Math.max(
                0,
                (frame - FOOTER_REVEAL_GLOBAL_START_FRAME) /
                  (FOOTER_REVEAL_GLOBAL_END_FRAME -
                    FOOTER_REVEAL_GLOBAL_START_FRAME),
              ),
            );
            footerRevealRef.current.style.transform = `translateY(${(1 - footerT) * 100}%)`;
            footerRevealRef.current.style.pointerEvents =
              footerT > 0.5 ? "auto" : "none";

            // Lift the ring up in lockstep with the footer's own reveal
            // progress (0 -> 1), so it stays fully visible above the
            // footer panel instead of clipping behind it. Uses the same
            // live pose-override channel the dev panel drives
            // (setRingPosOffsetOverride), so it composes correctly with
            // whatever the scroll-tweened Beat 6 pose already is —
            // released back to null once the footer is fully hidden
            // again (footerT === 0) so normal scroll-tweened behavior
            // resumes rather than leaving a stale override applied.
            poseApiRef.current?.setRingPosOffsetOverride(
              footerT > 0 ? { y: footerT * FOOTER_RING_LIFT_AMOUNT } : null,
            );

            // Hide the nav bar in lockstep with the same footerT — slides
            // fully up off-screen (translateY -100%) by the time the
            // footer/ring reveal completes, and slides back down smoothly
            // if the user scrolls back up, exactly like every other
            // reversible effect here.
            if (navRef.current) {
              navRef.current.style.transform = `translateY(-${footerT * 100}%)`;
            }
          }

          // Debounce React state update so sliders sync to scrolled values when scrolling stops
          clearTimeout(scrollDebounceRef.current);
          scrollDebounceRef.current = setTimeout(() => {
            if (poseApiRef.current) {
              const currentFrame = Math.round(info.progress * TOTAL_FRAMES);

              setCoordValues((prev) => {
                if (prev.activeFrame === currentFrame) return prev;
                const snap = poseApiRef.current?.getKeyframeSnapshot?.() ?? {};
                const kf = snap[currentFrame];
                const base = poseApiRef.current?.getBaseValuesForFrame?.(
                  currentFrame,
                ) ?? {
                  camPos: { x: 0, y: 0.2, z: 4.2 },
                  ringRot: { x: 0.15, y: 0, z: 0 },
                  ringPosOffset: { x: 0, y: 0, z: 0 },
                  ringScale: 1,
                };
                return {
                  ...prev,
                  activeFrame: currentFrame,
                  camX: kf?.camPos?.x ?? base.camPos.x,
                  camY: kf?.camPos?.y ?? base.camPos.y,
                  camZ: kf?.camPos?.z ?? base.camPos.z,
                  rotX: kf?.ringRot?.x ?? base.ringRot.x,
                  rotY: kf?.ringRot?.y ?? base.ringRot.y,
                  rotZ: kf?.ringRot?.z ?? base.ringRot.z ?? 0,
                  posX: kf?.ringPosOffset?.x ?? base.ringPosOffset?.x ?? 0,
                  posY: kf?.ringPosOffset?.y ?? base.ringPosOffset?.y ?? 0,
                  posZ: kf?.ringPosOffset?.z ?? base.ringPosOffset?.z ?? 0,
                  scale: kf?.ringScale ?? base.ringScale ?? 1,
                };
              });
            }
          }, 150);
        }}
      />

      {/* "Explore 3D Viewer" Glassy Card — visible during Beat 5 */}
      <div
        ref={exploreLinkRef}
        className="hero2-explore-link"
      >
        <Link
          to="/3d-viewer"
          className="glassy-card p-6 md:p-8 border border-white/20 bg-black/60 backdrop-blur-2xl rounded-xl shadow-2xl flex flex-col gap-3 max-w-md text-decoration-none text-left pointer-events-auto block hover:border-[#C5A059]/60 transition-colors"
        >
          <span className="text-[#C5A059] font-label text-[10px] tracking-[0.25em] uppercase font-semibold block">
            04 — 3D INTERACTIVE ENGINE
          </span>
          <h2 className="font-[Poppins] font-semibold text-2xl md:text-3xl text-[#FCFBFA] tracking-tight leading-tight m-0">
            Interactive 3D Viewer
          </h2>
          <p className="font-[Poppins] font-light text-xs md:text-sm text-[#FCFBFA]/85 leading-relaxed m-0 whitespace-normal">
            Real-time WebGL customizer with dynamic metal switching, diamond refraction, and interactive raycasting controls. Launching soon.
          </p>
          <div className="btn-primary inline-flex items-center gap-2 py-2.5 px-5 text-[11px] font-semibold tracking-widest uppercase rounded-md text-[#FCFBFA] w-fit mt-1">
            EXPLORE →
          </div>
        </Link>
      </div>

      {/* Footer reveal panel — fixed to the bottom of the viewport,
          starts translated fully offscreen (translateY 100%) and slides
          up into place as global frame goes 245 -> 260 (see
          FOOTER_REVEAL_GLOBAL_START_FRAME/_END_FRAME + the
          onScrollDebugUpdate block above that writes the transform every
          tick). Sits above the fixed ring canvas (z-index 0/1) and the
          scroll-content sections (z-index 2) but below the nav. */}
      <footer
        ref={footerRevealRef}
        className="hero2-footer-reveal"
        style={{ transform: "translateY(100%)" }}
      >
        <div className="hero2-footer-inner">
          <div className="hero2-footer-top">
            <div className="hero2-footer-brand">
              <span className="hero2-logo">Cinegem Studio</span>
              <p>
                The Art of Digital Craft. Luxury jewellery rendering, 3D
                visualization, and cinematic animation.
              </p>
              <Link to="/inquire" className="hero2-cta-btn">
                Inquire →
              </Link>
            </div>

            <div className="hero2-footer-col">
              <span className="hero2-footer-col-title">Services</span>
              <Link to="/classic">Classic E-Commerce</Link>
              <Link to="/creative-visuals">Creative Visuals</Link>
              <Link to="/onbody">On-Body Visualization</Link>
              <Link to="/">The Vault</Link>
            </div>

            <div className="hero2-footer-col">
              <span className="hero2-footer-col-title">Connect</span>
              <Link to="/inquire">Inquiries</Link>
              <a
                href="https://www.instagram.com/cinegemstudio?igsh=MXd5dzQ0OGF2enBjdg=="
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram
              </a>
              <a
                href="https://www.behance.net/cinegem-studio/projects"
                target="_blank"
                rel="noopener noreferrer"
              >
                Behance
              </a>
              <a href="mailto:hello@cinegemstudio.com">Email</a>
            </div>
          </div>

          <div className="hero2-footer-bottom">
            <p className="hero2-footer-copyright">
              © {new Date().getFullYear()} Cinegem Studio. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {SHOW_DEV_PANEL && timelineVisible && (
        <TimelineEditor
          ref={timelineRef}
          values={coordValues}
          savedBeats={savedBeats}
          onSelectBeat={selectCoordFrame}
          onChange={updateCoord}
          onToggleLive={toggleCoordLive}
          onSave={saveCoordKeyframe}
          onClear={clearCoordKeyframe}
          poseApiRef={poseApiRef}
          beatCount={BEATS.length}
          onJumpToProgress={(progress, smooth) =>
            poseApiRef.current?.jumpToProgress(progress, smooth)
          }
          onReboot={() => {
            console.log(
              "Model reload clicked! Re-loading GLB and updating beats:",
              BEATS,
            );
            poseApiRef.current?.reloadRingModel(BEATS);
          }}
          onMoveKeyframe={moveCoordKeyframe}
        />
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

          {/* Independent toggle for the bottom "3D Animation Timeline &
              Channel Box" bar — stacked directly below the dev-panel
              toggle. Always on screen (even while the timeline itself is
              hidden) so there's always a way back in. */}
          <button
            onClick={() => setTimelineVisible((v) => !v)}
            style={{
              position: "fixed",
              top: 124,
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
            {timelineVisible ? "Hide timeline" : "Show timeline"}
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
              layoutConfig={layoutConfig}
              setLayoutConfig={setLayoutConfig}
              beat3LayoutConfig={beat3LayoutConfig}
              setBeat3LayoutConfig={setBeat3LayoutConfig}
              onSaveBeat3Layout={saveBeat3LayoutConfig}
              viewportWidth={viewportWidth}
              resolvedClampPx={resolvedClampPx}
              cardTimingConfig={cardTimingConfig}
              setCardTimingConfig={setCardTimingConfig}
              defaultCardTimingConfig={DEFAULT_CARD_TIMING_CONFIG}
              onSaveCardTiming={saveCardTimingConfig}
            />
          )}
        </>
      )}

      {/* Dedicated minimal header for Hero2: transparent background with centered Logo image, stuck flush to top edge */}
      <header
        ref={navRef}
        className="fixed top-0 left-0 right-0 z-50 flex justify-center items-start pt-0 px-6 bg-transparent pointer-events-none transition-all duration-500"
      >
        <Link
          to="/"
          className="pointer-events-auto inline-block transition-opacity duration-300 hover:opacity-80 focus:outline-none"
          aria-label="Cinegem Studio — return to top"
        >
          <img
            src="/Logo.png"
            alt="Cinegem Studio Logo"
            className="h-28 sm:h-36 md:h-44 lg:h-52 w-auto object-contain filter drop-shadow block -mt-1 sm:-mt-7 md:-mt-14 lg:-mt-17"
          />
        </Link>
      </header>

      {/* Tall scrollable content — its height drives the ScrollTrigger
          timeline inside RingHero. Must match id used in
          scrollContainerSelector prop above. */}
      {/* One <section> per BEATS[i] entry in RingHero.jsx — keep both in
          sync. 6 beats: idle -> corner park -> pose -> pose -> center
          (ring back to Beat 1 pose) -> standing spin. */}
      <div id="scroll-content" className="hero2-scroll-content">
        {/* Beat 1 — idle ring */}
        <section className="hero2-section">
          <div className="hero2-section-inner"></div>
        </section>

        {/* Beat 2 — ring parks in the bottom-right corner (cinematic
            camera arc + push-in zoom, see BEATS[1] in RingHero.jsx) */}
        <section id="work" className="hero2-section">
          <div className="hero2-section-inner align-right"></div>
        </section>

        {/* Beat 3 — pose beat (see BEATS[2] in RingHero.jsx) */}
        <section id="details" className="hero2-section">
          <div className="hero2-section-inner align-right"></div>
        </section>

        {/* Beat 4 — pose beat (see BEATS[3] in RingHero.jsx) */}
        <section id="views" className="hero2-section">
          <div className="hero2-section-inner"></div>
        </section>

        {/* Beat 5 — ring returns to center (idle hero pose, like Beat 1) */}
        <section id="center" className="hero2-section">
          <div className="hero2-section-inner"></div>
        </section>

        {/* Beat 6 — standing spin, closing beat */}
        <section id="contact" className="hero2-section hero2-section-cta">
          <div className="hero2-section-inner"></div>
        </section>
      </div>
    </div>
  );
}

/**
 * buildCardCss
 * -------------------------------------------------------------------------
 * Builds the .beat-content-left / .beat-title-right CSS text from the
 * current layoutConfig — shared by both the "Copy CSS" and "Save CSS"
 * dev-panel buttons so they can never drift out of sync with each other.
 * -------------------------------------------------------------------------
 */
function buildCardCss(layoutConfig) {
  let contentPosCss = "";
  if (layoutConfig.heightAnchor === "center") {
    contentPosCss = `  top: ${layoutConfig.contentTop}%;
  transform: translateY(-50%);`;
  } else if (layoutConfig.heightAnchor === "top") {
    contentPosCss = `  top: calc(${layoutConfig.contentTop}% - 190px);`;
  } else if (layoutConfig.heightAnchor === "bottom") {
    contentPosCss = `  bottom: calc(${100 - layoutConfig.contentTop}% - 190px);
  top: auto;`;
  }

  return `.beat-content-left {
  position: absolute;
  left: ${layoutConfig.contentLeft}%;
  width: ${layoutConfig.contentWidth}px;
  bottom: 20px;
${contentPosCss}
}
.beat-title-right {
  position: absolute;
  left: ${layoutConfig.titleLeft}%;
  top: ${layoutConfig.titleTop}%;
  width: ${layoutConfig.titleWidth}px;
}`;
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
 * CornerParkPanel
 * -------------------------------------------------------------------------
 * Live control over Beat 2's corner-park amount — how far the ring has
 * traveled/shrunk into the bottom-right corner, driven by cornerPark in
 * RingHero's BEATS[1] and read every tick via poseOverrideRef.cornerPark
 * when "live" is on. Jump to Beat 2 with the button below to see it.
 * -------------------------------------------------------------------------
 */

// BeatCoordPanel was replaced by the advanced TimelineEditor component at the bottom of the viewport.

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
  layoutConfig,
  setLayoutConfig,
  beat3LayoutConfig,
  setBeat3LayoutConfig,
  onSaveBeat3Layout,
  viewportWidth,
  resolvedClampPx,
  cardTimingConfig,
  setCardTimingConfig,
  defaultCardTimingConfig,
  onSaveCardTiming,
}) {
  const gemCount = meshDebugList.filter((m) => m.type === "gem").length;
  const metalCount = meshDebugList.filter((m) => m.type === "metal").length;

  return (
    <div
      data-lenis-prevent
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

      {/* Card Layout Controls */}
      <div
        style={{
          marginTop: 16,
          borderTop: "1px solid rgba(255,255,255,0.15)",
          paddingTop: 14,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 8,
            fontSize: 11,
            color: "#4DA3FF",
          }}
        >
          CARD LAYOUT CONTROLS
        </div>

        {/* Content Card Position & Size */}
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 10,
              opacity: 0.7,
              marginBottom: 6,
            }}
          >
            Content Card (Left)
          </div>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 10 }}>
              Left: {layoutConfig.contentLeft}%
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={layoutConfig.contentLeft}
              onChange={(e) =>
                setLayoutConfig((prev) => ({
                  ...prev,
                  contentLeft: Number(e.target.value),
                }))
              }
              style={{ width: 120, height: 4 }}
            />
          </label>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 10 }}>
              Top: {layoutConfig.contentTop}%
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={layoutConfig.contentTop}
              onChange={(e) =>
                setLayoutConfig((prev) => ({
                  ...prev,
                  contentTop: Number(e.target.value),
                }))
              }
              style={{ width: 120, height: 4 }}
            />
          </label>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 10 }}>
              Width: {layoutConfig.contentWidth}px ref → currently{" "}
              {resolvedClampPx(layoutConfig.contentWidth, 320, viewportWidth)}
              px
            </span>
            <input
              type="range"
              min="200"
              max="1000"
              step="10"
              value={layoutConfig.contentWidth}
              onChange={(e) =>
                setLayoutConfig((prev) => ({
                  ...prev,
                  contentWidth: Number(e.target.value),
                }))
              }
              style={{ width: 120, height: 4 }}
            />
          </label>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 10 }}>
              Height: {layoutConfig.contentHeight}px
            </span>
            <input
              type="range"
              min="200"
              max="800"
              step="10"
              value={layoutConfig.contentHeight}
              onChange={(e) =>
                setLayoutConfig((prev) => ({
                  ...prev,
                  contentHeight: Number(e.target.value),
                }))
              }
              style={{ width: 120, height: 4 }}
            />
          </label>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 10 }}>Anchor:</span>
            <select
              value={layoutConfig.heightAnchor}
              onChange={(e) =>
                setLayoutConfig((prev) => ({
                  ...prev,
                  heightAnchor: e.target.value,
                }))
              }
              style={{
                width: 120,
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: 4,
                color: "#fff",
                fontSize: 10,
                padding: "2px 4px",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="center">Center (Symmetric)</option>
              <option value="top">Lock Top (Grow Down)</option>
              <option value="bottom">Lock Bottom (Grow Up)</option>
            </select>
          </label>
        </div>

        {/* Title Card Position & Size */}
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 10,
              opacity: 0.7,
              marginBottom: 6,
            }}
          >
            Title Card (Right)
          </div>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 10 }}>
              Left: {layoutConfig.titleLeft}%
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={layoutConfig.titleLeft}
              onChange={(e) =>
                setLayoutConfig((prev) => ({
                  ...prev,
                  titleLeft: Number(e.target.value),
                }))
              }
              style={{ width: 120, height: 4 }}
            />
          </label>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 10 }}>Top: {layoutConfig.titleTop}%</span>
            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={layoutConfig.titleTop}
              onChange={(e) =>
                setLayoutConfig((prev) => ({
                  ...prev,
                  titleTop: Number(e.target.value),
                }))
              }
              style={{ width: 120, height: 4 }}
            />
          </label>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 10 }}>
              Width: {layoutConfig.titleWidth}px ref → currently{" "}
              {resolvedClampPx(layoutConfig.titleWidth, 200, viewportWidth)}px
            </span>
            <input
              type="range"
              min="150"
              max="800"
              step="10"
              value={layoutConfig.titleWidth}
              onChange={(e) =>
                setLayoutConfig((prev) => ({
                  ...prev,
                  titleWidth: Number(e.target.value),
                }))
              }
              style={{ width: 120, height: 4 }}
            />
          </label>
        </div>

        {/* Beat 3 Swapped Position Controls — independent from the
            Content/Title controls above, which drive Beat 2 (and Beat 3's
            pre-swap starting position). These control where Beat 3's cards
            land AFTER the swap animation. */}
        <div
          style={{
            marginBottom: 12,
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: 10,
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: 10,
              opacity: 0.7,
              marginBottom: 6,
              color: "#8fd694",
            }}
          >
            Beat 3 — Swapped Positions
          </div>

          <div
            style={{
              fontSize: 9,
              opacity: 0.5,
              marginBottom: 8,
              color: "#8ecbff",
            }}
          >
            * Horizontal positions are automatically mirrored from Beat 2 for
            responsive alignment.
          </div>

          <div style={{ fontSize: 9, opacity: 0.5, marginBottom: 4 }}>
            Content Card (ends up right)
          </div>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 10 }}>
              Top: {beat3LayoutConfig.contentTop}%
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={beat3LayoutConfig.contentTop}
              onChange={(e) =>
                setBeat3LayoutConfig((prev) => ({
                  ...prev,
                  contentTop: Number(e.target.value),
                }))
              }
              style={{ width: 120, height: 4 }}
            />
          </label>

          <div style={{ fontSize: 9, opacity: 0.5, margin: "8px 0 4px" }}>
            Title Card (ends up left)
          </div>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 10 }}>
              Top: {beat3LayoutConfig.titleTop}%
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={beat3LayoutConfig.titleTop}
              onChange={(e) =>
                setBeat3LayoutConfig((prev) => ({
                  ...prev,
                  titleTop: Number(e.target.value),
                }))
              }
              style={{ width: 120, height: 4 }}
            />
          </label>

          <button
            onClick={onSaveBeat3Layout}
            style={{
              marginTop: 6,
              width: "100%",
              padding: "6px 10px",
              fontSize: 10,
              fontWeight: 600,
              background: "rgba(143, 214, 148, 0.15)",
              border: "1px solid rgba(143, 214, 148, 0.4)",
              borderRadius: 4,
              color: "#8fd694",
              cursor: "pointer",
            }}
          >
            Save Beat 3 Layout
          </button>
        </div>

        {/* Card Timing Controls — global frame scale (0–211) */}
        {cardTimingConfig && setCardTimingConfig && (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 10,
                opacity: 0.7,
                marginBottom: 6,
                color: "#f0c060",
              }}
            >
              ⏱ Card Timing (global frames 0–211)
            </div>
            {/* Beat 2 (global frames 11–61) */}
            <div style={{ fontSize: 9, opacity: 0.5, marginBottom: 4 }}>
              Beat 2 Card
            </div>
            {[
              ["Entry Start", "beat2EntryStart", 0, 211, 1],
              ["Entry End", "beat2EntryEnd", 0, 211, 1],
              ["Exit Start", "beat2ExitStart", 0, 211, 1],
              ["Exit End", "beat2ExitEnd", 0, 211, 1],
            ].map(([label, key, min, max, step]) => (
              <label
                key={key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 10 }}>
                  {label}: {cardTimingConfig[key]}
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={cardTimingConfig[key]}
                  onChange={(e) =>
                    setCardTimingConfig((prev) => ({
                      ...prev,
                      [key]: Number(e.target.value),
                    }))
                  }
                  style={{ width: 120, height: 4 }}
                />
              </label>
            ))}
            {/* Beat 3 (global frames 61–111) */}
            <div
              style={{
                fontSize: 9,
                opacity: 0.5,
                marginBottom: 4,
                marginTop: 6,
              }}
            >
              Beat 3 Card
            </div>
            {[
              ["Entry Start", "beat3EntryStart", 0, 211, 1],
              ["Entry End", "beat3EntryEnd", 0, 211, 1],
              ["Exit Start", "beat3ExitStart", 0, 211, 1],
              ["Exit End", "beat3ExitEnd", 0, 211, 1],
            ].map(([label, key, min, max, step]) => (
              <label
                key={key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 10 }}>
                  {label}: {cardTimingConfig[key]}
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={cardTimingConfig[key]}
                  onChange={(e) =>
                    setCardTimingConfig((prev) => ({
                      ...prev,
                      [key]: Number(e.target.value),
                    }))
                  }
                  style={{ width: 120, height: 4 }}
                />
              </label>
            ))}

            {/* Beat 4 (global frames 111–161) */}
            <div
              style={{
                fontSize: 9,
                opacity: 0.5,
                marginBottom: 4,
                marginTop: 6,
              }}
            >
              Beat 4 Card
            </div>
            {[
              ["Entry Start", "beat4EntryStart", 0, 211, 1],
              ["Entry End", "beat4EntryEnd", 0, 211, 1],
              ["Exit Start", "beat4ExitStart", 0, 211, 1],
              ["Exit End", "beat4ExitEnd", 0, 211, 1],
            ].map(([label, key, min, max, step]) => (
              <label
                key={key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 10 }}>
                  {label}:{" "}
                  {cardTimingConfig[key] ?? defaultCardTimingConfig[key]}
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={cardTimingConfig[key] ?? defaultCardTimingConfig[key]}
                  onChange={(e) =>
                    setCardTimingConfig((prev) => ({
                      ...prev,
                      [key]: Number(e.target.value),
                    }))
                  }
                  style={{ width: 120, height: 4 }}
                />
              </label>
            ))}

            {/* Save / Reset buttons */}
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button
                onClick={onSaveCardTiming}
                style={{
                  flex: 1,
                  padding: "4px 10px",
                  fontSize: 10,
                  background: "rgba(90, 200, 120, 0.2)",
                  border: "1px solid rgba(90, 200, 120, 0.4)",
                  borderRadius: 4,
                  color: "#8ef0a8",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                💾 Save Card Timing
              </button>
              <button
                onClick={() => setCardTimingConfig(defaultCardTimingConfig)}
                style={{
                  flex: 1,
                  padding: "4px 10px",
                  fontSize: 10,
                  background: "rgba(240, 100, 60, 0.2)",
                  border: "1px solid rgba(240, 100, 60, 0.4)",
                  borderRadius: 4,
                  color: "#f0c060",
                  cursor: "pointer",
                }}
              >
                Reset Timing
              </button>
            </div>
          </div>
        )}

        {/* Copy / Save CSS helpers */}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => {
              const css = buildCardCss(layoutConfig);
              navigator.clipboard
                .writeText(css)
                .then(() => alert("CSS copied to clipboard!"));
            }}
            style={{
              flex: 1,
              background: "rgba(77, 163, 255, 0.2)",
              border: "1px solid rgba(77, 163, 255, 0.4)",
              borderRadius: 6,
              color: "#fff",
              padding: "6px 8px",
              fontSize: 10,
              cursor: "pointer",
              fontWeight: "bold",
              marginTop: 4,
            }}
          >
            📋 COPY CSS
          </button>
          <button
            onClick={() => {
              const css = buildCardCss(layoutConfig);
              // Blob + temporary <a download> is the standard way to trigger
              // a client-side file save without any backend — the browser
              // handles the actual "Save As" / downloads-folder behavior.
              const blob = new Blob([css], { type: "text/css" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "hero2-cards.css";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
            style={{
              flex: 1,
              background: "rgba(90, 200, 120, 0.2)",
              border: "1px solid rgba(90, 200, 120, 0.4)",
              borderRadius: 6,
              color: "#8ef0a8",
              padding: "6px 8px",
              fontSize: 10,
              cursor: "pointer",
              fontWeight: "bold",
              marginTop: 4,
            }}
          >
            💾 SAVE CSS
          </button>
        </div>
      </div>

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
 * gem) — same 5 controls, same ranges/units as your viewer's dev
 * controls.
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

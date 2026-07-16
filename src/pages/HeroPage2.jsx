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
      lightSpread: 3,
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

  const [postFxEnabled, setPostFxEnabled] = useState(true);
  const [panelVisible, setPanelVisible] = useState(true);

  // Beat coordinate panel — works across ALL beats.
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
    beat4EntryStart: 111,
    beat4EntryEnd: 131,
    beat4ExitStart: 141,
    beat4ExitEnd: 161,
  };
  const [cardTimingConfig, setCardTimingConfig] = useState(() => {
    try {
      const saved = window.localStorage.getItem("hero2CardTimingConfig");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Force the new 20-frame duration configuration for Beat 4
        parsed.beat4EntryEnd = 131;
        parsed.beat4ExitStart = 141;
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

  const getContentCardStyle = () => {
    const { contentLeft, contentTop, contentWidth } = layoutConfig;
    return {
      position: "absolute",
      left: `${contentLeft}%`,
      top: `${contentTop}%`,
      width: `${contentWidth}px`,
      bottom: "20px", // always stretches to 20px from screen bottom
    };
  };

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
              left: `${layoutConfig.titleLeft}%`,
              top: `${layoutConfig.titleTop}%`,
              width: `${layoutConfig.titleWidth}px`,
            }}
            subtitle="Details"
            title="Grounded in the details"
          />
        </div>

        {/* Beat 3 Layout */}
        <div ref={beat3OverlayRef} className="glassy-beat-layout">
          <ContentGlassyCard
            className="beat-content-left"
            style={getContentCardStyle()}
          >
            <div className="glassy-slide-container">
              <div ref={beat3SlideTrackRef} className="glassy-slide-track">
                {/* Slide 1: First 2 images */}
                <div ref={beat3Slide1Ref} className="glassy-slide">
                  <div className="glassy-grid-2">
                    <div className="glassy-grid-item">
                      <img src="/2.png" alt="Diamond cuts" />
                    </div>
                    <div className="glassy-grid-item">
                      <img src="/4.png" alt="Prong profiles" />
                    </div>
                  </div>
                </div>

                {/* Slide 2: Next 2 images */}
                <div ref={beat3Slide2Ref} className="glassy-slide">
                  <div className="glassy-grid-2">
                    <div className="glassy-grid-item">
                      <img src="/1.png" alt="Yellow Gold band" />
                    </div>
                    <div className="glassy-grid-item">
                      <img src="/3.png" alt="Pave close up" />
                    </div>
                  </div>
                </div>

                {/* Slide 3: Video */}
                <div ref={beat3Slide3Ref} className="glassy-slide">
                  <div className="glassy-video-container">
                    <video
                      ref={beat3VideoRef}
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
              left: `${layoutConfig.titleLeft}%`,
              top: `${layoutConfig.titleTop}%`,
              width: `${layoutConfig.titleWidth}px`,
            }}
            subtitle="Precision"
            title="Seen from every angle"
          />
        </div>

        {/* Beat 4 Layout (Emerging / Fullscreen Box) */}
        <div ref={beat4OverlayRef} className="beat4-box-overlay">
          <img
            src="/Gemini_Generated_Image_udnfihudnfihudnf.png"
            alt="Jellyfish underwater"
            className="beat4-media"
          />
        </div>
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
        onPoseOverrideReady={(api) => {
          poseApiRef.current = api;
          refreshSavedBeats();
        }}
        onBeatBlendUpdate={(blend) => {
          beatBackgroundRef.current?.setBlend(blend);
          sideRaysRef.current?.setBlend(blend);
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

      {SHOW_DEV_PANEL && (
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
              cardTimingConfig={cardTimingConfig}
              setCardTimingConfig={setCardTimingConfig}
              defaultCardTimingConfig={DEFAULT_CARD_TIMING_CONFIG}
              onSaveCardTiming={saveCardTimingConfig}
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
          sync. 6 beats: idle -> corner park -> pose -> pose -> center
          (ring back to Beat 1 pose) -> standing spin. */}
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

        {/* Beat 2 — ring parks in the bottom-right corner (cinematic
            camera arc + push-in zoom, see BEATS[1] in RingHero.jsx) */}
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

        {/* Beat 3 — pose beat (see BEATS[2] in RingHero.jsx) */}
        <section id="details" className="hero2-section">
          <div className="hero2-section-inner align-right">
            <h2>Seen from every angle</h2>
            <p>
              The same ring, the same light — reframed to show off a different
              facet of the piece.
            </p>
          </div>
        </section>

        {/* Beat 4 — pose beat (see BEATS[3] in RingHero.jsx) */}
        <section id="views" className="hero2-section">
          <div className="hero2-section-inner">
            <h2>Every angle, considered</h2>
            <p>
              Top, front, and side — the same render, the same materials, broken
              out the way a product page needs them.
            </p>
          </div>
        </section>

        {/* Beat 5 — ring returns to center (idle hero pose, like Beat 1) */}
        <section id="center" className="hero2-section">
          <div className="hero2-section-inner">
            <h2>Back to the beginning</h2>
            <p>
              The same ring, the same light — seen again from the top, exactly
              as it was. Familiar, but now you've seen everything in between.
            </p>
          </div>
        </section>

        {/* Beat 6 — standing spin, closing beat */}
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
              Width: {layoutConfig.contentWidth}px
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
              Width: {layoutConfig.titleWidth}px
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
                  {label}: {cardTimingConfig[key] ?? defaultCardTimingConfig[key]}
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

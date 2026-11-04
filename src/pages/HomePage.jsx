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

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSeo } from "@/seo/useSeo";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import RingHero, { BEATS } from "@/components/three/RingHero";
import VantaBeatFogBackground from "@/components/effects/VantaBeatFogBackground";
import { useHomePageMedia } from "@/hooks/useHomePageMedia";
import MediaImage from "@/components/shared/MediaImage";
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
import PerfDevHud, { usePerfFlags } from "@/components/dev/PerfDevHud";
import "./HeroPage2.css";
import LoadingScreen from "@/components/ui/LoadingScreen";
import VerticalDotNav, {
  DEFAULT_HOME_SECTIONS,
} from "@/components/ui/VerticalDotNav";
import { isDevMode } from "@/config/env";

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

const SHOW_DEV_PANEL = isDevMode();

function pickVideoSrc(v) {
  if (!v) return "";
  const narrow = typeof window !== "undefined" && window.innerWidth < 768;
  const saveData = typeof navigator !== "undefined" && navigator.connection?.saveData === true;
  return narrow || saveData
    ? v.srcLow || v.src || v.full || ""
    : v.src || v.full || v.srcLow || "";
}
const DEFAULT_METAL_HDR_CONFIG = {
  rotation: -105,
  rotationY: -9,
  scale: 134,
  power: 1,
  gamma: 167,
};

// Octane Diamond Slot Defaults (Identity transform at first load)
const DEFAULT_GEM_BASE_ENV = {
  power: 1.0,
  gamma: 1.2,
  rot: 0,
  scaleU: 1.0,
  scaleV: 1.0,
  lockScale: true,
  transU: 0.0,
  transV: 0.0,
  lod: 0.5,
  mono: true,
  scaleInvert: false,
};

const DEFAULT_GEM_SPOT_ENV = {
  power: 4.0,
  gamma: 1.8,
  size: 2,
  rot: 0,
  scaleU: 1.0,
  scaleV: 1.0,
  lockScale: true,
  transU: 0.0,
  transV: 0.0,
  lod: 0.0,
  mono: true,
  scaleInvert: false,
};

// Octane ER_11 Ground Truth Reference from node editor & inspector
const OCTANE_ER11_BASE_ENV = {
  power: 1.0,
  gamma: 1.2,
  rot: 30,
  scaleU: 0.5,
  scaleV: 0.2,
  lockScale: false,
  transU: -0.433,
  transV: 0.252,
  lod: 0.5,
  mono: true,
  scaleInvert: false,
};

const OCTANE_ER11_SPOT_ENV = {
  power: 4.0,
  gamma: 1.8,
  size: 2,
  rot: 30,
  scaleU: 0.3,
  scaleV: 0.3,
  lockScale: true,
  transU: 0.095,
  transV: -0.079,
  lod: 0.0,
  mono: true,
  scaleInvert: false,
};

// Cinegem 3DViewer reference bloom config (soft optical diamond spill)
const DEFAULT_BLOOM_CONFIG = {
  enabled: true,
  gemsOnly: true,
  threshold: 0.96,
  soft: 0.35,
  intensity: 0.035,
  radius: 0.28,
  levels: 5,
  debug: false,
};

// Live 2:1 EXR preview configuration (Task B)
const DEFAULT_PREVIEW_CONFIG = {
  ev: 0,
  tonemap: true,
  raw: false,
  markThreshold: false,
};

// Decoupled post-processing effects config (Task D3)
const DEFAULT_POSTFX_CONFIG = {
  noiseEnabled: true,
  vignetteEnabled: true,
};

const DEFAULT_DISPERSION = 0.006;


export default function HomePage() {
  useSeo("home");
  const lenisRef = useRef(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const activeSectionRef = useRef(0);

  // Video playback & scroll activity refs
  const beat2VideoRef = useRef(null);
  const beat3VideoRef = useRef(null);
  const beat2VideoActiveRef = useRef(false);
  const beat3VideoActiveRef = useRef(false);
  const videoPlayDebounceRef = useRef(null);
  const resumeVisibleVideosRef = useRef(null);

  const onScrollAction = useCallback(() => {
    // Instantly pause videos during active scrolling
    if (beat2VideoRef.current && !beat2VideoRef.current.paused) {
      beat2VideoRef.current.pause();
    }
    if (beat3VideoRef.current && !beat3VideoRef.current.paused) {
      beat3VideoRef.current.pause();
    }

    // Schedule resume when scrolling stops (80ms settle)
    clearTimeout(videoPlayDebounceRef.current);
    videoPlayDebounceRef.current = setTimeout(() => {
      videoPlayDebounceRef.current = null;
      resumeVisibleVideosRef.current?.();
    }, 80);
  }, []);

  // Synchronize active dot with scroll position across the 5 sections
  const updateActiveSection = useCallback(() => {
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight
    );

    const progress = Math.min(1, Math.max(0, scrollY / maxScroll));
    const currentFrame = progress * TOTAL_FRAMES;

    let newIndex = 0;
    if (currentFrame < 25) {
      newIndex = 0; // Overview
    } else if (currentFrame < 68) {
      newIndex = 1; // Classic E-Commerce
    } else if (currentFrame < 114) {
      newIndex = 2; // Creative Visuals
    } else if (currentFrame < 185) {
      newIndex = 3; // On-Body Visuals
    } else {
      newIndex = 4; // 3D Interactive (Frame 185 to 260)
    }

    if (newIndex !== activeSectionRef.current) {
      activeSectionRef.current = newIndex;
      setActiveSectionIndex(newIndex);
    }
  }, []);

  // Window scroll, wheel, touch & resize listeners for real-time dot tracking and scroll video pausing
  useEffect(() => {
    const handleScroll = () => {
      updateActiveSection();
      onScrollAction();
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("wheel", onScrollAction, { passive: true });
    window.addEventListener("touchmove", onScrollAction, { passive: true });
    window.addEventListener("resize", updateActiveSection, { passive: true });
    updateActiveSection();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", onScrollAction);
      window.removeEventListener("touchmove", onScrollAction);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [updateActiveSection, onScrollAction]);

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

    lenisRef.current = lenis;

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
    const handleLenisScroll = (e) => {
      ScrollTrigger.update();
      updateActiveSection();

      const vel = Math.abs(e?.velocity || 0);
      if (vel > 0.15) {
        if (beat2VideoRef.current && !beat2VideoRef.current.paused) {
          beat2VideoRef.current.pause();
        }
        if (beat3VideoRef.current && !beat3VideoRef.current.paused) {
          beat3VideoRef.current.pause();
        }
        clearTimeout(videoPlayDebounceRef.current);
        videoPlayDebounceRef.current = setTimeout(() => {
          videoPlayDebounceRef.current = null;
          resumeVisibleVideosRef.current?.();
        }, 80);
      } else {
        if (!videoPlayDebounceRef.current) {
          resumeVisibleVideosRef.current?.();
        }
      }
    };
    lenis.on("scroll", handleLenisScroll);

    return () => {
      lenisRef.current = null;
      lenis.off("scroll", handleLenisScroll);
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
  const [gemBaseHdrUrl, setGemBaseHdrUrl] = useState(
    "/hdr/Diamond-Base-HDRI.exr",
  );
  const [gemSpotHdrUrl, setGemSpotHdrUrl] = useState(
    "/hdr/Diamond-Spotlight-HDRI.exr",
  );
  const [gemMode, setGemMode] = useState(null); // null = preset default ("refraction"), or "matte"
  const [meshDebugList, setMeshDebugList] = useState([]);

  // Studio lighting & Octane Diamond Dual-EXR Slot States
  const [metalHdrConfig, setMetalHdrConfig] = useState(DEFAULT_METAL_HDR_CONFIG);
  const [gemBaseEnv, setGemBaseEnv] = useState(DEFAULT_GEM_BASE_ENV);
  const [gemSpotEnv, setGemSpotEnv] = useState(DEFAULT_GEM_SPOT_ENV);
  const [gemEnvView, setGemEnvView] = useState(0); // 0 = Base+Spot, 1 = Base only, 2 = Spot only
  const [gemGammaMode, setGemGammaMode] = useState(0); // 0 = Octane pow(x, γ), 1 = Legacy pow(x, 1/γ)
  const [bloomConfig, setBloomConfig] = useState(DEFAULT_BLOOM_CONFIG);
  const [baseFileMeta, setBaseFileMeta] = useState(null);
  const [spotFileMeta, setSpotFileMeta] = useState(null);
  const [dispersionStrength, setDispersionStrength] = useState(DEFAULT_DISPERSION);
  const [previewConfig, setPreviewConfig] = useState(DEFAULT_PREVIEW_CONFIG);
  const [postFxConfig, setPostFxConfig] = useState(DEFAULT_POSTFX_CONFIG);
  const [baseFileNameHint, setBaseFileNameHint] = useState("Diamond-Base-HDRI.exr");
  const [spotFileNameHint, setSpotFileNameHint] = useState("Diamond-Spotlight-HDRI.exr");

  // Live 2:1 EXR preview canvas refs and renderer callback (Task B)
  const renderEnvPreviewRef = useRef(null);
  const envCanvasRef = useRef(null);
  const baseCanvasRef = useRef(null);
  const spotCanvasRef = useRef(null);

  const updatePreviews = useCallback(() => {
    if (!renderEnvPreviewRef.current) return;
    const markThr = previewConfig.markThreshold ? (bloomConfig.threshold ?? 1.0) : 0;
    if (envCanvasRef.current) {
      renderEnvPreviewRef.current(envCanvasRef.current, {
        mode: 2,
        raw: previewConfig.raw,
        ev: previewConfig.ev,
        tonemap: previewConfig.tonemap,
        markThreshold: markThr,
      });
    }
    if (baseCanvasRef.current) {
      renderEnvPreviewRef.current(baseCanvasRef.current, {
        mode: 0,
        raw: previewConfig.raw,
        ev: previewConfig.ev,
        tonemap: previewConfig.tonemap,
        markThreshold: markThr,
      });
    }
    if (spotCanvasRef.current) {
      renderEnvPreviewRef.current(spotCanvasRef.current, {
        mode: 1,
        raw: previewConfig.raw,
        ev: previewConfig.ev,
        tonemap: previewConfig.tonemap,
        markThreshold: markThr,
      });
    }
  }, [previewConfig, bloomConfig.threshold]);

  const [postFxEnabled, setPostFxEnabled] = useState(true);
  const [panelVisible, setPanelVisible] = useState(false);

  useEffect(() => {
    if (panelVisible) {
      const id = requestAnimationFrame(() => {
        updatePreviews();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [
    panelVisible,
    gemBaseEnv,
    gemSpotEnv,
    gemEnvView,
    gemGammaMode,
    gemBaseHdrUrl,
    gemSpotHdrUrl,
    previewConfig,
    bloomConfig.threshold,
    updatePreviews,
  ]);
  // Independent from panelVisible — hides/shows the bottom "3D Animation
  // Timeline & Channel Box" bar (TimelineEditor) without touching the
  // MaterialDevPanel sliders. Defaults to false so the user experience is clean.
  const [timelineVisible, setTimelineVisible] = useState(false);

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

  // 3D Experience Loading Screen State
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStatus, setLoadStatus] = useState("Initiating exhibition...");
  const [shouldStart3D, setShouldStart3D] = useState(false);

  // Dev-only performance A/B switches (?perf=noring,nofog,noblur,novideo)
  const perfFlags = usePerfFlags();

  useEffect(() => {
    if (perfFlags.noring) {
      setIsLoading(false);
    }
  }, [perfFlags.noring]);

  // Defer heavy 3D WebGL / Draco initialization so intro ring animation plays at buttery smooth 60fps
  useEffect(() => {
    const isDebug = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("ringdebug");
    if (isDebug) {
      setShouldStart3D(true);
      return;
    }
    const t = setTimeout(() => {
      setShouldStart3D(true);
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  // Vertical Dot Navigation scroll handler
  const handleDotClick = useCallback((index, section) => {
    // Immediately set active dot state for instant, responsive feedback
    setActiveSectionIndex(index);
    activeSectionRef.current = index;

    const maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight
    );

    // Frame-accurate destination targeting:
    // 0: Home (frame 0)
    // 1: Classic E-Commerce (frame 45)
    // 2: Creative Visuals (frame 93)
    // 3: On-Body Visuals (frame 147)
    // 4: 3D Interactive (frame 223)
    const targetFrame = section?.frame ?? 0;
    const targetScrollY = Math.round((targetFrame / TOTAL_FRAMES) * maxScroll);

    const currentScrollY = window.scrollY || window.pageYOffset || 0;
    const distancePx = Math.abs(targetScrollY - currentScrollY);
    const distanceRatio = Math.min(1, distancePx / maxScroll);

    // Leisurely, slow, buttery smooth cinematic glide
    // Minimum 2.4s for close sections, scaling up to 4.2s for long jumps
    const duration = 2.4 + distanceRatio * 1.8;

    if (lenisRef.current) {
      // Gentle easeInOutSine: soft acceleration, consistent calm cruise, silky deceleration (no jumping)
      lenisRef.current.scrollTo(targetScrollY, {
        duration,
        easing: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
      });
    } else {
      window.scrollTo({
        top: targetScrollY,
        behavior: "smooth",
      });
    }
  }, []);

  // Header Logo click handler: smoothly scroll to Home section
  const handleLogoClick = useCallback(
    (e) => {
      e.preventDefault();
      handleDotClick(0, DEFAULT_HOME_SECTIONS[0]);
    },
    [handleDotClick]
  );

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

  const beat3OverlayRef = useRef(null);
  const beat3SlideTrackRef = useRef(null);
  const beat3Slide1Ref = useRef(null);
  const beat3Slide2Ref = useRef(null);
  const beat3Slide3Ref = useRef(null);

  const beat4OverlayRef = useRef(null);

  // Optimized media assets dynamically fetched via R2 manifests
  const {
    beat2Images,
    beat2Video,
    beat3Images,
    beat3Video,
    beat4Image,
  } = useHomePageMedia();

  const beat2ResolvedVideoSrc = useMemo(() => {
    return pickVideoSrc(beat2Video);
  }, [beat2Video]);

  const beat3ResolvedVideoSrc = useMemo(() => {
    return pickVideoSrc(beat3Video);
  }, [beat3Video]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("IntersectionObserver" in window)) {
      if (beat2VideoRef.current && beat2ResolvedVideoSrc && !beat2VideoRef.current.src) {
        beat2VideoRef.current.src = beat2ResolvedVideoSrc;
      }
      if (beat3VideoRef.current && beat3ResolvedVideoSrc && !beat3VideoRef.current.src) {
        beat3VideoRef.current.src = beat3ResolvedVideoSrc;
      }
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !perfFlags.novideo) {
            const vid = entry.target;
            const targetSrc = vid.dataset.src;
            if (targetSrc && (!vid.src || !vid.src.includes(targetSrc))) {
              vid.src = targetSrc;
              vid.load();
            }
          }
        });
      },
      { rootMargin: "600px" }
    );

    if (beat2VideoRef.current) observer.observe(beat2VideoRef.current);
    if (beat3VideoRef.current) observer.observe(beat3VideoRef.current);

    return () => observer.disconnect();
  }, [beat2ResolvedVideoSrc, beat3ResolvedVideoSrc, perfFlags.novideo]);

  // Buffer home page videos during browser idle time once initial 3D experience has loaded
  useEffect(() => {
    if (isLoading || typeof window === "undefined" || perfFlags.novideo) return;

    const bufferVideos = () => {
      const b2Src = pickVideoSrc(beat2Video);
      const b3Src = pickVideoSrc(beat3Video);

      if (beat2VideoRef.current && b2Src && !beat2VideoRef.current.src) {
        beat2VideoRef.current.src = b2Src;
        beat2VideoRef.current.preload = "auto";
      }
      if (beat3VideoRef.current && b3Src && !beat3VideoRef.current.src) {
        beat3VideoRef.current.src = b3Src;
        beat3VideoRef.current.preload = "auto";
      }
    };

    let idleId;
    let timerId;
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(bufferVideos, { timeout: 2000 });
    } else {
      timerId = setTimeout(bufferVideos, 1500);
    }

    return () => {
      if (idleId && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timerId) {
        clearTimeout(timerId);
      }
      if (videoPlayDebounceRef.current) {
        clearTimeout(videoPlayDebounceRef.current);
      }
    };
  }, [isLoading, beat2Video, beat3Video]);

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
  const [savedBeats, setSavedBeats] = useState(() => new Set(BEATS.map((b) => b.frame)));

  // [EXPERIMENTAL_ATMOSPHERE] Experimental atmospheric fog, macro DOF & weightless float at frame 0
  const [experimentalAtmosphere, setExperimentalAtmosphere] = useState(true);

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

  // Centralized video resume controller: plays visible video in loop when scrolling stops
  const resumeVisibleVideos = useCallback(() => {
    if (perfFlags.novideo) return;

    const frame = lastFrameRef.current;
    const config = cardTimingConfig;

    const playVideo = (v, src) => {
      if (!v) return;
      if (src && (!v.src || !v.src.includes(src))) {
        v.src = src;
      }
      v.muted = true;
      v.playsInline = true;
      v.loop = true;
      if (v.paused) {
        const p = v.play();
        if (p && typeof p.catch === "function") {
          p.catch(() => {});
        }
      }
    };

    const pauseVideo = (v) => {
      if (v && !v.paused) {
        v.pause();
      }
    };

    // Beat 2: Video is Slide 3 of the track.
    // Slide 3 begins entering when trackProgress >= 0.45.
    const b2es = config.beat2EntryStart; // 25
    const b2ee = config.beat2EntryEnd;   // 35
    const b2xs = config.beat2ExitStart;  // 51
    const b2xe = config.beat2ExitEnd;    // 61
    const inBeat2 = frame >= b2es && frame <= b2xe;
    const b2Progress = inBeat2 && frame >= b2ee
      ? Math.min(1, Math.max(0, (frame - b2ee) / Math.max(0.001, b2xs - b2ee)))
      : 0;
    const isBeat2VideoVisible = inBeat2 && b2Progress >= 0.45;

    // Beat 3: Video is item 5 (bottom wide banner in editorial track).
    // Bottom banner begins entering when trackProgress >= 0.35.
    const b3es = config.beat3EntryStart; // 75
    const b3ee = config.beat3EntryEnd;   // 85
    const b3xs = config.beat3ExitStart;  // 101
    const b3xe = config.beat3ExitEnd;    // 111
    const inBeat3 = frame >= b3es && frame <= b3xe;
    const b3Progress = inBeat3 && frame >= b3ee
      ? Math.min(1, Math.max(0, (frame - b3ee) / Math.max(0.001, b3xs - b3ee)))
      : 0;
    const isBeat3VideoVisible = inBeat3 && b3Progress >= 0.35;

    if (isBeat2VideoVisible) {
      playVideo(beat2VideoRef.current, beat2ResolvedVideoSrc);
    } else {
      pauseVideo(beat2VideoRef.current);
    }

    if (isBeat3VideoVisible) {
      playVideo(beat3VideoRef.current, beat3ResolvedVideoSrc);
    } else {
      pauseVideo(beat3VideoRef.current);
    }
  }, [beat2ResolvedVideoSrc, beat3ResolvedVideoSrc, cardTimingConfig, perfFlags.novideo]);

  useEffect(() => {
    resumeVisibleVideosRef.current = resumeVisibleVideos;
  }, [resumeVisibleVideos]);

  const [timelineTarget, setTimelineTarget] = useState("desktop");

  // Selecting a frame prefills the sliders from that frame's interpolated
  // base values, UNLESS a keyframe was already saved for it or Live Override is ON.
  function selectCoordFrame(frame) {
    const snap = poseApiRef.current?.getKeyframeSnapshot?.(timelineTarget) ?? {};
    const kf = snap[frame];
    const base = poseApiRef.current?.getBaseValuesForFrame?.(frame, timelineTarget) ?? {
      camPos: { x: 0, y: 0.2, z: 4.2 },
      ringRot: { x: 0.15, y: 0, z: 0 },
      ringPosOffset: { x: 0, y: 0, z: 0 },
      ringScale: 1,
    };
    setCoordValues((prev) => {
      if (prev.live) {
        // Keep live overridden values intact so user changes do not vanish on scrub/jump
        return {
          ...prev,
          activeFrame: frame,
        };
      }
      return {
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
      };
    });
    poseApiRef.current?.jumpToBeat(frame, false);
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
      const frame = coordValues.activeFrame;
      const snap = poseApiRef.current?.getKeyframeSnapshot?.() ?? {};
      const kf = snap[frame];
      const base = poseApiRef.current?.getBaseValuesForFrame?.(frame, timelineTarget) ?? {
        camPos: { x: 0, y: 0.2, z: 4.2 },
        ringRot: { x: 0.15, y: 0, z: 0 },
        ringPosOffset: { x: 0, y: 0, z: 0 },
        ringScale: 1,
      };
      const next = {
        ...coordValues,
        live: false,
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
      setCoordValues(next);
      poseApiRef.current?.setCamOverride(null);
      poseApiRef.current?.setRingRotOverride(null);
      poseApiRef.current?.setRingPosOffsetOverride(null);
      poseApiRef.current?.setRingScaleOverride(null);
    }
  }

  function refreshSavedBeats(target = timelineTarget) {
    const snap = poseApiRef.current?.getKeyframeSnapshot?.(target) ?? {};
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
    const curPose = poseApiRef.current?.getCurrentPose?.();
    poseApiRef.current?.saveKeyframe(activeFrame, {
      camPos: { x: camX, y: camY, z: camZ },
      ringRot: { x: rotX, y: rotY, z: rotZ },
      ringPosOffset: { x: posX, y: posY, z: posZ },
      ringScale: scale,
      cornerPark: curPose?.cornerPark !== undefined ? curPose.cornerPark : (activeFrame <= 210 ? 1 : 0),
    }, timelineTarget);
    refreshSavedBeats(timelineTarget);
  }

  function clearCoordKeyframe() {
    poseApiRef.current?.clearKeyframe(coordValues.activeFrame, timelineTarget);
    refreshSavedBeats(timelineTarget);
  }

  function moveCoordKeyframe(oldFrame, newFrame) {
    if (oldFrame === newFrame) return;
    poseApiRef.current?.moveKeyframe?.(oldFrame, newFrame, timelineTarget);
    refreshSavedBeats(timelineTarget);
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
    const isPortraitScreen =
      typeof window !== "undefined" &&
      window.innerWidth <= 1024 &&
      window.innerHeight > window.innerWidth;

    // ---- BEAT 2 ----
    const b2es = config.beat2EntryStart;
    const b2ee = config.beat2EntryEnd;
    const b2xs = config.beat2ExitStart;
    const b2xe = config.beat2ExitEnd;

    const winH = typeof window !== "undefined" ? window.innerHeight : 1000;
    const slideDist = Math.max(1200, winH + 200);
    let beat2YOffset = slideDist;
    let beat2Opacity = 0;

    if (frame < b2es) {
      beat2YOffset = slideDist;
      beat2Opacity = 0;
    } else if (frame >= b2es && frame < b2ee) {
      const t = (frame - b2es) / Math.max(0.001, b2ee - b2es);
      const easeT = t * t * (3 - 2 * t);
      beat2YOffset = slideDist * (1 - easeT);
      beat2Opacity = 1;
    } else if (frame >= b2ee && frame < b2xs) {
      beat2YOffset = 0;
      beat2Opacity = 1;
    } else if (frame >= b2xs && frame <= b2xe) {
      const t = (frame - b2xs) / Math.max(0.001, b2xe - b2xs);
      const easeT = t * t * (3 - 2 * t);
      beat2YOffset = -slideDist * easeT;
      beat2Opacity = 1;
    } else {
      beat2YOffset = -slideDist;
      beat2Opacity = 0;
    }

    if (beat2OverlayRef.current) {
      beat2OverlayRef.current.style.transform = `translateY(${beat2YOffset}px)`;
      beat2OverlayRef.current.style.opacity = beat2Opacity;
      beat2OverlayRef.current.style.display = beat2Opacity > 0 ? "block" : "none";
      beat2OverlayRef.current.style.pointerEvents = "none";
    }

    if (frame >= b2ee && frame <= b2xe) {
      const activeRange = Math.max(0.001, b2xs - b2ee);
      const trackProgress = Math.min(
        1,
        Math.max(0, (frame - b2ee) / activeRange),
      );
      const trackElem = beat2SlideTrackRef.current;
      const totalSlides = 3;
      const slideH = beat2Slide1Ref.current?.clientHeight ?? 380;
      const containerH =
        trackElem?.parentElement?.clientHeight ?? 380;
      const maxScrollOffset = trackElem
        ? Math.max(0, trackElem.scrollHeight - containerH)
        : Math.max(0, totalSlides * slideH - containerH);
      const pxOffset = trackProgress * maxScrollOffset;
      if (trackElem) {
        trackElem.style.transform = `translateY(-${pxOffset}px)`;
      }
      const dominant = trackProgress < 0.35 ? 0 : trackProgress < 0.7 ? 1 : 2;
      const isVideoActive = dominant === 2;
      if (beat2VideoActiveRef.current !== isVideoActive) {
        beat2VideoActiveRef.current = isVideoActive;
        if (beat2OverlayRef.current) {
          beat2OverlayRef.current.classList.toggle("video-active", isVideoActive);
        }
        if (isVideoActive && (import.meta.env.DEV || import.meta.env.VITE_APP_MODE === "dev")) {
          const v = beat2VideoRef.current;
          let buf = 0;
          try {
            if (v?.buffered?.length > 0) buf = v.buffered.end(0);
          } catch (_err) {
            void _err;
          }
          console.log(`[video-perf] Beat 2 video dominant | readyState: ${v?.readyState} | buffered: ${buf.toFixed(2)}s / ${(v?.duration || 0).toFixed(2)}s`);
        }
      }
      if (beat2VideoRef.current && beat2ResolvedVideoSrc && !beat2VideoRef.current.src) {
        beat2VideoRef.current.src = beat2ResolvedVideoSrc;
      }
    } else {
      if (beat2VideoActiveRef.current) {
        beat2VideoActiveRef.current = false;
        if (beat2OverlayRef.current) {
          beat2OverlayRef.current.classList.remove("video-active");
        }
      }
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

    let beat3YOffset = slideDist;
    let beat3Opacity = 0;

    if (frame < b3es) {
      beat3YOffset = slideDist;
      beat3Opacity = 0;
    } else if (frame >= b3es && frame < b3ee) {
      const t = (frame - b3es) / Math.max(0.001, b3ee - b3es);
      const easeT = t * t * (3 - 2 * t);
      beat3YOffset = slideDist * (1 - easeT);
      beat3Opacity = 1;
    } else if (frame >= b3ee && frame < b3xs) {
      beat3YOffset = 0;
      beat3Opacity = 1;
    } else if (frame >= b3xs && frame <= b3xe) {
      const t = (frame - b3xs) / Math.max(0.001, b3xe - b3xs);
      const easeT = t * t * (3 - 2 * t);
      beat3YOffset = -slideDist * easeT;
      beat3Opacity = 1;
    } else {
      beat3YOffset = -slideDist;
      beat3Opacity = 0;
    }

    if (beat3OverlayRef.current) {
      beat3OverlayRef.current.style.transform = `translateY(${beat3YOffset}px)`;
      beat3OverlayRef.current.style.opacity = beat3Opacity;
      beat3OverlayRef.current.style.display = beat3Opacity > 0 ? "block" : "none";
      beat3OverlayRef.current.style.pointerEvents = "none";
    }

    if (frame >= b3ee && frame <= b3xe) {
      const activeRange = Math.max(0.001, b3xs - b3ee);
      const trackProgress = Math.min(
        1,
        Math.max(0, (frame - b3ee) / activeRange),
      );
      const trackElem = beat3SlideTrackRef.current;
      const totalSlides = 3;
      const slideH = beat3Slide1Ref.current?.clientHeight ?? 380;
      const containerH =
        trackElem?.parentElement?.clientHeight ?? 380;
      const maxScrollOffset = trackElem
        ? Math.max(0, trackElem.scrollHeight - containerH)
        : Math.max(0, totalSlides * slideH - containerH);
      const pxOffset = trackProgress * maxScrollOffset;
      if (trackElem) {
        trackElem.style.transform = `translateY(-${pxOffset}px)`;
      }
      const dominant = trackProgress < 0.35 ? 0 : trackProgress < 0.7 ? 1 : 2;
      const isVideoActive = dominant === 2;
      if (beat3VideoActiveRef.current !== isVideoActive) {
        beat3VideoActiveRef.current = isVideoActive;
        if (beat3OverlayRef.current) {
          beat3OverlayRef.current.classList.toggle("video-active", isVideoActive);
        }
        if (isVideoActive && (import.meta.env.DEV || import.meta.env.VITE_APP_MODE === "dev")) {
          const v = beat3VideoRef.current;
          let buf = 0;
          try {
            if (v?.buffered?.length > 0) buf = v.buffered.end(0);
          } catch (_err) {
            void _err;
          }
          console.log(`[video-perf] Beat 3 video dominant | readyState: ${v?.readyState} | buffered: ${buf.toFixed(2)}s / ${(v?.duration || 0).toFixed(2)}s`);
        }
      }
      if (beat3VideoRef.current && beat3ResolvedVideoSrc && !beat3VideoRef.current.src) {
        beat3VideoRef.current.src = beat3ResolvedVideoSrc;
      }
    } else {
      if (beat3VideoActiveRef.current) {
        beat3VideoActiveRef.current = false;
        if (beat3OverlayRef.current) {
          beat3OverlayRef.current.classList.remove("video-active");
        }
      }
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

    const isSmallScreen =
      typeof window !== "undefined" &&
      window.innerWidth <= 1024 &&
      window.innerHeight > window.innerWidth;
    const baseBeat4WNum = isSmallScreen ? 88 : 60;
    const baseBeat4HNum = isSmallScreen ? 44 : 35;
    const baseBeat4WStr = `${baseBeat4WNum}vw`;
    const baseBeat4HStr = `${baseBeat4HNum}vh`;

    if (frame < b4es) {
      beat4Width = baseBeat4WStr;
      beat4Height = baseBeat4HStr;
      beat4YOffset = 100;
      beat4Opacity = 0;
      beat4BorderRadius = "24px";
    } else if (frame >= b4es && frame < b4midEntry) {
      // Bottom to Center (keeps small card size)
      const t = (frame - b4es) / Math.max(0.001, b4midEntry - b4es);
      const easeT = t * t * (3 - 2 * t);
      beat4Width = baseBeat4WStr;
      beat4Height = baseBeat4HStr;
      beat4YOffset = 100 * (1 - easeT);
      beat4BorderRadius = "24px";
      beat4Opacity = 1;
    } else if (frame >= b4midEntry && frame < b4ee) {
      // Center to Fullscreen (expands from small card size to fullscreen)
      const t = (frame - b4midEntry) / Math.max(0.001, b4ee - b4midEntry);
      const easeT = t * t * (3 - 2 * t);
      beat4Width = `${baseBeat4WNum + (100 - baseBeat4WNum) * easeT}vw`;
      beat4Height = `${baseBeat4HNum + (100 - baseBeat4HNum) * easeT}vh`;
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
      beat4Width = `${100 - (100 - baseBeat4WNum) * easeT}vw`;
      beat4Height = `${100 - (100 - baseBeat4HNum) * easeT}vh`;
      beat4YOffset = 0;
      beat4BorderRadius = `${24 * easeT}px`;
      beat4Opacity = 1;
    } else if (frame >= b4midExit && frame <= b4xe) {
      // Center to Top (keeps small card size while moving off screen)
      const t = (frame - b4midExit) / Math.max(0.001, b4xe - b4midExit);
      const easeT = t * t * (3 - 2 * t);
      beat4Width = baseBeat4WStr;
      beat4Height = baseBeat4HStr;
      beat4YOffset = -100 * easeT;
      beat4BorderRadius = "24px";
      beat4Opacity = 1;
    } else {
      beat4Width = baseBeat4WStr;
      beat4Height = baseBeat4HStr;
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
      beat4OverlayRef.current.style.display = beat4Opacity > 0 ? "block" : "none";
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

  // Unified scroll progress handler for card overlays, section dots, explore link, and footer
  const handleScrollProgress = useCallback(
    (progress) => {
      const frame = progress * TOTAL_FRAMES;
      lastFrameRef.current = frame;

      // Sync vertical dot navigation active index with scroll progress (5 sections)
      const newSectionIndex =
        frame < 25
          ? 0
          : frame < 68
            ? 1
            : frame < 114
              ? 2
              : frame < 185
                ? 3
                : 4;

      if (newSectionIndex !== activeSectionRef.current) {
        activeSectionRef.current = newSectionIndex;
        setActiveSectionIndex(newSectionIndex);
      }

      applyCardOverlayFrame(frame, cardTimingConfig);

      // "Explore 3D Viewer" link
      if (exploreLinkRef.current) {
        const showExploreLink =
          frame >= EXPLORE_LINK_GLOBAL_FRAME &&
          frame < FOOTER_REVEAL_GLOBAL_START_FRAME;
        exploreLinkRef.current.classList.toggle("is-visible", showExploreLink);
        exploreLinkRef.current.style.display = showExploreLink ? "flex" : "none";
        exploreLinkRef.current.style.pointerEvents = showExploreLink ? "auto" : "none";
      }

      // Footer reveal
      if (footerRevealRef.current) {
        const footerT = Math.min(
          1,
          Math.max(
            0,
            (frame - FOOTER_REVEAL_GLOBAL_START_FRAME) /
              (FOOTER_REVEAL_GLOBAL_END_FRAME - FOOTER_REVEAL_GLOBAL_START_FRAME),
          ),
        );
        footerRevealRef.current.style.transform = `translateY(${(1 - footerT) * 100}%)`;
        footerRevealRef.current.style.pointerEvents =
          footerT > 0.5 ? "auto" : "none";

        if (navRef.current && navRef.current.style.transform) {
          navRef.current.style.transform = "";
        }
      }
    },
    [cardTimingConfig],
  );

  // Fallback ScrollTrigger when 3D Ring is turned off via ?perf=noring
  // Ensures cards, overlays, videos, dots, and footer scrub smoothly with scroll
  useEffect(() => {
    if (!perfFlags.noring) return;

    ScrollTrigger.refresh();

    const trigger = ScrollTrigger.create({
      trigger: "#scroll-content",
      start: "top top",
      end: "bottom bottom",
      scrub: 1.2,
      onUpdate: (self) => {
        handleScrollProgress(self.progress);
        if (vantaBeatRef.current) {
          const beatPos = self.progress * 4;
          const fromIndex = Math.floor(beatPos);
          const weight = beatPos - fromIndex;
          vantaBeatRef.current.setBlend({
            fromIndex: Math.min(fromIndex, 4),
            toIndex: Math.min(fromIndex + 1, 4),
            weight,
          });
        }
      },
    });

    return () => {
      trigger.kill();
    };
  }, [perfFlags.noring, handleScrollProgress]);

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
      return `calc(${contentLeftStyle} - 8px - ${titleWidthClamp} - ${gapClamp})`;
    }
    const contentWidthClamp = pxToClampVw(contentWidthPx, 320);
    return `calc(${contentLeftStyle} + ${contentWidthClamp} + 8px + ${gapClamp})`;
  }

  const getContentCardStyle = () => {
    const { contentLeft, contentTop, contentWidth } = layoutConfig;
    return {
      position: "absolute",
      left: `calc(${contentLeft}% - 8px)`,
      top: `calc(${contentTop}% - 8px)`,
      width: `calc(${pxToClampVw(contentWidth, 320)} + 16px)`,
      bottom: "12px", // 8px lower to compensate for 12px padding
    };
  };

  const getBeat3ContentCardStyle = () => {
    const { contentLeft, contentTop, contentWidth } = layoutConfig;
    return {
      position: "absolute",
      right: `calc(${contentLeft}% - 8px)`,
      left: "auto",
      top: `calc(${contentTop}% - 8px)`,
      width: `calc(${pxToClampVw(contentWidth, 320)} + 16px)`,
      bottom: "12px", // Matches Beat 2's exact full height and sizing
    };
  };

  return (
    <div className="hero2-page">
      <h1 className="sr-only">Cinegem Studio — jewellery 3D rendering and cinematic CGI</h1>
      <p className="sr-only">Cinegem Studio creates photorealistic jewellery renders, cinematic CGI animation and on-body visualization for luxury jewellery brands.</p>

      {/* Cinematic Luxury Loading Screen — completes only when 3D ring & assets are loaded */}
      <LoadingScreen
        isLoading={isLoading}
        progress={loadProgress}
        statusText={loadStatus}
      />

      {/* Per-beat background — Vanta FOG, one preset per beat
          (beatFogPresets.js). Crossfades using the exact blend weight
          RingHero reports via onBeatBlendUpdate below, so it never
          drifts from the ring's own scroll position. (The old particle/
          shader BeatBackground layer has been removed — this is now the
          only background layer.) */}
      <PerfDevHud />
      {shouldStart3D && !perfFlags.nofog && (
        <VantaBeatFogBackground
          ref={vantaBeatRef}
          beatOptions={beatFogOptions}
          zIndex={1}
        />
      )}

      {/* Dev-only tuning panel for the per-beat Vanta FOG colors/blur/
          zoom/speed above. Toggle with the small button; "Save as
          default" persists the whole 5-beat array to localStorage. Strip
          this block for production if you don't want it shippable. */}

      {SHOW_DEV_PANEL && showFogPanel && (
        <VantaFogControlPanel
          beatIndex={fogPanelBeat}
          onBeatIndexChange={setFogPanelBeat}
          beatCount={beatFogOptions.length}
          options={beatFogOptions[fogPanelBeat]}
          onChange={(next) =>
            setBeatFogOptions((all) => {
              const current = all[fogPanelBeat] || {};
              const blurChanged = next.blurFactor !== current.blurFactor;
              const zoomChanged = next.zoom !== current.zoom;
              const speedChanged = next.speed !== current.speed;

              if (blurChanged || zoomChanged || speedChanged) {
                // Apply the 3 sliders (blurFactor, zoom, speed) across ALL beats
                return all.map((o, i) => ({
                  ...(i === fogPanelBeat ? next : o),
                  blurFactor: next.blurFactor,
                  zoom: next.zoom,
                  speed: next.speed,
                }));
              }
              // Color changes apply only to the selected beat
              return all.map((o, i) => (i === fogPanelBeat ? next : o));
            })
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
        <div ref={beat2OverlayRef} className="glassy-beat-layout beat-2-layout">
          <ContentGlassyCard
            className="beat-content-left"
            style={
              typeof window !== "undefined" &&
              window.innerWidth <= 1024 &&
              window.innerHeight > window.innerWidth
                ? undefined
                : getContentCardStyle()
            }
          >
            <div className="glassy-slide-container">
              <div ref={beat2SlideTrackRef} className="glassy-slide-track">
                {/* Slide 1: First 2 images */}
                <div ref={beat2Slide1Ref} className="glassy-slide">
                  <div className="glassy-grid-2">
                    <div className="glassy-grid-item">
                      <MediaImage
                        item={beat2Images[0]}
                        priority={true}
                        sizes="(max-width: 768px) 50vw, 25vw"
                        alt={beat2Images[0]?.alt || "Solitaire Marquise Ring - Angle 1"}
                      />
                    </div>
                    <div className="glassy-grid-item">
                      <MediaImage
                        item={beat2Images[1]}
                        sizes="(max-width: 768px) 50vw, 25vw"
                        alt={beat2Images[1]?.alt || "Solitaire Marquise Ring - Angle 2"}
                      />
                    </div>
                  </div>
                </div>

                {/* Slide 2: Next 2 images */}
                <div ref={beat2Slide2Ref} className="glassy-slide">
                  <div className="glassy-grid-2">
                    <div className="glassy-grid-item">
                      <MediaImage
                        item={beat2Images[2]}
                        sizes="(max-width: 768px) 50vw, 25vw"
                        alt={beat2Images[2]?.alt || "Solitaire Marquise Ring - Angle 3"}
                      />
                    </div>
                    <div className="glassy-grid-item">
                      <MediaImage
                        item={beat2Images[3]}
                        sizes="(max-width: 768px) 50vw, 25vw"
                        alt={beat2Images[3]?.alt || "Solitaire Marquise Ring - Angle 4"}
                      />
                    </div>
                  </div>
                </div>

                {/* Slide 3: Video */}
                <div ref={beat2Slide3Ref} className="glassy-slide">
                  <div className="glassy-video-container">
                    <video
                      ref={beat2VideoRef}
                      data-src={beat2ResolvedVideoSrc}
                      poster={beat2Video?.poster || beat2Video?.thumb}
                      preload="none"
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
            style={
              typeof window !== "undefined" &&
              window.innerWidth <= 1024 &&
              window.innerHeight > window.innerWidth
                ? undefined
                : {
                    left: getTitleLeftCalc(
                      `${layoutConfig.contentLeft}%`,
                      layoutConfig.contentWidth,
                      layoutConfig.titleWidth,
                      "right",
                    ),
                    top: `${layoutConfig.titleTop}%`,
                    width: pxToClampVw(layoutConfig.titleWidth, 200),
                  }
            }
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
        <div ref={beat3OverlayRef} className="glassy-beat-layout beat-3-layout">
          <ContentGlassyCard
            className="beat-content-left"
            style={
              typeof window !== "undefined" &&
              window.innerWidth <= 1024 &&
              window.innerHeight > window.innerWidth
                ? undefined
                : getBeat3ContentCardStyle()
            }
          >
            <div className="glassy-slide-container">
              <div ref={beat3SlideTrackRef} className="creative-editorial-track">
                {/* 1. Top Wide Banner (Macro Detail) */}
                <div className="creative-grid-item creative-item-top">
                  <MediaImage
                    item={beat3Images[0]}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    alt={beat3Images[0]?.alt || "Creative Visuals Macro Detail"}
                  />
                </div>

                {/* 2. Middle Left Tall Portrait (spans both middle rows, fully uncut) */}
                <div className="creative-grid-item creative-item-mid-left">
                  <MediaImage
                    item={beat3Images[1]}
                    sizes="(max-width: 768px) 50vw, 25vw"
                    alt={beat3Images[1]?.alt || "Creative Visuals Side Profile"}
                  />
                </div>

                {/* 3. Middle Right Top */}
                <div className="creative-grid-item creative-item-mid-right-top">
                  <MediaImage
                    item={beat3Images[2]}
                    sizes="(max-width: 768px) 50vw, 25vw"
                    alt={beat3Images[2]?.alt || "Creative Visuals Angled View"}
                  />
                </div>

                {/* 4. Middle Right Bottom */}
                <div className="creative-grid-item creative-item-mid-right-bottom">
                  <MediaImage
                    item={beat3Images[3]}
                    sizes="(max-width: 768px) 50vw, 25vw"
                    alt={beat3Images[3]?.alt || "Creative Visuals Top View"}
                  />
                </div>

                {/* 5. Bottom Wide Banner (Video) */}
                <div className="creative-grid-item creative-item-bottom">
                  {beat3ResolvedVideoSrc ? (
                    <video
                      ref={beat3VideoRef}
                      data-src={beat3ResolvedVideoSrc}
                      poster={beat3Video.poster || beat3Video.thumb}
                      preload="metadata"
                      loop
                      muted
                      playsInline
                    />
                  ) : (
                    <MediaImage
                      item={beat3Images[4] || beat3Images[0]}
                      sizes="(max-width: 768px) 100vw, 50vw"
                      alt={beat3Images[4]?.alt || "Creative Visuals Feature"}
                    />
                  )}
                </div>
              </div>
            </div>
          </ContentGlassyCard>
          <TitleGlassyCard
            className="beat-title-right"
            style={
              typeof window !== "undefined" &&
              window.innerWidth <= 1024 &&
              window.innerHeight > window.innerWidth
                ? undefined
                : {
                    left: `calc(100% - (${layoutConfig.contentLeft}% + ${pxToClampVw(layoutConfig.contentWidth, 320)} + 8px + max(40px, 2vw) + ${pxToClampVw(layoutConfig.titleWidth, 200)}))`,
                    top: `${beat3LayoutConfig.titleTop}%`,
                    width: pxToClampVw(layoutConfig.titleWidth, 200),
                  }
            }
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
          <MediaImage
            item={beat4Image}
            sizes="100vw"
            alt={beat4Image?.alt || "On-Body Visualization Showcase"}
            className="beat4-media transition-opacity duration-700"
          />
          <div className="absolute inset-0 bg-transparent flex flex-col justify-end p-8 md:p-12 text-[#FCFBFA] z-10 pointer-events-auto">
            <h2 className="font-[Poppins] font-semibold text-2xl sm:text-4xl md:text-5xl text-[#FCFBFA] mb-2 leading-tight [text-shadow:0_2px_10px_rgba(0,0,0,0.8)]">
              On-Body Visuals
            </h2>
            <p className="font-[Poppins] font-light text-xs sm:text-sm md:text-base text-[#FCFBFA]/90 max-w-xl mb-5 leading-relaxed [text-shadow:0_1px_6px_rgba(0,0,0,0.8)]">
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
      {shouldStart3D && !perfFlags.noring && (
        <RingHero
          glbUrl="/models/ring-draco.glb"
        metalHdrUrl={metalHdrUrl}
        gemBaseHdrUrl={gemBaseHdrUrl}
        gemSpotHdrUrl={gemSpotHdrUrl}
        onLoadingProgress={(p, status) => {
          setLoadProgress(p);
          if (status) setLoadStatus(status);
        }}
        onLoaded={() => {
          setLoadProgress(100);
          setLoadStatus("Experience ready");
          setIsLoading(false);
        }}
        metalPreset={metalPresets[metalPresetKey]}
        gemMaterialTypeOverride={gemMode}
        dracoDecoderPath="/draco/"
        scrollContainerSelector="#scroll-content"
        onMeshesClassified={setMeshDebugList}
        activeTimelineMode={timelineTarget}
        metalHdrRotation={metalHdrConfig.rotation}
        metalHdrRotationY={metalHdrConfig.rotationY}
        metalHdrScale={metalHdrConfig.scale}
        metalHdrPower={metalHdrConfig.power}
        metalHdrGamma={metalHdrConfig.gamma}
        gemBaseEnv={gemBaseEnv}
        gemSpotEnv={gemSpotEnv}
        gemEnvView={gemEnvView}
        gemGammaMode={gemGammaMode}
        dispersionStrength={dispersionStrength}
        bloomConfig={bloomConfig}
        bloomIntensity={bloomConfig.intensity}
        bloomThreshold={bloomConfig.threshold}
        postFxConfig={postFxConfig}
        onBaseMetaUpdate={setBaseFileMeta}
        onSpotMetaUpdate={setSpotFileMeta}
        onRegisterEnvPreview={(fn) => {
          renderEnvPreviewRef.current = fn;
          updatePreviews();
        }}
        onRefreshPreviews={updatePreviews}
        baseFileNameHint={baseFileNameHint}
        spotFileNameHint={spotFileNameHint}
        postFxEnabled={postFxEnabled}
        experimentalAtmosphere={experimentalAtmosphere}
        autoRotateStartFrame={AUTO_ROTATE_GLOBAL_FRAME}
        autoRotateEndFrame={AUTO_ROTATE_GLOBAL_END_FRAME}
        autoRotateSpeed={0.35}
        interactiveRotateStartFrame={AUTO_ROTATE_GLOBAL_FRAME}
        interactiveRotateEndFrame={AUTO_ROTATE_GLOBAL_END_FRAME}
        onPoseOverrideReady={(api) => {
          poseApiRef.current = api;
          refreshSavedBeats(timelineTarget);
        }}
        onKeyframesUpdate={(framesSet) => {
          setSavedBeats(framesSet);
        }}
        onBeatBlendUpdate={(blend) => {
          vantaBeatRef.current?.setBlend(blend);
        }}
        onScrollDebugUpdate={(info) => {
          if (timelineRef.current) {
            const currentPose = poseApiRef.current?.getCurrentPose?.();
            timelineRef.current.update(info, currentPose);
          }

          handleScrollProgress(info.progress);

          // Debounce React state update so sliders sync to scrolled values when scrolling stops
          clearTimeout(scrollDebounceRef.current);
          scrollDebounceRef.current = setTimeout(() => {
            if (poseApiRef.current) {
              const currentFrame = Math.round(info.progress * TOTAL_FRAMES);

              setCoordValues((prev) => {
                if (prev.live) return prev;
                if (prev.activeFrame === currentFrame) return prev;
                const snap = poseApiRef.current?.getKeyframeSnapshot?.(timelineTarget) ?? {};
                const kf = snap[currentFrame];
                const base = poseApiRef.current?.getBaseValuesForFrame?.(
                  currentFrame,
                  timelineTarget,
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
      )}

      {/* "Explore 3D Viewer" Glassy Card — visible during Beat 5 */}
      <div
        ref={exploreLinkRef}
        className="hero2-explore-link"
        style={{ display: "none", pointerEvents: "none" }}
      >
        <Link
          to="/3d-viewer"
          className="glassy-card p-6 md:p-8 border border-white/20 bg-black/60 backdrop-blur-2xl rounded-xl shadow-2xl flex flex-col gap-3 w-full max-w-md mx-auto text-decoration-none text-left block hover:border-[#C5A059]/60 transition-colors"
        >
          <span className="text-[#C5A059] font-label text-[10px] tracking-[0.25em] uppercase font-semibold block">
            04 — 3D INTERACTIVE ENGINE
          </span>
          <h2 className="font-[Poppins] font-semibold text-2xl md:text-3xl text-[#FCFBFA] tracking-tight leading-tight m-0">
            Interactive 3D Viewer
          </h2>
          <p className="font-[Poppins] font-light text-xs md:text-sm text-[#FCFBFA]/85 leading-relaxed m-0 whitespace-normal">
            Real-time interactive 3D configurator with dynamic precious metal switching, diamond refraction, and 360° inspection controls. Launching soon.
          </p>
          <div className="btn-primary inline-flex items-center gap-2 py-2.5 px-5 text-[11px] font-semibold tracking-widest uppercase rounded-md text-[#FCFBFA] w-fit mt-1">
            EXPLORE →
          </div>
        </Link>
      </div>

      {/* Footer reveal panel */}
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
                High jewellery rendering, photorealistic 3D visualization, and
                cinematic animation for the world's finest maisons.
              </p>
              <Link to="/inquire" className="hero2-cta-btn">
                Inquire →
              </Link>
            </div>

            <div className="hero2-footer-links-grid">
              <div className="hero2-footer-col">
                <span className="hero2-footer-col-title">Services</span>
                <Link to="/classic">Classic E-Commerce</Link>
                <Link to="/creative-visuals">Creative Visuals</Link>
                <Link to="/onbody">On-Body Visualization</Link>
                <Link to="/3d-viewer">Interactive 3D Engine</Link>
              </div>

              <div className="hero2-footer-col">
                <span className="hero2-footer-col-title">Connect</span>
                <Link to="/inquire">Inquiries</Link>
                <Link to="/faq">FAQ</Link>
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
                <a href="mailto:info@cinegemstudio.com">Email</a>
              </div>
            </div>
          </div>

          <div className="hero2-footer-bottom">
            <p className="hero2-footer-copyright">
              © {new Date().getFullYear()} Cinegem Studio. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {!isLoading && SHOW_DEV_PANEL && timelineVisible && (
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
          timelineTarget={timelineTarget}
          onToggleTimelineTarget={(target) => {
            setTimelineTarget(target);
            if (poseApiRef.current) {
              const snap = poseApiRef.current.getKeyframeSnapshot?.(target) ?? {};
              setSavedBeats(new Set(Object.keys(snap).map(Number)));
            }
          }}
          onJumpToProgress={(progress, smooth) =>
            poseApiRef.current?.jumpToProgress(progress, smooth)
          }
          onReboot={() => {
            if (poseApiRef.current) {
              poseApiRef.current.reloadRingModel(null, timelineTarget);
            }
          }}
          onMoveKeyframe={moveCoordKeyframe}
          experimentalAtmosphere={experimentalAtmosphere}
          onToggleAtmosphere={() => setExperimentalAtmosphere((v) => !v)}
        />
      )}

      {!isLoading && SHOW_DEV_PANEL && (
        <>
          <div className="hero2-dev-cluster">
            <button
              onClick={() => setPanelVisible((v) => !v)}
              className="hero2-dev-btn hero2-dev-btn-panel"
            >
              {panelVisible ? "Hide dev panel" : "Show dev panel"}
            </button>

            <button
              onClick={() => setTimelineVisible((v) => !v)}
              className="hero2-dev-btn hero2-dev-btn-timeline"
            >
              {timelineVisible ? "Hide timeline" : "Show timeline"}
            </button>

            <button
              onClick={() => setShowFogPanel((v) => !v)}
              className="hero2-dev-btn hero2-dev-btn-fog"
            >
              Fog Panel: {showFogPanel ? "On" : "Off"}
            </button>

          </div>

          {panelVisible && (
            <MaterialDevPanel
              metalPresetKey={metalPresetKey}
              setMetalPresetKey={setMetalPresetKey}
              metalHdrUrl={metalHdrUrl}
              setMetalHdrUrl={setMetalHdrUrl}
              gemBaseHdrUrl={gemBaseHdrUrl}
              setGemBaseHdrUrl={setGemBaseHdrUrl}
              gemSpotHdrUrl={gemSpotHdrUrl}
              setGemSpotHdrUrl={setGemSpotHdrUrl}
              gemMode={gemMode}
              setGemMode={setGemMode}
              meshDebugList={meshDebugList}
              metalHdrConfig={metalHdrConfig}
              setMetalHdrConfig={setMetalHdrConfig}
              gemBaseEnv={gemBaseEnv}
              setGemBaseEnv={setGemBaseEnv}
              gemSpotEnv={gemSpotEnv}
              setGemSpotEnv={setGemSpotEnv}
              gemEnvView={gemEnvView}
              setGemEnvView={setGemEnvView}
              gemGammaMode={gemGammaMode}
              setGemGammaMode={setGemGammaMode}
              dispersionStrength={dispersionStrength}
              setDispersionStrength={setDispersionStrength}
              baseFileMeta={baseFileMeta}
              spotFileMeta={spotFileMeta}
              previewConfig={previewConfig}
              setPreviewConfig={setPreviewConfig}
              bloomConfig={bloomConfig}
              setBloomConfig={setBloomConfig}
              postFxConfig={postFxConfig}
              setPostFxConfig={setPostFxConfig}
              postFxEnabled={postFxEnabled}
              setPostFxEnabled={setPostFxEnabled}
              baseFileNameHint={baseFileNameHint}
              setBaseFileNameHint={setBaseFileNameHint}
              spotFileNameHint={spotFileNameHint}
              setSpotFileNameHint={setSpotFileNameHint}
              envCanvasRef={envCanvasRef}
              baseCanvasRef={baseCanvasRef}
              spotCanvasRef={spotCanvasRef}
              onRefreshPreviews={updatePreviews}
              experimentalAtmosphere={experimentalAtmosphere}
              setExperimentalAtmosphere={setExperimentalAtmosphere}
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
              onResetHdrDefaults={() => {
                setMetalPresetKey("yellowGold");
                setMetalHdrUrl("/hdr/env_metal_001_d01c4504e0.hdr");
                setMetalHdrConfig(DEFAULT_METAL_HDR_CONFIG);
                setGemBaseHdrUrl("/hdr/Diamond-Base-HDRI.exr");
                setGemSpotHdrUrl("/hdr/Diamond-Spotlight-HDRI.exr");
                setGemMode(null);
                setGemBaseEnv(DEFAULT_GEM_BASE_ENV);
                setGemSpotEnv(DEFAULT_GEM_SPOT_ENV);
                setGemEnvView(0);
                setGemGammaMode(0);
                setDispersionStrength(DEFAULT_DISPERSION);
                setBloomConfig(DEFAULT_BLOOM_CONFIG);
                setPreviewConfig(DEFAULT_PREVIEW_CONFIG);
                setPostFxConfig(DEFAULT_POSTFX_CONFIG);
                setPostFxEnabled(true);
                setExperimentalAtmosphere(true);
              }}
            />
          )}
        </>
      )}

      {/* Dedicated minimal header for Hero2: transparent background with centered Logo image, stuck flush to top edge */}
      <header
        ref={navRef}
        className={`fixed top-0 left-0 right-0 z-50 flex justify-center items-start pt-0 px-6 bg-transparent pointer-events-none transition-all duration-700 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
      >
        <Link
          to="/"
          onClick={handleLogoClick}
          className="pointer-events-auto inline-block transition-opacity duration-300 hover:opacity-80 focus:outline-none cursor-pointer"
          aria-label="Cinegem Studio — return to top"
        >
          <img
            src="/Logo.png"
            alt="Cinegem Studio Logo"
            className="h-28 sm:h-28 md:h-44 lg:h-52 w-auto object-contain filter drop-shadow block -mt-2 sm:-mt-4 md:-mt-14 lg:-mt-17"
          />
        </Link>
      </header>

      {/* Luxury Vertical Line Dot Navigation */}
      <VerticalDotNav
        sections={DEFAULT_HOME_SECTIONS}
        activeIndex={activeSectionIndex}
        onDotClick={handleDotClick}
        visible={!isLoading}
      />

      {/* Tall scrollable content — its height drives the ScrollTrigger
          timeline inside RingHero. Must match id used in
          scrollContainerSelector prop above. */}
      {/* One <section> per BEATS[i] entry in RingHero.jsx — keep both in
          sync. 6 beats: idle -> corner park -> pose -> pose -> center
          (ring back to Beat 1 pose) -> standing spin. */}
      <div id="scroll-content" className="hero2-scroll-content">
        {/* Beat 1 — idle ring */}
        <section id="home" className="hero2-section">
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
  gemBaseHdrUrl,
  setGemBaseHdrUrl,
  gemSpotHdrUrl,
  setGemSpotHdrUrl,
  gemMode,
  setGemMode,
  meshDebugList = [],
  metalHdrConfig,
  setMetalHdrConfig,
  gemBaseEnv,
  setGemBaseEnv,
  gemSpotEnv,
  setGemSpotEnv,
  gemEnvView,
  setGemEnvView,
  gemGammaMode,
  setGemGammaMode,
  dispersionStrength,
  setDispersionStrength,
  baseFileMeta,
  spotFileMeta,
  previewConfig,
  setPreviewConfig,
  bloomConfig,
  setBloomConfig,
  postFxConfig,
  setPostFxConfig,
  postFxEnabled,
  setPostFxEnabled,
  baseFileNameHint,
  setBaseFileNameHint,
  spotFileNameHint,
  setSpotFileNameHint,
  envCanvasRef,
  baseCanvasRef,
  spotCanvasRef,
  onRefreshPreviews,
  experimentalAtmosphere,
  setExperimentalAtmosphere,
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
  onResetHdrDefaults,
}) {
  const gemCount = meshDebugList.filter((m) => m.type === "gem").length;
  const metalCount = meshDebugList.filter((m) => m.type === "metal").length;

  const metalFileInputRef = useRef(null);

  const handleMetalFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isExr = file.name.toLowerCase().endsWith(".exr");
    const blobUrl = URL.createObjectURL(file) + (isExr ? "#file.exr" : "#file.hdr");
    setMetalHdrUrl(blobUrl);
  };

  return (
    <div
      data-lenis-prevent
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 50,
        background: "rgba(18,18,22,0.94)",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: 12,
        padding: "16px 18px",
        color: "#fff",
        fontSize: 12,
        fontFamily: "monospace",
        width: 320,
        maxHeight: "88vh",
        overflowY: "auto",
        backdropFilter: "blur(10px)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.04em", color: "#ffd280" }}>
          CINEGEM DEV STUDIO
        </span>
        <span style={{ fontSize: 10, opacity: 0.5 }}>Octane Lighting</span>
      </div>

      {/* Per-mesh classification */}
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

      {/* Metal Environment Section */}
      <div
        style={{
          marginBottom: 12,
          padding: "10px 12px",
          background: "rgba(255, 216, 142, 0.05)",
          border: "1px solid rgba(255, 216, 142, 0.2)",
          borderRadius: 8,
        }}
      >
        <div style={{ fontWeight: 700, color: "#ffd88e", marginBottom: 8, fontSize: 11 }}>
          👑 METAL ENVIRONMENT
        </div>

        <label style={{ display: "block", marginBottom: 8 }}>
          Preset
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

        <label style={{ display: "block", marginBottom: 8 }}>
          Metal HDR URL
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <input
              type="text"
              value={metalHdrUrl}
              onChange={(e) => setMetalHdrUrl(e.target.value)}
              style={{ ...inputStyle, marginTop: 0, flex: 1 }}
            />
            <button
              type="button"
              onClick={() => metalFileInputRef.current?.click()}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                borderRadius: 6,
                padding: "6px 8px",
                fontSize: 10,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              📁 Browse
            </button>
            <input
              ref={metalFileInputRef}
              type="file"
              accept=".hdr,.exr"
              onChange={handleMetalFileUpload}
              style={{ display: "none" }}
            />
          </div>
        </label>

        <HdrConfigGroup
          label="Metal HDR controls"
          config={metalHdrConfig}
          setConfig={setMetalHdrConfig}
        />
      </div>

      {/* Octane Diamond Dual-EXR Section */}
      <div
        style={{
          marginBottom: 12,
          padding: "10px 12px",
          background: "rgba(77, 163, 255, 0.06)",
          border: "1px solid rgba(77, 163, 255, 0.25)",
          borderRadius: 8,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontWeight: 700, color: "#8ecbff", fontSize: 11 }}>
            💎 OCTANE DIAMOND (2 EXR ADDITIVE)
          </span>
          <span style={{ fontSize: 9, background: "rgba(77, 163, 255, 0.2)", padding: "2px 5px", borderRadius: 4, color: "#a5d8ff" }}>
            Add Texture
          </span>
        </div>

        <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 8, lineHeight: 1.3 }}>
          Base EXR provides body facet shape. Spotlight EXR injects intense concentrated pinpoints for optical sparkle. Result = colorKey(Base) + Spot.
        </div>

        <label style={{ display: "block", marginBottom: 8 }}>
          Gem Material Mode
          <select
            value={gemMode ?? "default"}
            onChange={(e) =>
              setGemMode(e.target.value === "default" ? null : e.target.value)
            }
            style={selectStyle}
          >
            <option value="default">Full Octane Refraction + Dispersion</option>
            <option value="matte">Matte (flat preview)</option>
          </select>
        </label>

        {/* Global Controls: View Mode & Gamma Mode */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <label style={{ fontSize: 10 }}>
            Debug View
            <select
              value={gemEnvView}
              onChange={(e) => setGemEnvView(Number(e.target.value))}
              style={{ ...selectStyle, marginTop: 3 }}
            >
              <option value={0}>✨ Base + Spot (Full)</option>
              <option value={1}>🏛️ Base only</option>
              <option value={2}>💡 Spot only (Sparkle)</option>
            </select>
          </label>

          <label style={{ fontSize: 10 }}>
            Gamma Mode (A/B)
            <select
              value={gemGammaMode}
              onChange={(e) => setGemGammaMode(Number(e.target.value))}
              style={{ ...selectStyle, marginTop: 3 }}
            >
              <option value={0}>Octane: pow(x, γ)</option>
              <option value={1}>Legacy: pow(x, 1/γ)</option>
            </select>
          </label>
        </div>

        {/* Task A2: Dispersion (Fire) Slider */}
        <SliderRow
          label="Dispersion (Fire)"
          value={dispersionStrength}
          min={0}
          max={0.03}
          step={0.001}
          onChange={(e) => setDispersionStrength(Number(e.target.value))}
        />
        <div style={{ fontSize: 9, opacity: 0.65, marginBottom: 8, color: "#8ecbff" }}>
          * 0 = Achromatic diamond (no rainbow). 0.006 = Smooth 7-tap spectral fire.
        </div>

        {/* Reference & Reset Preset Buttons */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <button
            type="button"
            onClick={() => {
              setGemBaseEnv(OCTANE_ER11_BASE_ENV);
              setGemSpotEnv(OCTANE_ER11_SPOT_ENV);
              setDispersionStrength(DEFAULT_DISPERSION);
              setBloomConfig(DEFAULT_BLOOM_CONFIG);
            }}
            style={{
              flex: 1,
              background: "rgba(77, 163, 255, 0.15)",
              border: "1px solid rgba(77, 163, 255, 0.4)",
              color: "#8ecbff",
              borderRadius: 6,
              padding: "6px 8px",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Applies Octane ER_11 reference settings from node editor"
          >
            🎯 Octane ER_11 Reference
          </button>
          <button
            type="button"
            onClick={() => {
              setGemBaseEnv(DEFAULT_GEM_BASE_ENV);
              setGemSpotEnv(DEFAULT_GEM_SPOT_ENV);
              setDispersionStrength(DEFAULT_DISPERSION);
              setBloomConfig(DEFAULT_BLOOM_CONFIG);
            }}
            style={{
              flex: 1,
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#ddd",
              borderRadius: 6,
              padding: "6px 8px",
              fontSize: 10,
              cursor: "pointer",
            }}
            title="Reset to identity transforms (rot 0, scale 1, trans 0)"
          >
            🔄 Reset (Identity)
          </button>
        </div>

        {/* Task B: Live EXR Previews (Octane-style) */}
        <div
          style={{
            marginTop: 10,
            marginBottom: 10,
            padding: "10px",
            background: "rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(100, 210, 255, 0.25)",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <span style={{ fontWeight: 700, color: "#64d2ff", fontSize: 10.5 }}>
              🖼️ LIVE EXR PREVIEWS (OCTANE-STYLE)
            </span>
            <button
              type="button"
              onClick={onRefreshPreviews}
              style={{
                background: "rgba(100, 210, 255, 0.15)",
                border: "1px solid rgba(100, 210, 255, 0.35)",
                color: "#8ecbff",
                borderRadius: 4,
                padding: "2px 6px",
                fontSize: 9,
                cursor: "pointer",
              }}
              title="Force re-render of 2:1 offscreen preview canvases"
            >
              ↻ Refresh
            </button>
          </div>

          {/* B2: Preview Controls */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 5,
              marginBottom: 8,
              padding: "6px 8px",
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: 6,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 9.5, opacity: 0.85 }}>
                EV Exposure: {previewConfig.ev > 0 ? `+${previewConfig.ev}` : previewConfig.ev} EV
              </span>
              <input
                type="range"
                min={-4}
                max={8}
                step={0.5}
                value={previewConfig.ev}
                onChange={(e) => setPreviewConfig((p) => ({ ...p, ev: Number(e.target.value) }))}
                style={{ width: 100, height: 4 }}
              />
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 9.5 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={previewConfig.tonemap}
                  onChange={(e) => setPreviewConfig((p) => ({ ...p, tonemap: e.target.checked }))}
                />
                Tone-mapped
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={previewConfig.raw}
                  onChange={(e) => setPreviewConfig((p) => ({ ...p, raw: e.target.checked }))}
                />
                Raw Source
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  cursor: "pointer",
                  color: previewConfig.markThreshold ? "#00ffff" : undefined,
                }}
              >
                <input
                  type="checkbox"
                  checked={previewConfig.markThreshold}
                  onChange={(e) => setPreviewConfig((p) => ({ ...p, markThreshold: e.target.checked }))}
                />
                Cyan &gt; Bloom Thr ({bloomConfig.threshold})
              </label>
            </div>
          </div>

          {/* Environment (Base + Spot Add) Preview Canvas */}
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: "#a5d8ff", marginBottom: 3 }}>
              🌍 Combined Environment (Base + Spot Add)
            </div>
            <canvas
              ref={envCanvasRef}
              width={512}
              height={256}
              style={{
                width: "100%",
                height: "auto",
                aspectRatio: "2/1",
                display: "block",
                borderRadius: 4,
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "#0c1017",
              }}
            />
          </div>
        </div>

        {/* 1. Base EXR Slot */}
        <ExrSlotControls
          title="1. Base EXR (Facet Definition)"
          badgeColor="#8ecbff"
          url={gemBaseHdrUrl}
          setUrl={setGemBaseHdrUrl}
          presets={[
            { label: "💎 Diamond Base EXR", value: "/hdr/Diamond-Base-HDRI.exr" },
            { label: "🌟 Mirrored LUMA HDR", value: "/hdr/LUMA-Unsaid-R_D-DIA-Mirrored-Automation-shapes-Wave-R3.hdr" },
            { label: "🏛️ Studio Metal HDR", value: "/hdr/env_metal_001_d01c4504e0.hdr" },
          ]}
          config={gemBaseEnv}
          setConfig={setGemBaseEnv}
          meta={baseFileMeta}
          allowDisable={false}
          canvasRef={baseCanvasRef}
          setFileNameHint={setBaseFileNameHint}
        />

        {/* 2. Spotlight EXR Slot */}
        <ExrSlotControls
          title="2. Spotlight EXR (Sparkle Pinpoints)"
          subtitle="Octane P4.0 | Gamma 1.8"
          badgeColor="#ffda85"
          url={gemSpotHdrUrl}
          setUrl={setGemSpotHdrUrl}
          presets={[
            { label: "💡 Diamond Spotlight EXR (Pinpoints)", value: "/hdr/Diamond-Spotlight-HDRI.exr" },
            { label: "💎 Diamond Base EXR", value: "/hdr/Diamond-Base-HDRI.exr" },
          ]}
          config={gemSpotEnv}
          setConfig={setGemSpotEnv}
          meta={spotFileMeta}
          allowDisable={true}
          canvasRef={spotCanvasRef}
          setFileNameHint={setSpotFileNameHint}
          isSpotSlot={true}
        />
      </div>

      {/* [EXPERIMENTAL_ATMOSPHERE] Atmospheric Fog, Macro DOF & Weightless Float */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 6,
          marginBottom: 6,
          cursor: "pointer",
          background: experimentalAtmosphere
            ? "rgba(255, 180, 50, 0.15)"
            : "rgba(255, 255, 255, 0.05)",
          padding: "6px 10px",
          borderRadius: 6,
          border: experimentalAtmosphere
            ? "1px solid rgba(255, 180, 50, 0.4)"
            : "1px solid rgba(255, 255, 255, 0.15)",
        }}
      >
        <input
          type="checkbox"
          checked={experimentalAtmosphere}
          onChange={(e) => setExperimentalAtmosphere(e.target.checked)}
        />
        <span
          style={{
            color: experimentalAtmosphere ? "#ffd280" : "#aaa",
            fontWeight: 600,
            fontSize: 11,
          }}
        >
          ✨ Atmosphere (Fog Blend + Float)
        </span>
      </label>

      {onResetHdrDefaults && (
        <button
          onClick={onResetHdrDefaults}
          style={{
            width: "100%",
            background: "rgba(255, 180, 50, 0.15)",
            border: "1px solid rgba(255, 180, 50, 0.35)",
            borderRadius: 6,
            color: "#ffd280",
            padding: "6px 10px",
            fontSize: 10,
            cursor: "pointer",
            fontWeight: 600,
            marginTop: 4,
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
          title="Reset dev panel HDR and materials to studio defaults"
        >
          ↺ Reset to Studio Defaults
        </button>
      )}

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

function ExrSlotControls({
  title,
  subtitle,
  badgeColor = "#8ecbff",
  url,
  setUrl,
  presets = [],
  config,
  setConfig,
  meta,
  allowDisable = false,
  canvasRef,
  setFileNameHint,
  isSpotSlot = false,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (setFileNameHint) setFileNameHint(file.name);
    const isExr = file.name.toLowerCase().endsWith(".exr");
    const blobUrl =
      URL.createObjectURL(file) + (isExr ? "#file.exr" : "#file.hdr");
    setUrl(blobUrl);
  };

  const isPreset = presets.some((p) => p.value === url);

  const update = (key) => (e) => {
    const val = Number(e.target.value);
    setConfig((prev) => {
      const next = { ...prev, [key]: val };
      if (prev.lockScale) {
        if (key === "scaleU") next.scaleV = val;
        if (key === "scaleV") next.scaleU = val;
      }
      return next;
    });
  };

  const updateBool = (key) => (e) => {
    const checked = e.target.checked;
    setConfig((prev) => {
      const next = { ...prev, [key]: checked };
      if (key === "lockScale" && checked) {
        next.scaleV = prev.scaleU;
      }
      return next;
    });
  };

  return (
    <div
      style={{
        marginTop: 8,
        marginBottom: 8,
        padding: "8px 10px",
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <span style={{ fontWeight: 700, color: badgeColor, fontSize: 11 }}>
          {title}
        </span>
        {subtitle && (
          <span style={{ opacity: 0.5, fontSize: 9 }}>{subtitle}</span>
        )}
      </div>

      {/* Task B: 2:1 Equirect Preview Canvas for this slot */}
      {canvasRef && (
        <div style={{ marginBottom: 8 }}>
          <canvas
            ref={canvasRef}
            width={512}
            height={256}
            style={{
              width: "100%",
              height: "auto",
              aspectRatio: "2/1",
              display: "block",
              borderRadius: 4,
              border: "1px solid rgba(255, 255, 255, 0.15)",
              background: "#0c1017",
            }}
          />
        </div>
      )}

      {presets.length > 0 && (
        <label style={{ display: "block", marginBottom: 6 }}>
          Preset
          <select
            value={isPreset ? url : "custom"}
            onChange={(e) => {
              if (e.target.value !== "custom") {
                setUrl(e.target.value);
              }
            }}
            style={selectStyle}
          >
            {presets.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
            {allowDisable && <option value="">🚫 None (Disabled)</option>}
            <option value="custom">Custom URL / Uploaded</option>
          </select>
        </label>
      )}

      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 6,
          alignItems: "center",
        }}
      >
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="EXR or HDR URL..."
          style={{ ...inputStyle, flex: 1, marginTop: 0 }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            borderRadius: 6,
            padding: "6px 8px",
            fontSize: 10,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
          title="Upload local .exr or .hdr file"
        >
          📁 Browse
        </button>
        {allowDisable && url && (
          <button
            type="button"
            onClick={() => setUrl("")}
            style={{
              background: "rgba(255,70,70,0.15)",
              border: "1px solid rgba(255,70,70,0.3)",
              color: "#ff9999",
              borderRadius: 6,
              padding: "6px 8px",
              fontSize: 10,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            title="Disable Spotlight slot"
          >
            Clear
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".exr,.hdr"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>

      {/* Loaded-file metadata readout */}
      {meta?.error ? (
        <div
          style={{
            color: "#ff6b6b",
            fontSize: 9.5,
            marginBottom: 8,
            padding: "4px 6px",
            background: "rgba(255,0,0,0.12)",
            border: "1px solid rgba(255,0,0,0.25)",
            borderRadius: 4,
          }}
        >
          ⚠️ {meta.error}
        </div>
      ) : meta ? (
        <div
          style={{
            fontSize: 9,
            opacity: 0.85,
            marginBottom: 8,
            padding: "4px 6px",
            background: "rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 4,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            fontFamily: "monospace",
          }}
        >
          <span>📁 {meta.name}</span>
          <span>📐 {meta.width}×{meta.height}</span>
          <span>🎨 {meta.channels}</span>
          <span>💾 {meta.approxMB}</span>
        </div>
      ) : url ? (
        <div style={{ fontSize: 9, opacity: 0.5, marginBottom: 8 }}>
          Loading file info...
        </div>
      ) : (
        <div style={{ fontSize: 9, opacity: 0.4, marginBottom: 8 }}>
          🚫 Disabled / No texture
        </div>
      )}

      {/* Mono toggle */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
          cursor: "pointer",
          fontSize: 10,
          color: config.mono ? "#8ecbff" : "#888",
        }}
      >
        <input
          type="checkbox"
          checked={config.mono ?? true}
          onChange={updateBool("mono")}
        />
        <span>Mono (1 channel half-float) — <em>saves ~75% VRAM</em></span>
      </label>

      {/* Task C2: Spot Size (dilation pre-pass) for Spotlight Slot */}
      {isSpotSlot && (
        <SliderRow
          label="Spot Size (px dilation)"
          value={config.size ?? 2}
          min={0}
          max={16}
          step={1}
          onChange={update("size")}
        />
      )}

      {/* Real Octane sliders */}
      <SliderRow
        label="Power"
        value={config.power}
        min={0}
        max={isSpotSlot ? 50.0 : 5.0}
        step={isSpotSlot ? 0.5 : 0.01}
        onChange={update("power")}
      />
      <SliderRow
        label="Gamma"
        value={config.gamma}
        min={0.2}
        max={4.0}
        step={0.01}
        onChange={update("gamma")}
      />
      <SliderRow
        label="Rotation"
        value={config.rot}
        min={-180}
        max={180}
        step={1}
        unit="°"
        onChange={update("rot")}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 6,
          marginBottom: 2,
        }}
      >
        <span style={{ fontSize: 10, opacity: 0.8 }}>Scale (2D Transform)</span>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 9,
            cursor: "pointer",
            opacity: 0.85,
          }}
        >
          <input
            type="checkbox"
            checked={config.lockScale ?? true}
            onChange={updateBool("lockScale")}
          />
          Lock U=V
        </label>
      </div>

      <div style={{ fontSize: 9, opacity: 0.65, marginTop: 1, marginBottom: 4, color: "#8ecbff" }}>
        * Octane scale &lt; 1 zooms in (verify against Octane)
      </div>

      <SliderRow
        label="Scale U"
        value={config.scaleU}
        min={0.05}
        max={4.0}
        step={0.001}
        onChange={update("scaleU")}
      />
      <SliderRow
        label="Scale V"
        value={config.scaleV}
        min={0.05}
        max={4.0}
        step={0.001}
        onChange={update("scaleV")}
      />

      <SliderRow
        label="Translate U"
        value={config.transU}
        min={-1.0}
        max={1.0}
        step={0.001}
        onChange={update("transU")}
      />
      <SliderRow
        label="Translate V"
        value={config.transV}
        min={-1.0}
        max={1.0}
        step={0.001}
        onChange={update("transV")}
      />

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginTop: 6,
          cursor: "pointer",
          fontSize: 9.5,
          opacity: 0.8,
        }}
      >
        <input
          type="checkbox"
          checked={config.scaleInvert ?? false}
          onChange={updateBool("scaleInvert")}
        />
        Invert scale convention (p / scale instead of p * scale)
      </label>
    </div>
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

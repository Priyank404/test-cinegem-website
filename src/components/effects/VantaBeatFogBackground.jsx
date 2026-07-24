/**
 * VantaBeatFogBackground.jsx
 * -------------------------------------------------------------------------
 * Same idea as your existing BeatBackground.jsx (two stacked canvases,
 * crossfaded by opacity, driven by RingHero's onBeatBlendUpdate weight)
 * but rendering Vanta FOG instead of a plain THREE.Scene per beat.
 *
 * Drop this in HeroPage2 EXACTLY where BeatBackground currently sits (or
 * alongside it, on a lower zIndex, if you want to keep both layers), and
 * forward the same setBlend({ fromIndex, toIndex, weight }) calls that
 * RingHero already emits.
 *
 * Give it one FOG options object per beat via `beatOptions` — index 0 is
 * Beat 1, index 1 is Beat 2, etc. Each beat can have totally independent
 * colors/blur/speed/zoom.
 *
 * HeroPage2.jsx usage:
 *
 *   import VantaBeatFogBackground from "@/components/effects/VantaBeatFogBackground";
 *   import { BEAT_FOG_PRESETS } from "@/components/effects/beatFogPresets";
 *
 *   const vantaBeatRef = useRef(null);
 *   // ...inside the same onBeatBlendUpdate callback you already pass to
 *   // beatBackgroundRef, also call:
 *   vantaBeatRef.current?.setBlend({ fromIndex, toIndex, weight });
 *
 *   <VantaBeatFogBackground ref={vantaBeatRef} beatOptions={BEAT_FOG_PRESETS} zIndex={1} />
 *
 * NOTE ON COST: this runs up to two live Vanta/THREE WebGL contexts at
 * once (same tradeoff your BeatBackground already makes with two
 * renderers). Fine on desktop; consider dropping to a single non-
 * crossfaded VantaFogBackground on low-end/mobile if you see jank.
 * -------------------------------------------------------------------------
 */

import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import * as THREE from "three";
if (typeof window !== "undefined") {
  window.THREE = THREE;
}
import FOG from "vanta/src/vanta.fog";

const vantaFog = typeof FOG === "function" ? FOG : FOG.default;
import { DEFAULT_FOG_OPTIONS, normalizeFogOptions } from "./VantaFogBackground";


const VantaBeatFogBackground = forwardRef(function VantaBeatFogBackground(
  { beatOptions = [], zIndex = 1 },
  ref,
) {
  const fromContainerRef = useRef(null);
  const toContainerRef = useRef(null);
  const fromEffectRef = useRef(null);
  const toEffectRef = useRef(null);
  const appliedRef = useRef({ from: -1, to: -1 });
  const blendRef = useRef({ fromIndex: 0, toIndex: 0, weight: 0 });
  const rafRef = useRef(0);


  // Same imperative shape as BeatBackground's ref API — RingHero's
  // callback doesn't need to know which background layer(s) it's
  // feeding, it just calls setBlend() on whichever refs are mounted.
  useImperativeHandle(ref, () => ({
    setBlend(next) {
      blendRef.current = next;
    },
  }));

  useEffect(() => {
    const fromEl = fromContainerRef.current;
    const toEl = toContainerRef.current;
    if (!fromEl || !toEl) return;

    function optionsForBeat(index) {
      const safeIndex = Math.max(0, Math.min(index, beatOptions.length - 1));
      const {
        hoverEffect,
        hoverColor,
        hoverIntensity,
        hoverRadius,
        ...vantaOnly
      } = beatOptions[safeIndex] || {};
      return {
        ...DEFAULT_FOG_OPTIONS,
        ...normalizeFogOptions(vantaOnly),
      };
    }



    function ensureEffect(effectRef, el, index) {
      const opts = optionsForBeat(index);
      if (!effectRef.current) {
        effectRef.current = vantaFog({ el, THREE, ...opts });
      } else {
        effectRef.current.setOptions(opts);
      }
    }

    function tick() {
      rafRef.current = requestAnimationFrame(tick);
      const { fromIndex, toIndex, weight } = blendRef.current;

      if (appliedRef.current.from !== fromIndex) {
        ensureEffect(fromEffectRef, fromEl, fromIndex);
        appliedRef.current.from = fromIndex;

      }
      if (appliedRef.current.to !== toIndex) {
        ensureEffect(toEffectRef, toEl, toIndex);
        appliedRef.current.to = toIndex;
      }

      // Same crossfade rule as BeatBackground: "from" fades out as
      // weight goes 0->1, "to" fades in, and idle (fromIndex===toIndex)
      // just shows "from" at full opacity with no flicker.
      fromEl.style.opacity = String(1 - weight);
      toEl.style.opacity = String(fromIndex === toIndex ? 0 : weight);
    }
    tick();

    return () => {
      cancelAnimationFrame(rafRef.current);
      fromEffectRef.current?.destroy();
      toEffectRef.current?.destroy();
      fromEffectRef.current = null;
      toEffectRef.current = null;
      appliedRef.current = { from: -1, to: -1 };
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beatOptions]);

  const layerStyle = {
    position: "fixed",
    inset: 0,
    zIndex,
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
  };

  return (
    <>
      <div ref={fromContainerRef} style={layerStyle} />
      <div ref={toContainerRef} style={layerStyle} />
    </>
  );
});

export default VantaBeatFogBackground;
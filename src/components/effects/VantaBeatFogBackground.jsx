/**
 * VantaBeatFogBackground.jsx
 * -------------------------------------------------------------------------
 * Single-canvas Vanta FOG background layer for HeroPage2.
 * Renders ONLY ONE Vanta Fog WebGL instance and smoothly transitions
 * colors (and numeric fog parameters) across all 5 beats as the user scrolls,
 * driven by RingHero's onBeatBlendUpdate callback.
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
import {
  DEFAULT_FOG_OPTIONS,
  normalizeFogOptions,
  toVantaColor,
} from "./VantaFogBackground";

function lerp(a, b, w) {
  return a + (b - a) * w;
}

function lerpColor(c1, c2, w) {
  const num1 = toVantaColor(c1 ?? 0x000000);
  const num2 = toVantaColor(c2 ?? 0x000000);
  const col1 = new THREE.Color(num1);
  const col2 = new THREE.Color(num2);
  col1.lerp(col2, w);
  return col1.getHex();
}

function getInterpolatedFogOptions(fromRaw = {}, toRaw = {}, weight = 0) {
  const from = { ...DEFAULT_FOG_OPTIONS, ...normalizeFogOptions(fromRaw) };
  const to = { ...DEFAULT_FOG_OPTIONS, ...normalizeFogOptions(toRaw) };
  const w = Math.max(0, Math.min(1, weight));

  return {
    ...from,
    highlightColor: lerpColor(from.highlightColor, to.highlightColor, w),
    midtoneColor: lerpColor(from.midtoneColor, to.midtoneColor, w),
    lowlightColor: lerpColor(from.lowlightColor, to.lowlightColor, w),
    baseColor: lerpColor(from.baseColor, to.baseColor, w),
    blurFactor: lerp(from.blurFactor ?? 0.6, to.blurFactor ?? 0.6, w),
    speed: lerp(from.speed ?? 1.0, to.speed ?? 1.0, w),
    zoom: lerp(from.zoom ?? 0.6, to.zoom ?? 0.6, w),
  };
}

const VantaBeatFogBackground = forwardRef(function VantaBeatFogBackground(
  { beatOptions = [], zIndex = 1 },
  ref,
) {
  const containerRef = useRef(null);
  const effectRef = useRef(null);
  const blendRef = useRef({ fromIndex: 0, toIndex: 0, weight: 0 });
  const beatOptionsRef = useRef(beatOptions);
  const rafRef = useRef(0);
  const lastStateKeyRef = useRef("");

  beatOptionsRef.current = beatOptions;

  // Imperative handle for RingHero's setBlend API
  useImperativeHandle(ref, () => ({
    setBlend(next) {
      blendRef.current = next;
    },
  }));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Initial options based on beat 0
    const initialOpts = getInterpolatedFogOptions(
      beatOptionsRef.current[0],
      beatOptionsRef.current[0],
      0,
    );

    effectRef.current = vantaFog({
      el,
      THREE,
      ...initialOpts,
    });

    function tick() {
      rafRef.current = requestAnimationFrame(tick);
      if (!effectRef.current) return;

      const { fromIndex, toIndex, weight } = blendRef.current;
      const optsArray = beatOptionsRef.current;

      const safeFromIndex = Math.max(0, Math.min(fromIndex, optsArray.length - 1));
      const safeToIndex = Math.max(0, Math.min(toIndex, optsArray.length - 1));

      const stateKey = `${safeFromIndex}_${safeToIndex}_${weight.toFixed(4)}_${optsArray.length}`;
      if (stateKey === lastStateKeyRef.current) return;
      lastStateKeyRef.current = stateKey;

      const fromOpts = optsArray[safeFromIndex] || {};
      const toOpts = optsArray[safeToIndex] || {};

      const interpolated = getInterpolatedFogOptions(fromOpts, toOpts, weight);
      effectRef.current.setOptions(interpolated);
    }

    tick();

    return () => {
      cancelAnimationFrame(rafRef.current);
      effectRef.current?.destroy();
      effectRef.current = null;
      lastStateKeyRef.current = "";
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
      }}
    />
  );
});

export default VantaBeatFogBackground;
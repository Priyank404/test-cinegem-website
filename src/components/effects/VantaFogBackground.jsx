/**
 * VantaFogBackground.jsx
 * -------------------------------------------------------------------------
 * Single, standalone Vanta FOG background layer — one live effect
 * instance, no beat-crossfading (that's what VantaBeatFogBackground.jsx
 * is for, which reuses DEFAULT_FOG_OPTIONS / normalizeFogOptions from
 * this file).
 *
 * USAGE:
 *
 *   const [fogOptions, setFogOptions] = useState(DEFAULT_FOG_OPTIONS);
 *   <VantaFogBackground options={fogOptions} />
 *   <VantaFogControlPanel options={fogOptions} onChange={setFogOptions} />
 * -------------------------------------------------------------------------
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
if (typeof window !== "undefined") {
  window.THREE = THREE;
}
import FOG from "vanta/src/vanta.fog";

const vantaFog = typeof FOG === "function" ? FOG : FOG.default;

// Neutral defaults — matches vantajs.com's own FOG defaults so an
// unconfigured instance looks like the stock effect.
export const DEFAULT_FOG_OPTIONS = {
  highlightColor: "#ffffff",
  midtoneColor: "#8f9bff",
  lowlightColor: "#1b1b2f",
  baseColor: "#0c0d16",
  blurFactor: 0.6,
  speed: 1.0,
  zoom: 0.6,
  mouseControls: true,
  touchControls: true,
  gyroControls: false,
  minHeight: 200.0,
  minWidth: 200.0,
};

// Strips out anything that isn't a real Vanta FOG option, and coerces
// color fields to the hex-number format Vanta expects.
export function normalizeFogOptions(options = {}) {
  const {
    highlightColor,
    midtoneColor,
    lowlightColor,
    baseColor,
    blurFactor,
    speed,
    zoom,
    mouseControls,
    touchControls,
    gyroControls,
    minHeight,
    minWidth,
  } = options;

  const normalized = {};
  if (highlightColor !== undefined)
    normalized.highlightColor = toVantaColor(highlightColor);
  if (midtoneColor !== undefined)
    normalized.midtoneColor = toVantaColor(midtoneColor);
  if (lowlightColor !== undefined)
    normalized.lowlightColor = toVantaColor(lowlightColor);
  if (baseColor !== undefined) normalized.baseColor = toVantaColor(baseColor);
  if (blurFactor !== undefined) normalized.blurFactor = blurFactor;
  if (speed !== undefined) normalized.speed = speed;
  if (zoom !== undefined) normalized.zoom = zoom;
  if (mouseControls !== undefined) normalized.mouseControls = mouseControls;
  if (touchControls !== undefined) normalized.touchControls = touchControls;
  if (gyroControls !== undefined) normalized.gyroControls = gyroControls;
  if (minHeight !== undefined) normalized.minHeight = minHeight;
  if (minWidth !== undefined) normalized.minWidth = minWidth;

  return normalized;
}

// Vanta wants colors as 0xRRGGBB numbers, not CSS hex strings.
export function toVantaColor(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    return parseInt(value.replace("#", ""), 16);
  }
  return value;
}

export default function VantaFogBackground({
  options = DEFAULT_FOG_OPTIONS,
  zIndex = 0,
}) {
  const containerRef = useRef(null);
  const effectRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    effectRef.current = vantaFog({
      el,
      THREE,
      ...DEFAULT_FOG_OPTIONS,
      ...normalizeFogOptions(options),
    });

    return () => {
      effectRef.current?.destroy();
      effectRef.current = null;
    };
    // Only re-create on mount/unmount — option changes are pushed via
    // setOptions() below instead of tearing down the WebGL context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    effectRef.current?.setOptions?.({
      ...DEFAULT_FOG_OPTIONS,
      ...normalizeFogOptions(options),
    });
  }, [options]);

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
}

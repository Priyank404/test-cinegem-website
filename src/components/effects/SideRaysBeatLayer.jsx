/**
 * SideRaysBeatLayer.jsx
 * -------------------------------------------------------------------------
 * Pins the real React Bits <SideRays /> (ogl-based) as a fixed, full-
 * viewport layer and fades its opacity in/out based on which beat is
 * active — driven by the exact same { fromIndex, toIndex, weight } object
 * RingHero reports via onBeatBlendUpdate, so it never drifts out of sync
 * with the ring's own scroll position.
 *
 * SideRays renders its own <canvas> via ogl, not a THREE.Scene, so it
 * can't live inside BeatBackground.jsx's BEAT_SCENES registry (that
 * registry expects { init(THREE) -> { scene, update, dispose } }).
 * Instead this sits as its own stacking layer:
 *
 *   z-index 0   gradient overlay (RingHero.jsx)
 *   z-index 1   BeatBackground (per-beat THREE scenes)
 *   z-index 2   ring canvas (RingHero.jsx) — mounted AFTER this component
 *               in HeroPage2.jsx, so at the tied z-index it still paints
 *               on top (later DOM order wins ties). z-index must be an
 *               integer — "1.5" is invalid CSS and gets dropped to
 *               `auto`, which is what was hiding this layer entirely.
 *
 * Usage in HeroPage2.jsx:
 *
 *   <SideRaysBeatLayer ref={sideRaysRef} beatIndex={1} ... />
 *   ...
 *   onBeatBlendUpdate={(blend) => {
 *     beatBackgroundRef.current?.setBlend(blend);
 *     sideRaysRef.current?.setBlend(blend);
 *   }}
 */

import { forwardRef, useImperativeHandle, useRef } from "react";

const SideRaysBeatLayer = forwardRef(function SideRaysBeatLayer(
  { beatIndex = 1, as: RaysComponent, ...raysProps },
  ref,
) {
  const layerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    setBlend({ fromIndex, toIndex, weight }) {
      if (!layerRef.current) return;
      let visibility = 0;
      if (fromIndex === beatIndex && toIndex === beatIndex) {
        visibility = 1;
      } else if (fromIndex === beatIndex) {
        visibility = 1 - weight;
      } else if (toIndex === beatIndex) {
        visibility = weight;
      }
      layerRef.current.style.opacity = String(visibility);
    },
  }));

  return (
    <div
      ref={layerRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 2,
        pointerEvents: "none",
        opacity: 0,
      }}
    >
      <RaysComponent {...raysProps} />
    </div>
  );
});

export default SideRaysBeatLayer;

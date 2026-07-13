/**
 * ScrollDebugHud.jsx
 * -------------------------------------------------------------------------
 * Small fixed on-screen readout showing exactly where you are in the
 * Hero2 scroll timeline while you scroll — overall percentage, which
 * beat you're in/transitioning between, and raw scrollY/page height.
 *
 * Fed entirely via a ref API (setDebug), same "ref not state" pattern as
 * BeatBackground's setBlend — RingHero's onScrollDebugUpdate callback
 * fires every scroll-scrubbed frame, HeroPage2 forwards it straight into
 * this ref, so there's no React re-render on every scroll tick.
 *
 * Dev-only UI — gate it behind the same SHOW_DEV_PANEL flag you already
 * use for the other dev panels in HeroPage2.jsx, or delete before ship.
 * -------------------------------------------------------------------------
 */

import { useImperativeHandle, useRef, forwardRef, useState } from "react";

const ScrollDebugHud = forwardRef(function ScrollDebugHud(_props, ref) {
  const elRef = useRef(null);
  // Visibility toggle stays as real state (rare change, needs a re-
  // render); the actual numbers are pushed straight to the DOM below to
  // avoid re-rendering React 60x/second while scrolling.
  const [visible, setVisible] = useState(true);

  useImperativeHandle(ref, () => ({
    setDebug(info) {
      const el = elRef.current;
      if (!el) return;
      const pct = (info.progress * 100).toFixed(1);
      const beatLabel = `${info.beatIndex + 1} → ${Math.min(info.beatIndex + 2, info.beatCount)}`;
      const beatPct = (info.beatFraction * 100).toFixed(0);
      el.textContent =
        `Scroll ${pct}%\n` +
        `Beat ${beatLabel}  (${beatPct}% between)\n` +
        `scrollY ${Math.round(info.scrollY)} / ${Math.round(info.docHeight)}px`;
    },
  }));

  return (
    <>
      <div
        ref={elRef}
        style={{
          position: "fixed",
          bottom: 20,
          left: 20,
          zIndex: 100,
          display: visible ? "block" : "none",
          background: "rgba(20,20,22,0.85)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 8,
          padding: "10px 14px",
          color: "#fff",
          fontSize: 11,
          fontFamily: "monospace",
          lineHeight: 1.6,
          whiteSpace: "pre",
          backdropFilter: "blur(6px)",
          pointerEvents: "none",
        }}
      >
        Scroll 0.0%{"\n"}Beat 1 → 2 (0% between){"\n"}scrollY 0 / 0px
      </div>
      <button
        onClick={() => setVisible((v) => !v)}
        style={{
          position: "fixed",
          bottom: 20,
          left: visible ? 190 : 20,
          zIndex: 101,
          background: "rgba(20,20,22,0.9)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 8,
          padding: "6px 10px",
          color: "#fff",
          fontSize: 10,
          fontFamily: "monospace",
          cursor: "pointer",
          backdropFilter: "blur(6px)",
        }}
      >
        {visible ? "Hide scroll debug" : "Show scroll debug"}
      </button>
    </>
  );
});

export default ScrollDebugHud;

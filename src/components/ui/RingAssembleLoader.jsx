import React from "react";
import "./ring-assemble.css";

/**
 * RingAssembleLoader — ring is "drawn" with construction guides, then the gem fills in.
 * The SVG ring assembly animation and progress bar start and complete independently (~3.6s).
 *
 * Props:
 *  - onAnimationComplete: callback invoked when the intro animation has fully played to completion.
 */
export default React.memo(function RingAssembleLoader({ onAnimationComplete }) {
  const handleBarAnimationEnd = (e) => {
    if (e.animationName === "rl-bar-fill") {
      onAnimationComplete?.();
    }
  };

  return (
    <div className="rl-wrap" aria-hidden="true">
      <svg className="rl-svg" viewBox="30 44 140 150" fill="none" aria-hidden="true" focusable="false">
        <g className="rl-guides">
          <line className="rl-g rl-gx" x1="36" y1="138" x2="164" y2="138"/>
          <line className="rl-g rl-gy" x1="100" y1="48" x2="100" y2="190"/>
          <circle className="rl-g rl-gc" cx="100" cy="138" r="49"/>
          <circle className="rl-g rl-gc" cx="100" cy="138" r="39"/>
          <line className="rl-g rl-gem-g1" x1="79" y1="72.5" x2="121" y2="72.5"/>
          <line className="rl-g rl-gem-g2" x1="88" y1="62" x2="112" y2="62"/>
          <line className="rl-g rl-gem-g3" x1="100" y1="58" x2="100" y2="96"/>
          <g className="rl-arm">
            <line x1="100" y1="138" x2="100" y2="94"/>
            <circle cx="100" cy="94" r="2.6"/>
          </g>
        </g>
        {/* Ring Band: Native clockwise SVG arc starting at 12 o'clock (100, 94) */}
        <path
          className="rl-band"
          d="M 100 94 A 44 44 0 0 1 100 182 A 44 44 0 0 1 100 94"
          stroke="#ffffff"
          strokeWidth="4.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          className="rl-gem-line"
          d="M79 72.5 L88 62 L112 62 L121 72.5 L100 92 Z"
          stroke="#ffffff"
          strokeWidth="1.6"
          strokeLinejoin="round"
          fill="none"
        />
        <g className="rl-facet-lines">
          <polygon points="79,72.5 88,62 94,72.5"/>
          <polygon points="88,62 112,62 106,72.5 94,72.5"/>
          <polygon points="112,62 121,72.5 106,72.5"/>
          <polygon points="79,72.5 94,72.5 100,92"/>
          <polygon points="94,72.5 106,72.5 100,92"/>
          <polygon points="106,72.5 121,72.5 100,92"/>
        </g>
        <path className="rl-collar" d="M89 91 L111 91 L107 98 L93 98 Z" fill="#ffffff"/>
        <g className="rl-fills">
          <polygon style={{"--i":0}} points="79,72.5 88,62 94,72.5" fill="#f6c3d6"/>
          <polygon style={{"--i":1}} points="88,62 112,62 106,72.5 94,72.5" fill="#ffffff"/>
          <polygon style={{"--i":2}} points="112,62 121,72.5 106,72.5" fill="#f6c3d6"/>
          <polygon style={{"--i":3}} points="79,72.5 94,72.5 100,92" fill="#e58ab0"/>
          <polygon style={{"--i":4}} points="94,72.5 106,72.5 100,92" fill="#c9446f"/>
          <polygon style={{"--i":5}} points="106,72.5 121,72.5 100,92" fill="#e58ab0"/>
        </g>
        <g transform="translate(119 59)">
          <path className="rl-spark" d="M0 -6 Q1.2 -1.2 6 0 Q1.2 1.2 0 6 Q-1.2 1.2 -6 0 Q-1.2 -1.2 0 -6Z"/>
        </g>
      </svg>
      <div className="rl-bar">
        <i onAnimationEnd={handleBarAnimationEnd} />
      </div>
    </div>
  );
});

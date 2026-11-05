// src/components/dev/CreativeVisualsDevControls.jsx
// Development-only control panel for adjusting Creative Visuals grid row counts.
// Excluded from production mode automatically via isDevMode().
import { useState } from "react";
import { isDevMode } from "@/config/env";

export default function CreativeVisualsDevControls({
  grid1Rows,
  grid2Rows,
  onChangeGrid1Rows,
  onChangeGrid2Rows,
  onReset,
}) {
  if (!isDevMode()) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const rowOptions = [1, 2, 3, 4, 5, 6];

  return (
    <aside
      aria-label="Creative Visuals Dev Grid Controls"
      className="fixed bottom-6 right-6 z-50 font-sans pointer-events-auto select-none"
    >
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-3.5 py-2 bg-black/90 hover:bg-neutral-900 text-neutral-200 border border-white/20 hover:border-amber-400/50 rounded-full shadow-2xl backdrop-blur-md transition-all duration-200 text-xs font-medium cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-white">Grid Controls</span>
          <span className="text-[10px] uppercase tracking-wider text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30 font-mono">
            G1: {grid1Rows}r · G2: {grid2Rows}r
          </span>
        </button>
      ) : (
        <div className="w-80 bg-neutral-950/95 border border-white/20 rounded-2xl p-4 shadow-2xl backdrop-blur-xl text-neutral-200 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-semibold text-white tracking-wide">
                Grid Row Controls
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-wider text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 font-mono font-medium">
                DEV ONLY
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-white text-base leading-none px-1 cursor-pointer transition-colors"
                aria-label="Close controls"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Grid 1 Rows Control */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-white">Section 1 (Grid 1) Rows:</span>
              <span className="text-neutral-400 font-mono text-[11px]">
                {grid1Rows} rows ({grid1Rows * 2} tiles)
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {rowOptions.map((n) => {
                const isActive = grid1Rows === n;
                return (
                  <button
                    key={`g1-r-${n}`}
                    type="button"
                    onClick={() => onChangeGrid1Rows?.(n)}
                    className={`py-1.5 rounded text-xs font-semibold transition-all cursor-pointer text-center ${
                      isActive
                        ? "bg-amber-400 text-black shadow-md shadow-amber-400/20"
                        : "bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid 2 Rows Control */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-white">Section 3 (Grid 2) Rows:</span>
              <span className="text-neutral-400 font-mono text-[11px]">
                {grid2Rows} rows ({grid2Rows * 2} tiles)
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {rowOptions.map((n) => {
                const isActive = grid2Rows === n;
                return (
                  <button
                    key={`g2-r-${n}`}
                    type="button"
                    onClick={() => onChangeGrid2Rows?.(n)}
                    className={`py-1.5 rounded text-xs font-semibold transition-all cursor-pointer text-center ${
                      isActive
                        ? "bg-amber-400 text-black shadow-md shadow-amber-400/20"
                        : "bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer info & reset */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] text-neutral-400">
            <span>Hidden in production build</span>
            <button
              type="button"
              onClick={onReset}
              className="text-amber-400 hover:text-amber-300 underline underline-offset-2 cursor-pointer font-medium"
            >
              Reset Defaults
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * RetrieveGridButton
 * -----------------------------------------------------------------------------
 * Luxury floating toggle button placed on individual service pages (Classic E-Commerce,
 * Creative Visuals, On-Body Visualization) allowing users to switch between:
 * 1. The Original Normal Grid (the authentic, wide/unconstrained layout from commit c111c47)
 * 2. The Glassy Container Grid (the boxed luxury frosted container layout with hairline gaps)
 * -----------------------------------------------------------------------------
 * Portaled directly to document.body to prevent any parent overflow or transform
 * stacking context from clipping or repositioning it.
 */
export default function RetrieveGridButton({
  isClean = false,
  onToggle,
  pageName = "",
  className = "",
  style,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const content = (
    <aside
      aria-label="Grid layout toggle"
      className="fixed bottom-5 left-5 sm:bottom-6 sm:left-6 z-[99999] pointer-events-auto select-none"
    >
      <button
        type="button"
        onClick={() => onToggle && onToggle(!isClean)}
        title={
          isClean
            ? `Switch to Glassy Container Grid for ${pageName || "this page"}`
            : `Retrieve Original Normal Grid for ${pageName || "this page"}`
        }
        aria-label={
          isClean
            ? `Switch to Glassy Container Grid for ${pageName || "this page"}`
            : `Retrieve Original Normal Grid for ${pageName || "this page"}`
        }
        className={`
          group flex items-center gap-2.5 px-4 py-2.5 sm:px-5 sm:py-3 rounded-full
          font-['Poppins',sans-serif] text-[11px] sm:text-[12px] font-medium tracking-[0.16em] uppercase
          transition-all duration-300 cursor-pointer
          backdrop-blur-2xl active:scale-95 hover:scale-[1.04]
          ${
            !isClean
              ? "bg-[#0e0e12]/95 hover:bg-[#16161c] text-white border border-[#C5A059]/50 hover:border-[#C5A059] shadow-[0_12px_36px_rgba(0,0,0,0.8),0_0_20px_rgba(197,160,89,0.25)]"
              : "bg-[#C5A059] hover:bg-[#d6af63] text-black font-semibold border border-[#e8c783] shadow-[0_12px_36px_rgba(197,160,89,0.5)]"
          }
          ${className}
        `}
        style={style}
      >
        {/* Dynamic Icon */}
        {!isClean ? (
          <svg
            className="w-4 h-4 text-[#C5A059] group-hover:rotate-180 transition-transform duration-500 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        ) : (
          <svg
            className="w-4 h-4 text-black shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <path d="M3 9h18M9 21V9" />
          </svg>
        )}

        {/* Dynamic Text */}
        <span className="whitespace-nowrap drop-shadow-sm">
          {!isClean ? "Retrieve Normal Grid" : "Switch to Glassy Grid"}
        </span>

        {/* Status Indicator */}
        <span
          className={`w-2 h-2 rounded-full transition-all shrink-0 ${
            !isClean
              ? "bg-[#C5A059] shadow-[0_0_8px_#C5A059] animate-pulse"
              : "bg-black shadow-[0_0_6px_rgba(0,0,0,0.6)]"
          }`}
        />
      </button>
    </aside>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

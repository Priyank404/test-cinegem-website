import React, { useState } from "react";

/**
 * VerticalDotNav
 * -----------------------------------------------------------------------------
 * Ultra-minimal luxury dot navigation inspired by high-jewellery maisons (Cartier style).
 *
 * Characteristics:
 * - Pure floating dots (no vertical line)
 * - Ultra-tight spacing between dots
 * - Discreet, delicate dot sizes:
 *     - Inactive: 2.5px subtle translucent white dot
 *     - Active / Current: 5px solid crisp white dot (slightly larger)
 *     - Hover: 4px white dot
 * - Minimal, elegant tooltip with high-tracking uppercase typography on hover
 * - Smooth scroll integration with Lenis / native fallback
 * -----------------------------------------------------------------------------
 */

export const DEFAULT_HOME_SECTIONS = [
  { id: "home", name: "Home", frame: 0 },
  { id: "work", name: "Classic E-Commerce", frame: 45 },
  { id: "details", name: "Creative Visuals", frame: 93 },
  { id: "views", name: "On-Body Visuals", frame: 147 },
  { id: "center", name: "3D Interactive", frame: 223 },
];

export default function VerticalDotNav({
  sections = DEFAULT_HOME_SECTIONS,
  activeIndex = 0,
  onDotClick,
  visible = true,
  className = "",
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  return (
    <nav
      aria-label="Section navigation"
      className={`fixed right-4 md:right-7 top-1/2 -translate-y-1/2 z-40 select-none transition-opacity duration-500 ease-out hidden sm:flex ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      } ${className}`}
    >
      {/* Navigation Dots List: ultra-tight spacing without connecting line */}
      <ul className="relative flex flex-col items-center gap-[3px] m-0 p-0 list-none pointer-events-auto">
        {sections.map((section, index) => {
          const isActive = activeIndex === index;
          const isHovered = hoveredIndex === index;

          return (
            <li key={section.id || index} className="relative flex items-center justify-center">
              {/* Minimal Luxury Section Name Tooltip (appears smoothly on hover and is clickable) */}
              <div
                id={`dot-tooltip-${index}`}
                role="tooltip"
                aria-hidden={!isHovered}
                onClick={() => onDotClick && onDotClick(index, section)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`absolute right-full mr-3 top-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 ease-out ${
                  isHovered
                    ? "opacity-100 translate-x-0 pointer-events-auto"
                    : "opacity-0 translate-x-1.5 pointer-events-none"
                }`}
              >
                <div
                  className="px-3.5 py-1.5 rounded-full whitespace-nowrap hover:scale-105 transition-transform"
                  style={{
                    background: "rgba(14, 14, 18, 0.45)",
                    backdropFilter: "blur(24px) saturate(180%)",
                    WebkitBackdropFilter: "blur(24px) saturate(180%)",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    boxShadow:
                      "0 15px 35px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
                  }}
                >
                  <span className="font-['Poppins',sans-serif] text-[10.5px] font-light tracking-[0.22em] uppercase text-white/95">
                    {section.name}
                  </span>
                </div>
              </div>

              {/* Dot Button: compact visual height with expanded invisible hit area for effortless clicking */}
              <button
                type="button"
                onClick={() => onDotClick && onDotClick(index, section)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(index)}
                onBlur={() => setHoveredIndex(null)}
                aria-label={`Scroll to ${section.name}`}
                aria-describedby={`dot-tooltip-${index}`}
                aria-current={isActive ? "step" : undefined}
                className="group relative flex items-center justify-center w-5 h-2.5 before:content-[''] before:absolute before:-inset-y-1.5 before:-inset-x-2 before:cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-white/60 transition-transform active:scale-90"
              >
                {/* Ultra-minimal dot: inactive = 2.5px, active = 5.5px, hover = 4px */}
                <span
                  className={`rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isActive
                      ? "w-[5.5px] h-[5.5px] bg-white shadow-[0_0_5px_rgba(255,255,255,0.6)]"
                      : isHovered
                        ? "w-[4px] h-[4px] bg-white/90"
                        : "w-[2.5px] h-[2.5px] bg-white/40 group-hover:bg-white/80"
                  }`}
                  aria-hidden="true"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

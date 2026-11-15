import React, { useState, useEffect, useRef, useCallback } from "react";

/**
 * MobileScrollBar
 * -----------------------------------------------------------------------------
 * Always-visible luxury vertical scroll indicator & scrubber for mobile viewports.
 *
 * Characteristics:
 * - Always visible on mobile — never auto-hides, always ready for immediate touch/drag
 * - Draggable capsule thumb lets users scrub smoothly up and down the page
 * - Integrates directly with Lenis smooth-scroll (or window fallback)
 * - Constrained to a centered vertical track (top: 20%, height: 60%) to avoid browser UI
 * - Strictly hidden on desktop / tablet (hidden on screens >= 640px)
 * - Safe hit target (28px touch zone) with touch-action: none for clean scrubbing
 * -----------------------------------------------------------------------------
 */
export default function MobileScrollBar({ lenisRef, visible = true }) {
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const trackRef = useRef(null);
  const isDraggingRef = useRef(false);

  isDraggingRef.current = isDragging;

  // Listen to window scroll to sync progress when scrolling normally via page swipes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      if (isDraggingRef.current) return;

      const scrollY = window.scrollY || window.pageYOffset || 0;
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const p = Math.min(1, Math.max(0, scrollY / maxScroll));
      setProgress(p);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Scrub handler: translates touch Y to scroll position
  const handleTouch = useCallback(
    (clientY) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const trackH = rect.height;
      if (trackH <= 0) return;

      const relY = Math.max(0, Math.min(trackH, clientY - rect.top));
      const p = relY / trackH;
      setProgress(p);

      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const targetScrollY = p * maxScroll;

      if (lenisRef?.current) {
        lenisRef.current.scrollTo(targetScrollY, { immediate: true });
      } else {
        window.scrollTo({ top: targetScrollY, behavior: "instant" });
      }
    },
    [lenisRef]
  );

  const onTouchStart = (e) => {
    e.stopPropagation();
    setIsDragging(true);
    const touch = e.touches[0];
    if (touch) {
      handleTouch(touch.clientY);
    }
  };

  const onTouchMove = (e) => {
    e.stopPropagation();
    const touch = e.touches[0];
    if (touch) {
      handleTouch(touch.clientY);
    }
  };

  const onTouchEnd = (e) => {
    e.stopPropagation();
    setIsDragging(false);
  };

  if (!visible) return null;

  const thumbHeight = 42;

  return (
    <div
      className="fixed right-1 top-[20%] h-[60%] w-7 z-50 select-none block sm:hidden pointer-events-auto opacity-100"
      style={{
        touchAction: "none",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      aria-label="Mobile scroll scrubber"
      role="scrollbar"
      aria-valuenow={Math.round(progress * 100)}
    >
      {/* Subtle guide track */}
      <div
        ref={trackRef}
        className="relative w-full h-full flex justify-end items-start pr-1"
      >
        <div className="absolute right-1 top-0 bottom-0 w-[2px] rounded-full bg-white/15" />

        {/* Draggable Scrubber Thumb */}
        <div
          className="relative rounded-full transition-all duration-100 ease-out"
          style={{
            transform: `translateY(${progress * (trackRef.current ? Math.max(0, trackRef.current.clientHeight - thumbHeight) : 200)}px)`,
            height: `${thumbHeight}px`,
            width: isDragging ? "5px" : "3.5px",
            backgroundColor: isDragging ? "#C5A059" : "rgba(255, 255, 255, 0.85)",
            boxShadow: isDragging
              ? "0 0 12px rgba(197, 160, 89, 0.85)"
              : "0 0 6px rgba(0, 0, 0, 0.5)",
          }}
        />
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef, useCallback } from "react";

/**
 * MobileScrollBar
 * -----------------------------------------------------------------------------
 * Discreet luxury vertical scroll indicator & scrubber for mobile viewports.
 *
 * Characteristics:
 * - Appears on scroll, fades away smoothly after 1.2s of inactivity
 * - Draggable capsule thumb lets users scrub up and down the page
 * - Integrates directly with Lenis smooth-scroll (or window fallback)
 * - Constrained to a centered 60% vertical viewport height to avoid browser chrome
 * - Completely hidden on desktop / tablet (sm:hidden)
 * - Safe hit target (28px touch zone) without blocking underlying gestures when idle
 * -----------------------------------------------------------------------------
 */
export default function MobileScrollBar({ lenisRef, visible = true }) {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const trackRef = useRef(null);
  const hideTimeoutRef = useRef(null);
  const isDraggingRef = useRef(false);

  isDraggingRef.current = isDragging;

  // Show scrollbar and schedule automatic fade-out
  const triggerVisibility = useCallback(() => {
    setIsVisible(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      if (!isDraggingRef.current) {
        setIsVisible(false);
      }
    }, 1200);
  }, []);

  // Listen to window scroll to sync progress when scrolling normally
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
      triggerVisibility();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [triggerVisibility]);

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
    setIsVisible(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
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
    triggerVisibility();
  };

  if (!visible) return null;

  // Track height is roughly 60vh; thumb height is 34px
  const thumbHeight = 34;

  return (
    <div
      className={`fixed right-1 top-[22%] h-[56%] w-7 z-50 select-none block sm:hidden ${
        isVisible || isDragging ? "pointer-events-auto" : "pointer-events-none"
      }`}
      style={{
        opacity: isVisible || isDragging ? 1 : 0,
        transition: isDragging ? "none" : "opacity 0.35s ease",
        touchAction: "none",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      aria-hidden="true"
    >
      {/* Subtle guide track */}
      <div
        ref={trackRef}
        className="relative w-full h-full flex justify-end items-start pr-1"
      >
        <div className="absolute right-1 top-0 bottom-0 w-[2px] rounded-full bg-white/10" />

        {/* Draggable Scrubber Thumb */}
        <div
          className="relative rounded-full transition-all duration-150 ease-out"
          style={{
            transform: `translateY(${progress * (trackRef.current ? trackRef.current.clientHeight - thumbHeight : 200)}px)`,
            height: `${thumbHeight}px`,
            width: isDragging ? "5px" : "3px",
            backgroundColor: isDragging ? "#C5A059" : "rgba(255, 255, 255, 0.75)",
            boxShadow: isDragging
              ? "0 0 10px rgba(197, 160, 89, 0.75)"
              : "0 0 5px rgba(0, 0, 0, 0.4)",
          }}
        />
      </div>
    </div>
  );
}

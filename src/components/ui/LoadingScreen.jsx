import { useState, useEffect, useRef } from "react";
import RingAssembleLoader from "./RingAssembleLoader";

/**
 * LoadingScreen.jsx
 * -------------------------------------------------------------------------
 * Pure minimal luxury loading screen for Cinegem Studio.
 *
 * Requirements:
 *  - Solid pitch-black (#000000), 100% opaque, zero transparency.
 *  - Centered Cinegem Studio official logo (incorporates emblem & typography).
 *  - Independent Ring assembly blueprint sketch animation with thin progress bar.
 *  - Guaranteed to finish the full animation (~3.6s) before fading out.
 * -------------------------------------------------------------------------
 */

export default function LoadingScreen({
  isLoading = true,
  progress = 0,
  statusText = "",
  onFinished = null,
}) {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const [hasAnimationFinished, setHasAnimationFinished] = useState(false);
  const hasFinishedRef = useRef(false);
  const startTimeRef = useRef(Date.now());

  // Minimum duration of 3800ms ensures the complete 3.6s animation plays gracefully
  useEffect(() => {
    const isDebug =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("ringdebug");

    if (isDebug) {
      setHasAnimationFinished(true);
      return;
    }

    const timer = setTimeout(() => {
      setHasAnimationFinished(true);
    }, 3800);

    return () => clearTimeout(timer);
  }, []);

  const handleAnimationComplete = () => {
    setHasAnimationFinished(true);
  };

  useEffect(() => {
    // Exit occurs only when BOTH the 3D scene is loaded AND the full intro animation completes!
    if (!isLoading && hasAnimationFinished && !hasFinishedRef.current) {
      hasFinishedRef.current = true;

      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 3800 - elapsed);

      const triggerFade = () => {
        setIsFadingOut(true);
        setTimeout(() => {
          setIsMounted(false);
          onFinished?.();
        }, 650);
      };

      if (remaining > 0) {
        const t = setTimeout(triggerFade, remaining);
        return () => clearTimeout(t);
      } else {
        triggerFade();
      }
    }
  }, [isLoading, hasAnimationFinished, onFinished]);

  // Lock body scroll while active
  useEffect(() => {
    if (isMounted) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMounted]);

  if (!isMounted) return null;

  return (
    <div
      role="progressbar"
      aria-label="Cinegem Studio Loading"
      aria-live="polite"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      className={`fixed inset-0 flex flex-col items-center justify-center select-none transition-opacity duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isFadingOut
          ? "opacity-0 pointer-events-none"
          : "opacity-100 pointer-events-auto"
      }`}
      style={{
        zIndex: 100000000,
        backgroundColor: "#000000",
        background: "#000000",
      }}
    >
      {/* Center Container: Official Logo + Blueprint Ring Assemble Loader */}
      <div className="flex flex-col items-center justify-center px-6">
        {/* Cinegem Studio Proper Logo */}
        <div className="relative flex items-center justify-center -mt-4 sm:-mt-6 md:-mt-8 -mb-6 sm:-mb-8 md:-mb-10">
          <img
            src="/Logo.png"
            alt="Cinegem Studio"
            className="w-48 sm:w-56 md:w-60 h-auto object-contain select-none pointer-events-none"
          />
        </div>

        {/* Blueprint Ring Assembly Loader + Progress Bar */}
        <RingAssembleLoader onAnimationComplete={handleAnimationComplete} />
      </div>
    </div>
  );
}

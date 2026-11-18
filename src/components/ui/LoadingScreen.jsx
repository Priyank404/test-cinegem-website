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
  const hasFinishedRef = useRef(false);

  // Detect static boot overlay in DOM from index.html (P0 static boot loader)
  const bootRef = useRef(typeof document !== "undefined" ? document.getElementById("cg-boot") : null);

  // Decision D2: The loading screen disappears the moment everything is ready
  useEffect(() => {
    if (!isLoading && !hasFinishedRef.current) {
      hasFinishedRef.current = true;
      const boot = bootRef.current || (typeof document !== "undefined" ? document.getElementById("cg-boot") : null);
      if (boot) {
        boot.classList.add("cg-boot--out");
        const timer = setTimeout(() => {
          boot.remove();
          setIsMounted(false);
          onFinished?.();
        }, 600);
        return () => clearTimeout(timer);
      } else {
        setIsFadingOut(true);
        const timer = setTimeout(() => {
          setIsMounted(false);
          onFinished?.();
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, onFinished]);

  // Safety fallback: if anything hangs after 10s, auto-dismiss so the user is never trapped
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (!hasFinishedRef.current) {
        hasFinishedRef.current = true;
        const boot = bootRef.current || (typeof document !== "undefined" ? document.getElementById("cg-boot") : null);
        if (boot) {
          boot.classList.add("cg-boot--out");
          setTimeout(() => {
            boot.remove();
            setIsMounted(false);
            onFinished?.();
          }, 600);
        } else {
          setIsFadingOut(true);
          setTimeout(() => {
            setIsMounted(false);
            onFinished?.();
          }, 600);
        }
      }
    }, 10000);
    return () => clearTimeout(safetyTimer);
  }, [onFinished]);

  // Update aria-valuenow on static boot element if present
  useEffect(() => {
    const boot = bootRef.current || (typeof document !== "undefined" ? document.getElementById("cg-boot") : null);
    if (boot) {
      boot.setAttribute("aria-valuenow", String(Math.round(progress)));
    }
  }, [progress]);

  const handleAnimationComplete = () => {
    // Keep callback for RingAssembleLoader compatibility
  };

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

  // If static boot overlay exists in DOM, React renders null to avoid animation restart or DOM flash
  if (bootRef.current || !isMounted) return null;

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
            width="1000"
            height="1000"
            fetchpriority="high"
            loading="eager"
            onError={(e) => { e.currentTarget.style.opacity = "0"; }}
            className="w-48 sm:w-56 md:w-60 h-auto object-contain select-none pointer-events-none"
          />
        </div>

        {/* Blueprint Ring Assembly Loader + Progress Bar */}
        <RingAssembleLoader onAnimationComplete={handleAnimationComplete} />
      </div>
    </div>
  );
}

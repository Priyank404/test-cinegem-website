// src/components/shared/FullScreenShowcase.jsx
// Full-screen edge-to-edge showcase component for Creative Visuals & On-Body Visualization.
// Spans 100vw and 100vh with dynamic video background matching, magnetic snapping, and optional parallax drift.
import { useState, useEffect, useRef } from "react";
import { isMediaVideo } from "@/utils/mediaPositioning";

// Tracks the true, scrollbar-safe viewport width
export function useViewportWidth() {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const update = () => setWidth(document.documentElement.clientWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return width;
}

// Intelligent background detector for showcase videos:
// Samples the video first frame to match video edges with the 100vw section background.
export function useVideoBgColor(src, customBg) {
  const [bgStyle, setBgStyle] = useState(() => {
    if (customBg) return customBg;
    if (!src) return "#141416";
    const lower = src.toLowerCase();
    if (
      lower.includes("m-video") ||
      lower.includes("white") ||
      lower.includes("wb") ||
      lower.includes("b4 animated") ||
      lower.includes("e commerce 1") ||
      lower.includes("fk-a1") ||
      lower.includes("s4")
    ) {
      return "#ffffff";
    }
    if (lower.includes("turntable") || lower.includes("black")) {
      return "linear-gradient(to bottom, #171717 0%, #131313 50%, #111111 100%)";
    }
    return "linear-gradient(to bottom, #171717 0%, #131313 50%, #111111 100%)";
  });

  useEffect(() => {
    if (customBg) {
      setBgStyle(customBg);
      return;
    }
    if (!src) return;

    const lower = src.toLowerCase();
    const isKnownWhite =
      lower.includes("m-video") ||
      lower.includes("white") ||
      lower.includes("wb") ||
      lower.includes("b4 animated") ||
      lower.includes("e commerce 1") ||
      lower.includes("fk-a1") ||
      lower.includes("s4");

    if (isKnownWhite) {
      setBgStyle("#ffffff");
      return;
    }

    if (lower.includes("turntable") || lower.includes("black")) {
      setBgStyle("linear-gradient(to bottom, #171717 0%, #131313 50%, #111111 100%)");
      return;
    }

    // Dynamic color sampling from video first frame via offscreen canvas
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.muted = true;
    v.playsInline = true;
    v.src = src;

    const onLoaded = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(v, 0, 0, 32, 32);

        // Sample top edge and bottom edge
        const topData = ctx.getImageData(16, 1, 1, 1).data;
        const btmData = ctx.getImageData(16, 30, 1, 1).data;

        const topLum = topData[0] * 0.299 + topData[1] * 0.587 + topData[2] * 0.114;
        if (topLum > 230) {
          setBgStyle("#ffffff");
        } else {
          const topRgb = `rgb(${topData[0]}, ${topData[1]}, ${topData[2]})`;
          const btmRgb = `rgb(${btmData[0]}, ${btmData[1]}, ${btmData[2]})`;
          setBgStyle(`linear-gradient(to bottom, ${topRgb} 0%, ${btmRgb} 100%)`);
        }
      } catch {
        // Fallback remains current style
      } finally {
        v.remove();
      }
    };

    v.addEventListener("loadeddata", onLoaded);
    v.load();
    return () => {
      v.removeEventListener("loadeddata", onLoaded);
      v.src = "";
    };
  }, [src, customBg]);

  return bgStyle;
}

export default function FullScreenShowcase({ src, media, driftUp = false, bgColor, onOpen }) {
  const activeMedia = media || { src, isVideo: isMediaVideo(src) };
  const trackRef = useRef(null);
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const vw = useViewportWidth();
  const bgStyle = useVideoBgColor(activeMedia?.src || src, bgColor);
  const isSnappingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const isVideo = isMediaVideo(activeMedia);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => {
      const rect = track.getBoundingClientRect();
      const vh = window.innerHeight;

      if (driftUp) {
        const total = rect.height - vh;
        if (total > 0) {
          const scrolled = -rect.top;
          const progress = Math.min(1, Math.max(0, scrolled / total));
          setOffset(progress * -40);
        }
      }

      // Magnetic snap: when the user stops scrolling close to top: 0, lock it flush
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        if (isSnappingRef.current) return;
        const currentRect = track.getBoundingClientRect();
        // If within magnetic lock zone (-60px to 120px)
        if (currentRect.top > -60 && currentRect.top < 120 && Math.abs(currentRect.top) > 2) {
          isSnappingRef.current = true;
          const targetScroll = window.scrollY + currentRect.top;
          window.scrollTo({
            top: targetScroll,
            behavior: "smooth",
          });
          setTimeout(() => {
            isSnappingRef.current = false;
          }, 500);
        }
      }, 80);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [driftUp]);

  if (!activeMedia?.src && !src) return null;

  return (
    <div
      ref={trackRef}
      className="fullscreen-video-track relative w-full"
      style={{
        height: "190vh",
        scrollSnapAlign: "start",
        scrollSnapStop: "normal",
      }}
    >
      <section
        ref={sectionRef}
        className="sticky top-0 w-screen min-h-screen h-screen flex items-center justify-center overflow-hidden my-0 z-20"
        style={{
          background: bgStyle,
          marginLeft: vw ? `calc(50% - ${vw / 2}px)` : undefined,
          marginRight: vw ? `calc(50% - ${vw / 2}px)` : undefined,
          width: vw ? `${vw}px` : "100vw",
          height: "100vh",
        }}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            src={activeMedia?.src || src}
            crossOrigin="anonymous"
            onClick={() => onOpen?.(activeMedia)}
            className="block w-full h-full max-h-screen max-w-full object-contain select-none cursor-pointer"
            style={{
              ...(driftUp ? { transform: `translateY(${offset}px)` } : {}),
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, black 2%, black 98%, transparent 100%)",
              maskImage:
                "linear-gradient(to right, transparent 0%, black 2%, black 98%, transparent 100%)",
            }}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        ) : (
          <img
            src={activeMedia?.thumb || activeMedia?.src || src}
            alt={activeMedia?.alt || "Cinegem Studio Showcase"}
            onClick={() => onOpen?.(activeMedia)}
            className="block w-full h-full max-h-screen max-w-full object-contain select-none cursor-pointer"
            style={{
              ...(driftUp ? { transform: `translateY(${offset}px)` } : {}),
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, black 2%, black 98%, transparent 100%)",
              maskImage:
                "linear-gradient(to right, transparent 0%, black 2%, black 98%, transparent 100%)",
            }}
          />
        )}
      </section>
    </div>
  );
}

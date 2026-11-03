// HeroSection.jsx
//
// Cinematic scroll-zoom hero, styled after motion.dev's "Scroll Zoom Hero"
// example (https://examples.motion.dev/react/scroll-zoom-hero) but built
// with GSAP + ScrollTrigger to match the rest of this codebase — no
// Framer/Motion for React involved.
//
// Fully self-contained: registers its own ScrollTrigger plugin and runs
// its own gsap.context/cleanup, so it can be dropped into any page without
// depending on a parent's animation setup.
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import TrailText from "@/components/shared/TrailText";
import { isMediaVideo } from "@/utils/mediaPositioning";

gsap.registerPlugin(ScrollTrigger);

export default function HeroSection({
  backgroundSrc = "",
  // Array of lines — each one trails in as its own line. Pass a different
  // array per page, e.g. ["Creative", "Images"].
  heading = ["Classic", "E-Commerce", "Visuals"],
  paragraph = "Premium product photography and cinematic videos crafted for luxury jewellery brands.",
}) {
  const heroRef = useRef(null);
  const bgRef = useRef(null);
  const contentRef = useRef(null);
  const [mediaFailed, setMediaFailed] = useState(false);

  const isVideo = isMediaVideo(backgroundSrc);

  useEffect(() => {
    if (backgroundSrc) {
      setMediaFailed(false);
    }
  }, [backgroundSrc]);

  useEffect(() => {
    // Respect reduced-motion preferences — show the finished (settled)
    // state as a static scene instead of scrubbing it.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap
        .timeline({
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true, // 1:1 with scroll position — no snapping, no lag
          },
        })
        // Background: slow zoom + rising blur/darken + slight upward drift.
        // scale/y are handled by GSAP's own transform engine (GPU-accelerated
        // translate3d/scale under the hood); `filter` is a single tween with
        // two functions — GSAP interpolates every number embedded in the
        // string positionally, so blur and brightness animate together in
        // one tween without needing a filter plugin.
        .fromTo(
          bgRef.current,
          { scale: 1, y: 0, filter: "blur(0px) brightness(1)" },
          {
            scale: 1.45,
            y: -60,
            filter: "blur(18px) brightness(0.65)",
            ease: "none",
          },
          0,
        )
        // Copy: fades/rises/scales down slightly as the image takes over.
        .fromTo(
          contentRef.current,
          { opacity: 1, y: 0, scale: 1 },
          { opacity: 0, y: -60, scale: 0.92, ease: "none" },
          0,
        );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative z-10 w-full h-[100svh] min-h-[480px] -mt-20 overflow-hidden bg-[#0d0d0d]"
    >
      {/* Background media (image or video) — clean natural display without extra dark gradient veil */}
      {!mediaFailed && backgroundSrc ? (
        isVideo ? (
          <video
            ref={bgRef}
            src={backgroundSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onError={() => {
              if (backgroundSrc) setMediaFailed(true);
            }}
            className="absolute inset-0 w-full h-full object-cover will-change-transform [transform:translateZ(0)] transition-opacity duration-500 ease-out"
          />
        ) : (
          <img
            ref={bgRef}
            src={backgroundSrc}
            alt=""
            onError={() => {
              if (backgroundSrc) setMediaFailed(true);
            }}
            className="absolute inset-0 w-full h-full object-cover will-change-transform [transform:translateZ(0)]"
          />
        )
      ) : (
        <div
          ref={bgRef}
          className="absolute inset-0 w-full h-full bg-[#0d0d0d] will-change-transform [transform:translateZ(0)]"
        />
      )}

      {/* Content — pinned to the bottom-left at every breakpoint, never
          centered. */}
      <div
        ref={contentRef}
        className="
          absolute z-10 will-change-transform
          left-6 bottom-8
          md:left-[6%] md:bottom-[6%]
          lg:left-[8%] lg:bottom-[8%]
          max-w-[88%] sm:max-w-md md:max-w-lg lg:max-w-xl
        "
      >
        <TrailText
          as="h1"
          itemAs="div"
          open={true}
          splitBy="lines"
          className="font-[Poppins] font-semibold text-white leading-[1.05] text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-4 md:mb-5 drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
        >
          {heading}
        </TrailText>

        <TrailText
          as="p"
          itemAs="span"
          open={true}
          splitBy="words"
          delay={300}
          className="font-[Poppins] font-light text-white/90 text-sm sm:text-base leading-relaxed max-w-md drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)]"
        >
          {paragraph}
        </TrailText>
      </div>
    </section>
  );
}

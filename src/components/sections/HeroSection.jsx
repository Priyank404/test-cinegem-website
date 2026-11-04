// HeroSection.jsx
//
// Cinematic scroll-zoom hero with independent per-page text color support.
// An interactive floating panel allows the user to test hex values, pick colors,
// and copy configurations in real time independently for each page.
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import TrailText from "@/components/shared/TrailText";
import { isMediaVideo } from "@/utils/mediaPositioning";
import { getSavedHeroColors, getPageKey } from "@/components/ui/HeroColorTuner";

gsap.registerPlugin(ScrollTrigger);

export default function HeroSection({
  backgroundSrc = "",
  heading = ["Classic", "E-Commerce", "Visuals"],
  paragraph = "Premium product photography and cinematic videos crafted for luxury jewellery brands.",
  pageKey,
}) {
  const location = useLocation();
  const currentPageKey = pageKey || getPageKey(location?.pathname);
  const heroRef = useRef(null);
  const bgRef = useRef(null);
  const contentRef = useRef(null);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [colors, setColors] = useState(() => getSavedHeroColors(currentPageKey));

  const resolvedSrc = typeof backgroundSrc === "object" ? (backgroundSrc?.full || backgroundSrc?.src || "") : backgroundSrc;
  const isVideo = isMediaVideo(backgroundSrc || resolvedSrc);

  useEffect(() => {
    if (resolvedSrc) {
      setMediaFailed(false);
    }
  }, [resolvedSrc]);

  // Synchronize colors when navigating to a different page
  useEffect(() => {
    setColors(getSavedHeroColors(currentPageKey));
  }, [currentPageKey]);

  // Synchronize live color updates for this specific page
  useEffect(() => {
    const onColorChange = (e) => {
      if (e.detail && (!e.detail.pageKey || e.detail.pageKey === currentPageKey)) {
        setColors({
          heading: e.detail.heading,
          paragraph: e.detail.paragraph,
          shadow: e.detail.shadow,
        });
      }
    };
    window.addEventListener("hero-color-change", onColorChange);
    return () => window.removeEventListener("hero-color-change", onColorChange);
  }, [currentPageKey]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap
        .timeline({
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        })
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
      {/* Background media (image or video) */}
      {!mediaFailed && resolvedSrc ? (
        isVideo ? (
          <video
            ref={bgRef}
            src={resolvedSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onError={() => {
              if (resolvedSrc) setMediaFailed(true);
            }}
            className="absolute inset-0 w-full h-full object-cover will-change-transform [transform:translateZ(0)] transition-opacity duration-500 ease-out"
          />
        ) : (
          <img
            ref={bgRef}
            src={resolvedSrc}
            alt=""
            crossOrigin="anonymous"
            onError={() => {
              if (resolvedSrc) setMediaFailed(true);
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

      {/* Content — pinned to the bottom-left */}
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
          className="font-[Poppins] font-semibold leading-[1.05] text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-4 md:mb-5 transition-colors duration-300"
          style={{
            color: colors.heading,
            textShadow: colors.shadow !== "none" ? colors.shadow : undefined,
          }}
        >
          {heading}
        </TrailText>

        <TrailText
          as="p"
          itemAs="span"
          open={true}
          splitBy="words"
          delay={300}
          className="font-[Poppins] font-normal text-sm sm:text-base leading-relaxed max-w-md transition-colors duration-300"
          style={{
            color: colors.paragraph,
            textShadow: colors.shadow !== "none" ? colors.shadow : undefined,
          }}
        >
          {paragraph}
        </TrailText>
      </div>
    </section>
  );
}

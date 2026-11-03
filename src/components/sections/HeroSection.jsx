// HeroSection.jsx
//
// Cinematic scroll-zoom hero with intelligent automatic contrast adaptation.
// When the hero media has a white/light background (e.g. Classic E-Commerce),
// the text adapts to a refined whitish-silver grey palette (#858890 / #555860) so it
// never blends with white while avoiding harsh black.
// When the background is dark (e.g. Creative Visuals), it adapts to crisp white (#FCFBFA).
// An explicit `theme` prop ('dark-text' | 'light-text' | 'auto') can also be passed.
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import TrailText from "@/components/shared/TrailText";
import { isMediaVideo } from "@/utils/mediaPositioning";

gsap.registerPlugin(ScrollTrigger);

export default function HeroSection({
  backgroundSrc = "",
  heading = ["Classic", "E-Commerce", "Visuals"],
  paragraph = "Premium product photography and cinematic videos crafted for luxury jewellery brands.",
  // theme: 'auto' | 'dark-text' (whitish-silver grey for light backgrounds) | 'light-text' (crisp white for dark backgrounds)
  theme = "auto",
}) {
  const heroRef = useRef(null);
  const bgRef = useRef(null);
  const contentRef = useRef(null);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [detectedDarkText, setDetectedDarkText] = useState(false);

  const isVideo = isMediaVideo(backgroundSrc);

  useEffect(() => {
    if (backgroundSrc) {
      setMediaFailed(false);
    }
  }, [backgroundSrc]);

  // Automatic luminance sampling in the bottom-left corner where text sits
  useEffect(() => {
    if (theme !== "auto" || !backgroundSrc || isVideo) return;

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = backgroundSrc;
    img.onload = () => {
      if (!isMounted) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Sample the bottom-left region of the image
        const sx = 0;
        const sy = Math.floor(img.naturalHeight * 0.6);
        const sw = Math.floor(img.naturalWidth * 0.5);
        const sh = Math.floor(img.naturalHeight * 0.4);

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 16, 16);
        const imgData = ctx.getImageData(0, 0, 16, 16).data;
        let totalL = 0;
        for (let i = 0; i < imgData.length; i += 4) {
          totalL +=
            0.299 * imgData[i] +
            0.587 * imgData[i + 1] +
            0.114 * imgData[i + 2];
        }
        const avgL = totalL / (imgData.length / 4);
        // If average luminance in bottom-left > 130, background is light -> use silver grey text
        setDetectedDarkText(avgL > 130);
      } catch {
        // Fallback gracefully
      }
    };

    return () => {
      isMounted = false;
    };
  }, [backgroundSrc, theme, isVideo]);

  const isDarkText =
    theme === "dark-text" || (theme === "auto" && detectedDarkText);

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
            crossOrigin="anonymous"
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
          className={`font-[Poppins] font-semibold leading-[1.05] text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-4 md:mb-5 transition-colors duration-300 ${
            isDarkText
              ? "text-[#858890]"
              : "text-[#FCFBFA] drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]"
          }`}
        >
          {heading}
        </TrailText>

        <TrailText
          as="p"
          itemAs="span"
          open={true}
          splitBy="words"
          delay={300}
          className={`font-[Poppins] font-normal text-sm sm:text-base leading-relaxed max-w-md transition-colors duration-300 ${
            isDarkText
              ? "text-[#555860]"
              : "text-[#FCFBFA]/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)]"
          }`}
        >
          {paragraph}
        </TrailText>
      </div>
    </section>
  );
}

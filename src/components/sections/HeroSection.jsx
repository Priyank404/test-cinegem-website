// HeroSection.jsx
//
// Cinematic scroll-zoom hero with independent per-page text color styling.
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import TrailText from "@/components/shared/TrailText";
import { isMediaVideo } from "@/utils/mediaPositioning";

gsap.registerPlugin(ScrollTrigger);

const DEFAULT_HEADING_COLOR = "#FCFBFA";
const DEFAULT_PARAGRAPH_COLOR = "#E0E0E0";
const DEFAULT_SHADOW = "none";

function getPageKey(pathname = "") {
  let path = pathname;
  if (!path && typeof window !== "undefined") {
    path = window.location.pathname;
  }
  const clean = (path || "").toLowerCase().replace(/^\/|\/$/g, "");
  return clean || "home";
}

function getHeroColors(pageKey, propHeading, propParagraph, propShadow) {
  if (propHeading || propParagraph) {
    return {
      heading: propHeading || DEFAULT_HEADING_COLOR,
      paragraph: propParagraph || DEFAULT_PARAGRAPH_COLOR,
      shadow: propShadow || DEFAULT_SHADOW,
    };
  }
  if (typeof window === "undefined") {
    return {
      heading: DEFAULT_HEADING_COLOR,
      paragraph: DEFAULT_PARAGRAPH_COLOR,
      shadow: DEFAULT_SHADOW,
    };
  }
  const key = pageKey || getPageKey();
  const heading =
    localStorage.getItem(`cinegem_hero_heading_${key}`) ||
    localStorage.getItem("cinegem_hero_heading_color") ||
    DEFAULT_HEADING_COLOR;
  const paragraph =
    localStorage.getItem(`cinegem_hero_paragraph_${key}`) ||
    localStorage.getItem("cinegem_hero_paragraph_color") ||
    DEFAULT_PARAGRAPH_COLOR;
  const shadow =
    localStorage.getItem(`cinegem_hero_shadow_${key}`) ||
    localStorage.getItem("cinegem_hero_shadow") ||
    DEFAULT_SHADOW;

  return { heading, paragraph, shadow };
}

export default function HeroSection({
  backgroundSrc = "",
  heading = ["Classic", "E-Commerce", "Visuals"],
  paragraph = "Premium product photography and cinematic videos crafted for luxury jewellery brands.",
  pageKey,
  headingColor,
  paragraphColor,
  textShadow,
}) {
  const location = useLocation();
  const currentPageKey = pageKey || getPageKey(location?.pathname);
  const heroRef = useRef(null);
  const bgRef = useRef(null);
  const contentRef = useRef(null);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [colors, setColors] = useState(() =>
    getHeroColors(currentPageKey, headingColor, paragraphColor, textShadow)
  );

  const resolvedSrc = typeof backgroundSrc === "object" ? (backgroundSrc?.full || backgroundSrc?.src || "") : backgroundSrc;
  const isVideo = isMediaVideo(backgroundSrc || resolvedSrc);

  useEffect(() => {
    if (resolvedSrc) {
      setMediaFailed(false);
    }
  }, [resolvedSrc]);

  // Synchronize colors when navigating to a different page
  useEffect(() => {
    setColors(getHeroColors(currentPageKey, headingColor, paragraphColor, textShadow));
  }, [currentPageKey, headingColor, paragraphColor, textShadow]);

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

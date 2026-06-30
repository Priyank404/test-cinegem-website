// ClassicEComVisuals.jsx
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ServicePageLayout } from "@/components/shared/ServicePageLayout";
import { BackToVault } from "@/components/shared/BackToVault";
import Silk from "@/components/three/Silk";

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════════════════════ */

const section1Images = [
  { src: "/1.png", alt: "Front view", label: "Front" },
  { src: "/2.png", alt: "Side view", label: "Side" },
  { src: "/3.png", alt: "Angle view", label: "Angle" },
  { src: "/4.png", alt: "Detail view", label: "Detail" },
];

const section2Images = [
  { src: "/5.png", alt: "Front view", label: "Front" },
  { src: "/6.png", alt: "Side view", label: "Side" },
  { src: "/7.png", alt: "Angle view", label: "Angle" },
  { src: "/8.png", alt: "Detail view", label: "Detail" },
];

const section3Images = [
  { src: "/9.png", alt: "Front view", label: "Front" },
  { src: "/10.png", alt: "Side view", label: "Side" },
  { src: "/11.png", alt: "Detail view", label: "Detail" },
  { src: "/12.png", alt: "Macro view", label: "Macro" },
];

/* ═══════════════════════════════════════════════════════════════════════
   PRIMITIVES
═══════════════════════════════════════════════════════════════════════ */

function ImageTile({ img, className = "" }) {
  return (
    <div
      className={`
        reveal-right
        relative overflow-hidden bg-[#FAF9F6]
        border border-[#c4c7c7]/40 gallery-shadow
        hover:-translate-y-1 transition-transform duration-300
        ${className}
      `}
    >
      <img src={img.src} alt={img.alt} className="w-full h-full object-cover" />
      <span
        className="
          absolute bottom-2 left-2
          font-[Manrope] text-[9px] tracking-[0.15em] font-semibold uppercase
          px-2 py-1 bg-white/80 text-[#444748]
        "
      >
        {img.label}
      </span>
    </div>
  );
}

function VideoPlayer({ videoSrc, className = "" }) {
  return (
    <div
      className={`
        reveal-right
        relative flex items-center justify-center
        bg-[#0d0d0d] overflow-hidden border border-[#c4c7c7]/20
        ${className}
      `}
    >
      {videoSrc ? (
        <video
          src={videoSrc}
          className="absolute inset-0 w-full h-full object-cover"
          controls
          controlsList="nodownload noplaybackrate nofullscreen"
          disablePictureInPicture
          playsInline
        />
      ) : (
        <button
          aria-label="Play product video"
          className="w-14 h-14 border border-white/60 bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
        >
          <svg
            className="w-6 h-6 text-white ml-1"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 1 — Video (left) + 2×2 grid (right)
   Centered in exactly one viewport on load (no snap, no forced cutoff —
   just a min-h block tall enough to fill the screen below the 80px
   fixed header, with its content vertically centered inside it).
   Mobile: video on top, grid stacked below.
═══════════════════════════════════════════════════════════════════════ */

function Section1({ images, videoSrc }) {
  return (
    <section
      className="w-full flex items-center justify-center px-4 sm:px-6 lg:px-10"
      style={{ minHeight: "calc(100vh - 80px)" }}
    >
      <div className="w-full max-w-[1800px] mx-auto">
        {/* MOBILE (<lg) */}
        <div className="flex flex-col gap-4 lg:hidden">
          <VideoPlayer videoSrc={videoSrc} className="w-full aspect-[4/5]" />
          <div className="grid grid-cols-2 gap-3 aspect-square">
            {images.map((img, i) => (
              <ImageTile key={i} img={img} />
            ))}
          </div>
        </div>

        {/* DESKTOP (lg+) — grid is a height-driven square block
            (h-full aspect-square) so cells stay square instead of being
            stretched/squashed by section height. */}
        <div className="hidden lg:flex flex-row gap-8 items-center justify-center h-[75vh]">
          <VideoPlayer videoSrc={videoSrc} className="flex-1 h-full" />
          <div className="h-full aspect-square max-w-[44%] grid grid-cols-2 gap-4 shrink-0">
            {images.map((img, i) => (
              <ImageTile key={i} img={img} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 2 — 4-image row (top) + video strip (below)
   Normal scroll, no forced height. Mobile: swipeable filmstrip + video —
   visually distinct from Section 1's stack.
═══════════════════════════════════════════════════════════════════════ */

function Section2({ images, videoSrc }) {
  return (
    <section className="w-full px-4 sm:px-6 lg:px-10 py-16 md:py-24">
      <div className="w-full max-w-[1800px] mx-auto">
        {/* MOBILE */}
        <div className="flex flex-col gap-4 lg:hidden">
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1">
            {images.map((img, i) => (
              <div
                key={i}
                className="shrink-0 w-[60%] sm:w-[40%] aspect-square snap-start"
              >
                <ImageTile img={img} className="w-full h-full" />
              </div>
            ))}
          </div>
          <VideoPlayer videoSrc={videoSrc} className="w-full aspect-[16/10]" />
        </div>

        {/* DESKTOP — 4 equal square tiles in a row, video strip below */}
        <div className="hidden lg:flex flex-col gap-6">
          <div className="flex gap-4 justify-center">
            {images.map((img, i) => (
              <ImageTile key={i} img={img} className="flex-1 aspect-square" />
            ))}
          </div>
          <VideoPlayer videoSrc={videoSrc} className="w-full aspect-[21/9]" />
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 3 — Portrait video (left) + 2×2 grid (right), pendant layout
   Mobile: asymmetric hero — 1 big image, video, 3 thumbnails. Distinct
   from both Section 1 (stack) and Section 2 (filmstrip).
═══════════════════════════════════════════════════════════════════════ */

function Section3({ images, videoSrc }) {
  const [hero, img2, img3, img4] = images;

  return (
    <section className="w-full px-4 sm:px-6 lg:px-10 py-16 md:py-24">
      <div className="w-full max-w-[1800px] mx-auto">
        {/* MOBILE — hero image, then video, then a row of remaining thumbnails */}
        <div className="flex flex-col gap-3 lg:hidden">
          <ImageTile img={hero} className="w-full aspect-[4/3]" />
          <VideoPlayer videoSrc={videoSrc} className="w-full aspect-[4/5]" />
          <div className="flex gap-3">
            {[img2, img3, img4].map((img, i) => (
              <ImageTile key={i} img={img} className="flex-1 aspect-square" />
            ))}
          </div>
        </div>

        {/* DESKTOP — single row, 5 columns: image, image, video (center,
            emphasized), image, image. All height-driven (h-full) off the
            same row height so nothing stretches unevenly; the video gets
            a wider aspect ratio than the square tiles so it reads as the
            focal point without breaking the shared-height row. */}
        <div className="hidden lg:flex flex-row gap-4 items-stretch justify-center h-[70vh]">
          <ImageTile img={hero} className="h-full aspect-square" />
          <ImageTile img={img2} className="h-full aspect-square" />
          <VideoPlayer videoSrc={videoSrc} className="h-full aspect-[5/4]" />
          <ImageTile img={img3} className="h-full aspect-square" />
          <ImageTile img={img4} className="h-full aspect-square" />
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════ */

export default function ClassicEComVisuals({
  videoSrc1 = "https://drive.google.com/file/d/1LZSD2xmhrvFbRs4xDnipktbywr3lyHYs/view?usp=sharing",
  videoSrc2 = "https://drive.google.com/file/d/1LZSD2xmhrvFbRs4xDnipktbywr3lyHYs/view?usp=sharing",
  videoSrc3 = "https://drive.google.com/file/d/1LZSD2xmhrvFbRs4xDnipktbywr3lyHYs/view?usp=sharing",
  title = "Classic E-Commerce Visuals",
  eyebrow = "Product Showcase",
}) {
  const containerRef = useRef(null);
  const [silkOn, setSilkOn] = useState(true);

  // Each section's cards/video animate independently of every other
  // section, bound only to that section's own "top 85%" line:
  //   • scrolling down past it  -> cards slide in from the RIGHT
  //   • scrolling back UP past it -> cards slide back out to the RIGHT
  //     (same side, simply reversed — only fires on upward scroll)
  // Scrolling further down past a section, or scrolling up into a
  // section you haven't reached yet, does nothing ("none") — so there's
  // no way for one section's trigger to act on another section.
  useEffect(() => {
    const ctx = gsap.context(() => {
      const sections = gsap.utils.toArray("section", containerRef.current);

      sections.forEach((section) => {
        // Mobile + desktop variants both exist in the DOM at once
        // (Tailwind just toggles `hidden`), so only animate the ones
        // actually visible at this breakpoint.
        const cards = gsap
          .utils.toArray(".reveal-right", section)
          .filter((el) => el.offsetParent !== null);

        if (!cards.length) return;

        gsap.fromTo(
          cards,
          {
            opacity: 0,
            x: 120,
            filter: "blur(8px)",
            // Tiles carry a CSS `transition-transform` (hover lift).
            // Left on, the browser CSS-transitions every GSAP-driven
            // transform frame on top of GSAP's own easing — two
            // engines fighting over the same property — causing
            // stepped, jerky motion. Kill it for the tween, hand it
            // back after via clearProps.
            transition: "none",
            willChange: "transform, opacity, filter",
          },
          {
            opacity: 1,
            x: 0,
            filter: "blur(0px)",
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.07,
            clearProps: "transform,filter,transition,willChange",
            scrollTrigger: {
              trigger: section,
              start: "top 85%",
              // enter / leave / enterBack / leaveBack
              toggleActions: "play none none reverse",
            },
          }
        );
      });

      // Section heights can shift slightly once images finish loading,
      // which drifts trigger positions (most noticeable on later
      // sections). Recalculate once everything has settled.
      const refreshId = window.setTimeout(() => ScrollTrigger.refresh(), 300);
      return () => window.clearTimeout(refreshId);
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <ServicePageLayout title={title} currentPage="/classic" fullBleed>
      {/* Fixed, full-viewport Silk background — sits behind page content,
          doesn't scroll, never intercepts clicks/scroll.
          IMPORTANT: z-0, not a negative z-index. ServicePageLayout's
          root div doesn't establish its own stacking context, so a
          negative z-index here would paint BEHIND that div's own
          background instead of just behind the content — i.e. fully
          hidden. z-0 + the content wrapper's z-10 is enough to order
          them correctly without that trap. */}
      {silkOn && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <Silk speed={10} scale={1} color="#633c3c" noiseIntensity={2} rotation={0} />
        </div>
      )}

      {/* Silk on/off toggle */}
      <button
        onClick={() => setSilkOn((v) => !v)}
        className="
          fixed bottom-6 right-6 z-50
          font-[Manrope] text-[11px] tracking-[0.15em] font-semibold uppercase
          px-4 py-2.5
          bg-[#121212] text-[#FAF9F6] hover:bg-[#C5A059]
          border border-white/10 shadow-lg
          transition-colors duration-300
        "
      >
        Silk: {silkOn ? "On" : "Off"}
      </button>

      <div ref={containerRef} className="relative z-10">
        <Section1 images={section1Images} videoSrc={videoSrc1} />
        <Section2 images={section2Images} videoSrc={videoSrc2} />
        <Section3 images={section3Images} videoSrc={videoSrc3} />
      </div>
    </ServicePageLayout>
  );
}
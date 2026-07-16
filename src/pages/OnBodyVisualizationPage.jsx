// OnBodyVisualizationPage.jsx
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ServicePageLayout } from "@/components/shared/ServicePageLayout";
import HeroSection from "@/components/sections/HeroSection";

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════════════
   DATA
   Placeholder paths for now — drop real files into /public and swap the
   src values below (or wire this up to /constants/gallery.js). Add as
   many entries as needed; the layout below packs them automatically no
   matter how many images are in this array.
═══════════════════════════════════════════════════════════════════════ */

const galleryImages = [
  { src: "1.png", alt: "On-body visualization" },
  { src: "2.png", alt: "On-body visualization" },
  { src: "3.png", alt: "On-body visualization" },
  { src: "4.png", alt: "On-body visualization" },
  { src: "Band Ring With Enamel Marquise-Y-V1_2560x3840.jpg", alt: "On-body visualization" },
  { src: "G7P25CLACRAW0113D00-TZPDP00005-14Y-V4-WB.png", alt: "On-body visualization" },
  { src: "cinegem jewellery.png", alt: "On-body visualization" },
  { src: "1.png", alt: "On-body visualization" },
  { src: "2.png", alt: "On-body visualization" },
  { src: "3.png", alt: "On-body visualization" },
  { src: "4.png", alt: "On-body visualization" },
  { src: "5.jpg", alt: "On-body visualization" },
    { src: "6.jpg", alt: "On-body visualization" },

];

const GAP = 20; // px, both the column gutter and the vertical gap between tiles

// A column's width scales continuously with the viewport instead of
// staying fixed — narrow on phones, noticeably larger on desktop —
// so there's no single hardcoded size and no breakpoint jump. Read as
// "never below 280px, never above 620px, otherwise ~30% of viewport
// width." Raise the max (620px) if you want desktop tiles even bigger,
// or the middle value (30vw) to change how quickly it grows.
const COLUMN_WIDTH = "clamp(280px, 30vw, 620px)";

/* Used only until an image's real aspect ratio is known (first paint /
   before the browser has decoded it), so tiles don't pop/resize once
   the real ratio arrives. */
const FALLBACK_AR = 0.8;

/* ═══════════════════════════════════════════════════════════════════════
   ASPECT RATIO DETECTION
   Loads every image once, off-DOM, purely to read naturalWidth/
   naturalHeight. This is what makes each tile's row-height exactly
   match that image's own proportions (via CSS aspect-ratio below)
   instead of a fixed/cropped box.
═══════════════════════════════════════════════════════════════════════ */

function useAspectRatios(images) {
  const [ratios, setRatios] = useState({});

  useEffect(() => {
    let cancelled = false;

    images.forEach(({ src }) => {
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        setRatios((prev) =>
          prev[src] ? prev : { ...prev, [src]: img.naturalWidth / img.naturalHeight }
        );
      };
      img.onerror = () => {
        if (cancelled) return;
        setRatios((prev) => (prev[src] ? prev : { ...prev, [src]: FALLBACK_AR }));
      };
      img.src = src;
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  return ratios;
}

/* ═══════════════════════════════════════════════════════════════════════
   PRIMITIVES
═══════════════════════════════════════════════════════════════════════ */

function Tile({ img, aspectRatio }) {
  return (
    <div
      className="
        reveal-right
        w-full mb-4
      "
      style={{ breakInside: "avoid", marginBottom: GAP }}
    >
      {/* The box's height is never set in px — it's derived purely from
          this image's own width:height ratio via the aspect-ratio
          property, scaled to whatever width the column ends up at.
          object-cover is just a safety net for sub-pixel rounding;
          nothing is ever visibly cropped since the box IS the image's
          own ratio. */}
      <div
        className="
          relative overflow-hidden bg-[#FAF9F6]
          border border-[#c4c7c7]/40 gallery-shadow
          hover:-translate-y-1 transition-transform duration-300
        "
        style={{ aspectRatio }}
      >
        <img
          src={img.src}
          alt={img.alt}
          loading="lazy"
          decoding="async"
          className="block w-full h-full object-cover object-center"
          style={{ transform: "translateZ(0)", backfaceVisibility: "hidden" }}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ON-BODY GALLERY
   Column count is set by the browser: CSS `columns` fits as many
   COLUMN_WIDTH-wide columns as the container allows and stretches them
   evenly. Since COLUMN_WIDTH itself grows with the viewport (see the
   clamp() above), desktop naturally lands on fewer, bigger columns
   instead of the same tile size just repeated more times. All of this
   reflows on resize with no breakpoints or JS width tracking needed.
   Each tile's row-height is set by that image's own
   aspect ratio (see Tile above), so tiles are never a fixed size —
   tall images take a tall row, wide images take a short one.

   Note: multi-column CSS fills top-to-bottom within a column before
   starting the next column (this is how masonry/Pinterest-style grids
   work), not strict left-to-right reading order. Say the word if you'd
   rather have strict row-major order — that needs a small JS
   shortest-column-first placement pass instead of pure CSS.
═══════════════════════════════════════════════════════════════════════ */

function OnBodyGallery({ images }) {
  const ratios = useAspectRatios(images);

  return (
    <section className="w-full px-4 sm:px-6 md:px-8 lg:px-10 py-16 md:py-24">
      <div
        className="w-full max-w-[1800px] mx-auto"
        style={{ columnWidth: COLUMN_WIDTH, columnGap: GAP }}
      >
        {images.map((img, i) => (
          <Tile
            key={`${img.src}-${i}`}
            img={img}
            aspectRatio={ratios[img.src] ?? FALLBACK_AR}
          />
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════ */

export default function OnBodyVisualizationPage() {
  const containerRef = useRef(null);

  // Same reveal-on-scroll behavior as before: cards slide in from the
  // right as the section enters view, reverse out to the right on
  // scroll-up, and do nothing otherwise.
  useEffect(() => {
    const ctx = gsap.context(() => {
      const sections = gsap.utils.toArray("section", containerRef.current);

      sections.forEach((section) => {
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
              toggleActions: "play none none reverse",
            },
          }
        );
      });

      const refreshId = window.setTimeout(() => ScrollTrigger.refresh(), 300);
      return () => window.clearTimeout(refreshId);
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <ServicePageLayout title="On-Body Visualization" currentPage="/onbody" fullBleed>
      <HeroSection
        backgroundSrc="/onbody-1.png"
        heading={["On-Body", "Visualization"]}
        paragraph="Photorealistic on-model composites that place your pieces in context — without a single photoshoot. Effortless, scalable, and skin-accurate."
      />

      <div ref={containerRef} className="relative z-10">
        <OnBodyGallery images={galleryImages} />
      </div>
    </ServicePageLayout>
  );
}
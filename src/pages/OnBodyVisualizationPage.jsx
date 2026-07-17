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
    { src: "7.jpg", alt: "On-body visualization" },
        { src: "5.jpg", alt: "On-body visualization" },


  
];

/* Used only until an image's real dimensions are known (first paint /
   before the browser has decoded it). Picked to roughly match typical
   product-photo portrait framing so there's minimal layout jump once
   the real ratio swaps in. */
const FALLBACK_AR = 0.8;

const GAP = 16; // px

/* ═══════════════════════════════════════════════════════════════════════
   ASPECT RATIO DETECTION
   Loads every image once, off-DOM, purely to read naturalWidth/
   naturalHeight. Results are cached in state keyed by src so re-renders
   don't re-fetch. This is what lets grid cells size themselves to the
   actual image instead of being letterboxed/cropped into a fixed box.
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

function arOf(img, ratios) {
  return ratios[img.src] ?? FALLBACK_AR;
}

/* ═══════════════════════════════════════════════════════════════════════
   PRIMITIVES
═══════════════════════════════════════════════════════════════════════ */

function Tile({ img, style }) {
  return (
    <div
      className="
        reveal-right
        relative overflow-hidden bg-[#FAF9F6]
        border border-[#c4c7c7]/40 gallery-shadow
        hover:-translate-y-1 transition-transform duration-300
      "
      style={style}
    >
      {/* The div above carries the image's own aspect ratio via the
          flexGrow math in Row below, so object-cover here is just a
          safety net for sub-pixel rounding — in practice nothing is
          visibly cropped.

          The styles on the <img> fix a well-known browser bug where
          CSS-downscaled images get rendered through a blurry
          compositing pass: forcing the image onto its own GPU layer
          (translateZ/backface-visibility) makes the browser rasterize
          it sharply at its real displayed size instead of guessing. */}
      <img
        src={img.src}
        alt={img.alt}
        decoding="async"
        className="block w-full h-full object-cover object-center"
        style={{
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
          imageRendering: "auto",
        }}
      />
    </div>
  );
}

/* A horizontal strip of one or more images that fills the full row
   width. Every image gets flexGrow = its own real aspect ratio,
   flexBasis 0 — flexbox then distributes width proportionally to
   aspect ratio. The row container's own CSS `aspect-ratio` is set to
   the SUM of the image ratios, which makes the row's height come out
   to exactly `rowWidth / totalAR`.

   Put together, each image's rendered width/height ends up matching
   its own real aspect ratio exactly — driven entirely by the images
   themselves, with no fixed pixel sizes anywhere and no JS-computed
   float dimensions (the browser's own flexbox/aspect-ratio engine
   handles the sub-pixel math natively, which renders crisper than
   hand-rounded JS pixel values). */
function Row({ items, ratios }) {
  const slots = items.filter(Boolean);
  if (!slots.length) return null;

  const totalAR = slots.reduce((sum, img) => sum + arOf(img, ratios), 0);

  return (
    <div className="flex w-full" style={{ gap: GAP, aspectRatio: totalAR || 1 }}>
      {slots.map((img, i) => (
        <Tile
          key={`${img.src}-${i}`}
          img={img}
          style={{ flexGrow: arOf(img, ratios), flexBasis: 0, minWidth: 0 }}
        />
      ))}
    </div>
  );
}

/* Splits `images` into groups of `size`, in order, with no wrapping —
   the last group just gets whatever images are left over. Nothing
   from earlier in the array gets reused/repeated to pad it out. */
function chunk(images, size) {
  const chunks = [];
  for (let i = 0; i < images.length; i += size) {
    chunks.push(images.slice(i, i + size));
  }
  return chunks;
}

/* ═══════════════════════════════════════════════════════════════════════
   ON-BODY GALLERY — reference-matched bento layout:
     • Mobile  (<768px)     — single column, 6 images/block
     • Tablet  (768–1023px) — 4 images/block: hero, pair, hero
     • Desktop (≥1024px)    — 7 images/block: hero row of 2, mid row of
                               3, hero row of 2
   All three read from the same flat `galleryImages` array — only the
   grouping changes per breakpoint (Tailwind toggles which block is
   visible). No row/tile size is ever hardcoded — every Row sizes
   itself from the real images inside it (see Row above), so the
   groupings below are only about WHICH images go together, not how
   big they render.
═══════════════════════════════════════════════════════════════════════ */

function MobileBlock({ images, ratios }) {
  const [a, b, c1, c2, d, e] = images;
  const rows = [[a], [b], [c1, c2], [d], [e]].filter((r) => r.some(Boolean));

  return (
    <div className="flex md:hidden flex-col" style={{ gap: GAP }}>
      {rows.map((items, i) => (
        <Row key={i} items={items} ratios={ratios} />
      ))}
    </div>
  );
}

function TabletBlock({ images, ratios }) {
  const [a, b, c, d] = images;
  const rows = [[a], [b, c], [d]].filter((r) => r.some(Boolean));

  return (
    <div className="hidden md:flex lg:hidden flex-col" style={{ gap: GAP }}>
      {rows.map((items, i) => (
        <Row key={i} items={items} ratios={ratios} />
      ))}
    </div>
  );
}

function DesktopBlock({ images, ratios }) {
  const [a, b, c, d, e, f, g] = images;
  const rows = [[a, b], [c, d, e], [f, g]].filter((r) => r.some(Boolean));

  return (
    <div className="hidden lg:flex flex-col" style={{ gap: GAP }}>
      {rows.map((items, i) => (
        <Row key={i} items={items} ratios={ratios} />
      ))}
    </div>
  );
}

function OnBodyGallery({ images }) {
  const ratios = useAspectRatios(images);
  const mobileChunks = chunk(images, 6);
  const tabletChunks = chunk(images, 7);
  const desktopChunks = chunk(images, 7);

  return (
    <section className="w-full px-4 sm:px-6 md:px-8 lg:px-10 py-16 md:py-24">
      <div className="w-full max-w-[1800px] mx-auto flex flex-col" style={{ gap: GAP }}>
        {mobileChunks.map((c, i) => (
          <MobileBlock key={`m-${i}`} images={c} ratios={ratios} />
        ))}
        {tabletChunks.map((c, i) => (
          <TabletBlock key={`t-${i}`} images={c} ratios={ratios} />
        ))}
        {desktopChunks.map((c, i) => (
          <DesktopBlock key={`d-${i}`} images={c} ratios={ratios} />
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

  // Same reveal-on-scroll behavior as ClassicEComVisuals: cards slide
  // in from the right as the section enters view, reverse out to the
  // right on scroll-up, and do nothing otherwise.
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
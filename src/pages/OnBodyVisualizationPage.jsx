// OnBodyVisualizationPage.jsx
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ServicePageLayout } from "@/components/shared/ServicePageLayout";
import Silk from "@/components/three/Silk";
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
  { src: "5.jpg", alt: "On-body visualization" },
  { src: "6.jpg", alt: "On-body visualization" },
  { src: "7.jpg", alt: "On-body visualization" },
  { src: "cinegem jewellery.png", alt: "On-body visualization" },
  {
    src: "Band Ring With Enamel Marquise-Y-V1.jpg",
    alt: "On-body visualization",
  },
  {
    src: "G7P25CLACRAW0113D00-TZPDP00005-14Y-V4-WB.png",
    alt: "On-body visualization",
  },
  {
    src: "Gemini_Generated_Image_udnfihudnfihudnf.png",
    alt: "On-body visualization",
  },
];

const GAP = 16; // px, both between tiles in a row and between rows

/* Used only until an image's real dimensions are known (first paint /
   before the browser has decoded it). */
const FALLBACK_AR = 0.8;

/* ═══════════════════════════════════════════════════════════════════════
   ASPECT RATIO DETECTION
   Loads every image once, off-DOM, purely to read naturalWidth/
   naturalHeight. Everything downstream — how many images share a row,
   and each tile's exact pixel width/height — is derived from these
   real dimensions. Nothing is hardcoded per breakpoint.
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
          prev[src]
            ? prev
            : { ...prev, [src]: img.naturalWidth / img.naturalHeight },
        );
      };
      img.onerror = () => {
        if (cancelled) return;
        setRatios((prev) =>
          prev[src] ? prev : { ...prev, [src]: FALLBACK_AR },
        );
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
   CONTAINER WIDTH
   Row sizing below is computed entirely in JS from the gallery's own
   real content width (tracked live via ResizeObserver). Doing the math
   in JS — instead of leaning on CSS `aspect-ratio` + `flex-grow`
   together — sidesteps real cross-browser inconsistencies in how that
   combination resolves on some mobile browsers (this is what was
   causing single, tall images to render narrower than the full
   container width).
═══════════════════════════════════════════════════════════════════════ */

function useContainerWidth(ref) {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w) setWidth(w);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}

/* ═══════════════════════════════════════════════════════════════════════
   PRIMITIVES

   Row: a horizontal strip of 1–3 images, sized purely in JS.

   Every image's pixel width is computed as:
       width_i = availableWidth × (AR_i ÷ ΣAR)
   That formula sums to exactly `availableWidth` by construction, no
   matter what each image's own aspect ratio is — which is what
   guarantees every row (including a lone single-image row) is always
   the FULL container width, on every breakpoint.

   The row's height is that same math's natural result — width ÷ AR is
   identical for every image in the row by construction, so every
   tile's box exactly equals that image's real aspect ratio: the image
   fills its grid container completely on both axes, with zero
   cropping and zero leftover space, on mobile, tablet, AND desktop.
═══════════════════════════════════════════════════════════════════════ */

function layoutRow(items, ratios, containerWidth, gap) {
  const slots = items.filter(Boolean);
  if (!slots.length || !containerWidth) return null;

  const ars = slots.map((img) => arOf(img, ratios));
  const sumAR = ars.reduce((sum, ar) => sum + ar, 0);
  const gapTotal = (slots.length - 1) * gap;
  const availableWidth = Math.max(containerWidth - gapTotal, 0);

  const height = availableWidth / sumAR;

  return {
    height,
    tiles: slots.map((img, i) => ({
      img,
      // Always the image's proportional share of the FULL available
      // width, so widths always sum to exactly `availableWidth`. No
      // dead space, ever.
      width: availableWidth * (ars[i] / sumAR),
    })),
  };
}

function Tile({ img, width, height }) {
  return (
    <div
      className="
        reveal-right shrink-0
        relative overflow-hidden bg-[#FAF9F6]
        border border-[#c4c7c7]/40 gallery-shadow
        hover:-translate-y-1 transition-transform duration-300
      "
      style={{ width, height }}
    >
      {/* The box's width÷height always matches this image's own real
          aspect ratio exactly (see layoutRow above), so object-contain
          and object-cover render identically here — nothing is ever
          cropped, and the image fills the box completely. */}
      <img
        src={img.src}
        alt={img.alt}
        loading="lazy"
        decoding="async"
        className="block w-full h-full object-contain object-center"
        style={{ transform: "translateZ(0)", backfaceVisibility: "hidden" }}
      />
    </div>
  );
}

function Row({ items, ratios, containerWidth }) {
  const row = layoutRow(items, ratios, containerWidth, GAP);
  if (!row) return null;

  return (
    <div className="flex" style={{ gap: GAP, height: row.height }}>
      {row.tiles.map(({ img, width }, i) => (
        <Tile
          key={`${img.src}-${i}`}
          img={img}
          width={width}
          height={row.height}
        />
      ))}
    </div>
  );
}

/* Splits `images` into groups of `size`, in order, with no wrapping —
   the last group just gets whatever images are left over. */
function chunk(images, size) {
  const chunks = [];
  for (let i = 0; i < images.length; i += size) {
    chunks.push(images.slice(i, i + size));
  }
  return chunks;
}

/* ═══════════════════════════════════════════════════════════════════════
   ON-BODY GALLERY — bento layout matched to the reference mock:
     • Mobile  (< 768px)      — 6 images/block: single, single,
                                 side-by-side pair, single, single
     • Tablet  (768–1023px)   — 4 images/block: wide, side-by-side
                                 pair, wide
     • Desktop (≥ 1024px)     — 7 images/block: row of 2, row of 3,
                                 row of 2

   All three read from the same flat `galleryImages` array — only the
   grouping changes per breakpoint (Tailwind toggles which block is
   visible, so only one set of DOM nodes is ever painted at a time).
   containerWidth is measured once here and passed down, since every
   block shares the same full-width parent. Every row on every
   breakpoint renders at its exact natural height, so each image fills
   its grid container completely with no crop and no leftover space.
   Extra images beyond one block simply start the pattern again from
   the top.
═══════════════════════════════════════════════════════════════════════ */

function MobileBlock({ images, ratios, containerWidth }) {
  const [a, b, c1, c2, d, e] = images;
  const rows = [[a], [b], [c1, c2], [d], [e]].filter((r) => r.some(Boolean));

  return (
    <div className="flex md:hidden flex-col" style={{ gap: GAP }}>
      {rows.map((items, i) => (
        <Row
          key={i}
          items={items}
          ratios={ratios}
          containerWidth={containerWidth}
        />
      ))}
    </div>
  );
}

function TabletBlock({ images, ratios, containerWidth }) {
  const [a, b, c, d] = images;
  const rows = [[a], [b, c], [d]].filter((r) => r.some(Boolean));

  return (
    <div className="hidden md:flex lg:hidden flex-col" style={{ gap: GAP }}>
      {rows.map((items, i) => (
        <Row
          key={i}
          items={items}
          ratios={ratios}
          containerWidth={containerWidth}
        />
      ))}
    </div>
  );
}

function DesktopBlock({ images, ratios, containerWidth }) {
  const [a, b, c, d, e, f, g] = images;
  const rows = [
    [a, b],
    [c, d, e],
    [f, g],
  ].filter((r) => r.some(Boolean));

  return (
    <div className="hidden lg:flex flex-col" style={{ gap: GAP }}>
      {rows.map((items, i) => (
        <Row
          key={i}
          items={items}
          ratios={ratios}
          containerWidth={containerWidth}
        />
      ))}
    </div>
  );
}

function OnBodyGallery({ images }) {
  const containerRef = useRef(null);
  const ratios = useAspectRatios(images);
  const containerWidth = useContainerWidth(containerRef);

  const mobileChunks = chunk(images, 6);
  const tabletChunks = chunk(images, 4);
  const desktopChunks = chunk(images, 7);

  return (
    <section className="w-full px-6 py-16 md:py-24">
      <div
        ref={containerRef}
        className="w-full max-w-[2560px] mx-auto flex flex-col"
        style={{ gap: GAP }}
      >
        {mobileChunks.map((c, i) => (
          <MobileBlock
            key={`m-${i}`}
            images={c}
            ratios={ratios}
            containerWidth={containerWidth}
          />
        ))}
        {tabletChunks.map((c, i) => (
          <TabletBlock
            key={`t-${i}`}
            images={c}
            ratios={ratios}
            containerWidth={containerWidth}
          />
        ))}
        {desktopChunks.map((c, i) => (
          <DesktopBlock
            key={`d-${i}`}
            images={c}
            ratios={ratios}
            containerWidth={containerWidth}
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
  const [silkOn, setSilkOn] = useState(true);

  // Same reveal-on-scroll behavior as before: cards slide in from the
  // right as the section enters view, reverse out to the right on
  // scroll-up, and do nothing otherwise.
  useEffect(() => {
    const ctx = gsap.context(() => {
      const sections = gsap.utils.toArray("section", containerRef.current);

      sections.forEach((section) => {
        const cards = gsap.utils
          .toArray(".reveal-right", section)
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
          },
        );
      });

      const refreshId = window.setTimeout(() => ScrollTrigger.refresh(), 300);
      return () => window.clearTimeout(refreshId);
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <ServicePageLayout
      title="On-Body Visualization"
      currentPage="/onbody"
      fullBleed
    >
      {/* Fixed, full-viewport Silk background */}
      {silkOn && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <Silk
            speed={10}
            scale={1}
            color="#633c3c"
            noiseIntensity={2}
            rotation={0}
          />
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

// OnBodyVisualizationPage.jsx
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  { src: "5.jpg", alt: "On-body visualization" },
  { src: "6.jpg", alt: "On-body visualization" },
    { src: "7.jpg", alt: "On-body visualization" },
      { src: "cinegem jewellery.png", alt: "On-body visualization" },

     { src: "Band Ring With Enamel Marquise-Y-V1.jpg", alt: "On-body visualization" },
  { src: "G7P25CLACRAW0113D00-TZPDP00005-14Y-V4-WB.png", alt: "On-body visualization" },
      { src: "Gemini_Generated_Image_udnfihudnfihudnf.png", alt: "On-body visualization" },


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
   CONTAINER WIDTH
   The one measurement that isn't intrinsic to an image: how much
   horizontal space each row actually has to fill. Tracked live via
   ResizeObserver so the whole gallery re-flows on window resize —
   no breakpoint classes, no fixed column counts anywhere.
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
   JUSTIFIED ROW LAYOUT
   Classic Flickr/Google-Photos-style algorithm:
     1. Pick a target row height.
     2. Walk the images left to right, summing each one's width AT that
        target height (width = aspectRatio × targetHeight).
     3. Once the running total would overflow the container, close the
        row and scale every image in it — proportionally, by the same
        factor — so the row's total width lands exactly on the
        container width. That scaling is what produces the final pixel
        width AND height for each tile; no aspect ratio is ever
        distorted, since every image in the row is scaled uniformly.
     4. The trailing row (if it doesn't fill the container on its own)
        is left at the target height instead of being stretched, so a
        couple of leftover images don't get blown up to fill the line.

   There is no fixed column count or fixed column width anywhere — each
   tile's width falls out purely of its own image's aspect ratio at the
   current container width, which is exactly "size everything from the
   image dimensions" rather than a grid with a configured column size.
═══════════════════════════════════════════════════════════════════════ */

function targetRowHeightFor(containerWidth) {
  // A gentle, continuous function of available width — taller rows on
  // wide viewports, shorter on narrow ones — rather than a stepped set
  // of breakpoint-specific column counts.
  return Math.max(260, Math.min(660, containerWidth * 0.26));
}

function layoutJustifiedRows(images, ratios, containerWidth, gap) {
  if (!containerWidth || !images.length) return [];

  const targetHeight = targetRowHeightFor(containerWidth);
  const rows = [];
  let current = [];
  let widthAtTarget = 0;

  images.forEach((img) => {
    const ar = arOf(img, ratios);
    const imgWidthAtTarget = ar * targetHeight;
    const gapsSoFar = current.length * gap;

    if (current.length && widthAtTarget + imgWidthAtTarget + gapsSoFar > containerWidth) {
      rows.push({ items: current, widthAtTarget });
      current = [];
      widthAtTarget = 0;
    }

    current.push(img);
    widthAtTarget += imgWidthAtTarget;
  });

  if (current.length) rows.push({ items: current, widthAtTarget });

  return rows.map((row, rowIndex) => {
    const isLastRow = rowIndex === rows.length - 1;
    const gapTotal = (row.items.length - 1) * gap;
    const availableWidth = containerWidth - gapTotal;
    const naturalWidth = row.widthAtTarget;

    // Only stretch a row to fill the full width if it's either not the
    // last row, or it was already close to full width on its own —
    // this stops a lone leftover image from being scaled up huge.
    const shouldStretch = !isLastRow || naturalWidth / containerWidth > 0.65;
    const scale = shouldStretch ? availableWidth / naturalWidth : 1;
    const rowHeight = targetHeight * scale;

    return {
      height: rowHeight,
      tiles: row.items.map((img) => ({
        img,
        width: arOf(img, ratios) * rowHeight,
        height: rowHeight,
      })),
    };
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   PRIMITIVES
═══════════════════════════════════════════════════════════════════════ */

function Tile({ img, width, height }) {
  return (
    <div
      className="
        reveal-right
        relative overflow-hidden bg-[#FAF9F6] shrink-0
        border border-[#c4c7c7]/40 gallery-shadow
        hover:-translate-y-1 transition-transform duration-300
      "
      style={{ width, height }}
    >
      {/* Width and height are computed in JS from the image's own
          natural aspect ratio (see layoutJustifiedRows above), so
          object-cover here is just a safety net for sub-pixel
          rounding — nothing is ever visibly cropped. */}
      <img
        src={img.src}
        alt={img.alt}
        loading="lazy"
        decoding="async"
        className="block w-full h-full object-cover object-center"
        style={{ transform: "translateZ(0)", backfaceVisibility: "hidden" }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ON-BODY GALLERY
   Every tile's width and height comes directly from the image's real
   dimensions plus the current container width — recalculated live on
   resize. There is no column-count or column-width configuration
   anywhere.
═══════════════════════════════════════════════════════════════════════ */

function OnBodyGallery({ images }) {
  const containerRef = useRef(null);
  const ratios = useAspectRatios(images);
  const containerWidth = useContainerWidth(containerRef);
  const rows = layoutJustifiedRows(images, ratios, containerWidth, GAP);

  return (
    <section className="w-full px-6 py-16 md:py-24">
      <div
        ref={containerRef}
        className="w-full max-w-[2560px] mx-auto flex flex-col"
        style={{ gap: GAP }}
      >
        {rows.map((row, i) => (
          <div key={i} className="flex" style={{ gap: GAP, height: row.height }}>
            {row.tiles.map(({ img, width, height }, j) => (
              <Tile key={`${img.src}-${i}-${j}`} img={img} width={width} height={height} />
            ))}
          </div>
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
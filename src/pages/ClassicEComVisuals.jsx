// ClassicEComVisuals.jsx
import { useEffect, useRef, useState } from "react";
import { ServicePageLayout } from "@/components/shared/ServicePageLayout";
import { BackToVault } from "@/components/shared/BackToVault";

import HeroSection from "@/components/sections/HeroSection";
import RetrieveGridButton from "@/components/ui/RetrieveGridButton";
import { useDriveMedia } from "@/hooks/useDriveMedia";
import { cleanJewelryAlt } from "@/seo/alt";

/* ═══════════════════════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════════════════════ */

const section1Images = [
  { src: "/E-com Visuals/solitaire-high-polish-yellow-marquise-angle-1.png", alt: "Solitaire marquise diamond ring front view in 18K yellow gold 3D render", label: "Front" },
  { src: "/E-com Visuals/solitaire-high-polish-yellow-marquise-angle-2.png", alt: "Solitaire marquise diamond ring side profile view in 18K yellow gold 3D render", label: "Side" },
  { src: "/E-com Visuals/solitaire-high-polish-yellow-marquise-angle-3.png", alt: "Solitaire marquise diamond ring perspective angle view in 18K yellow gold 3D render", label: "Angle" },
  { src: "/E-com Visuals/solitaire-high-polish-yellow-marquise-angle-4.png", alt: "Solitaire marquise diamond ring crown detail view in 18K yellow gold 3D render", label: "Detail" },
];

const section2Images = [
  {
    src: "/E-com Visuals/solitaire-high-polish-yellow-marquise-angle-1.png",
    alt: "Marquise diamond solitaire ring front view 3D render — Cinegem Studio",
    label: "Front",
  },
  {
    src: "/E-com Visuals/solitaire-high-polish-yellow-marquise-angle-2.png",
    alt: "Marquise diamond solitaire ring profile view 3D render — Cinegem Studio",
    label: "Side",
  },
  {
    src: "/E-com Visuals/solitaire-high-polish-yellow-marquise-angle-3.png",
    alt: "Marquise diamond solitaire ring perspective view 3D render — Cinegem Studio",
    label: "Angle",
  },
  {
    src: "/E-com Visuals/solitaire-high-polish-yellow-marquise-angle-4.png",
    alt: "Marquise diamond solitaire ring macro detail view 3D render — Cinegem Studio",
    label: "Detail",
  },
];

const section3Images = [
  {
    src: "/G7P25CLACRAW0113D00-TZPDP00005-14Y-V4-WB.png",
    alt: "Diamond pendant necklace front view in 14K yellow gold 3D render — Cinegem Studio",
    label: "Front",
  },
  {
    src: "/G7P25CLACRAW0113D00-TZPDP00005-14Y-V1-WB.png",
    alt: "Diamond pendant necklace side view in 14K yellow gold 3D render — Cinegem Studio",
    label: "Side",
  },
  {
    src: "/G7P25CLACRAW0113D00-TZPDP00005-CPG-V2-WB.png",
    alt: "Diamond pendant necklace detail view in rose gold 3D render — Cinegem Studio",
    label: "Detail",
  },
  {
    src: "/G7P25CLACRAW0113D00-TZPDP00005-24Y-V3-WB.png",
    alt: "Diamond pendant necklace macro view in 24K yellow gold 3D render — Cinegem Studio",
    label: "Macro",
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   PRIMITIVES
═══════════════════════════════════════════════════════════════════════ */

function ImageTile({ img, className = "" }) {
  return (
    <div
      className={`
        relative overflow-hidden bg-transparent
        hover:-translate-y-0.5 transition-transform duration-300
        ${className}
      `}
    >
      <img
        src={img.src}
        alt={cleanJewelryAlt(img, "Classic E-Commerce")}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover block"
      />
    </div>
  );
}

function VideoPlayer({ videoSrc, className = "" }) {
  return (
    <div
      className={`
        relative flex items-center justify-center
        bg-black overflow-hidden isolate
        ${className}
      `}
    >
      {videoSrc ? (
        <video
          src={videoSrc}
          className="absolute inset-0 w-full h-full object-cover [border-radius:inherit]"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        <button
          aria-label="Play product video"
          className="w-14 h-14 border border-white/60 bg-white/10 flex items-center justify-center hover:bg-white/20 transition rounded-full"
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

function ScrollArrow({ direction, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={direction === "left" ? "Scroll left" : "Scroll right"}
      className={`
        absolute top-1/2 -translate-y-1/2 z-10
        w-8 h-8 md:w-9 md:h-9 shrink-0
        flex items-center justify-center rounded-full
        bg-[#121212]/70 backdrop-blur-sm border border-[#C5A059]/50
        text-[#FAF9F6] shadow-lg
        hover:bg-[#C5A059] hover:text-[#121212] hover:border-[#C5A059]
        transition-colors duration-300
        ${direction === "left" ? "left-1" : "right-1"}
      `}
    >
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {direction === "left" ? (
          <path d="M15 6l-6 6 6 6" />
        ) : (
          <path d="M9 6l6 6-6 6" />
        )}
      </svg>
    </button>
  );
}

/* One-at-a-time "peek" carousel — a single active slide centered in
   the track with the next/previous slide peeking in (dimmed, slightly
   scaled down) at each edge, matching the reference gif. Every slide
   is sized identically (same width % + aspect ratio), so nothing
   jumps in size as it becomes active. Navigation is strictly linear:
   the left arrow is absent on slide 1 and the right arrow is absent
   on the last slide — there's no wraparound in either direction.
   Swiping/dragging the track works too; the arrows and the native
   scroll-snap stay in sync via the same activeIndex. */
function PeekCarousel({ images, className = "" }) {
  const trackRef = useRef(null);
  const slideRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateActive = () => {
    const track = trackRef.current;
    const slides = slideRefs.current;
    if (!track || !slides.length) return;
    const center = track.scrollLeft + track.clientWidth / 2;
    let closest = 0;
    let closestDist = Infinity;
    slides.forEach((el, i) => {
      if (!el) return;
      const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - center);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    setActiveIndex(closest);
  };

  useEffect(() => {
    updateActive();
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    // Images loading in can shift slide widths after the initial check.
    const settleId = window.setTimeout(updateActive, 400);
    return () => {
      track.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
      window.clearTimeout(settleId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  const goTo = (i) => {
    const target = Math.max(0, Math.min(images.length - 1, i));
    const track = trackRef.current;
    const el = slideRefs.current[target];
    if (!track || !el) return;
    track.scrollTo({
      left: el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2,
      behavior: "smooth",
    });
  };

  const canLeft = activeIndex > 0;
  const canRight = activeIndex < images.length - 1;

  return (
    <div className={`relative w-full min-w-0 max-w-full ${className}`}>
      {canLeft && (
        <ScrollArrow direction="left" onClick={() => goTo(activeIndex - 1)} />
      )}
      <div
        ref={trackRef}
        className="peek-scroll flex gap-1 overflow-x-auto snap-x snap-mandatory max-w-full px-[9%] sm:px-[16%] md:px-[22%]"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {images.map((img, i) => (
          <div
            key={i}
            ref={(el) => (slideRefs.current[i] = el)}
            className={`
              w-full shrink-0 aspect-square snap-center [scroll-snap-stop:always]
              transition-all duration-[400ms] ease-out
              ${i === activeIndex ? "opacity-100 scale-100" : "opacity-40 scale-[0.92] blur-[1px]"}
            `}
          >
            <ImageTile img={img} className="w-full h-full" />
          </div>
        ))}
      </div>
      {canRight && (
        <ScrollArrow direction="right" onClick={() => goTo(activeIndex + 1)} />
      )}
      <style>{`.peek-scroll::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}

/* Single main-preview carousel: exactly one media item shown at a
   time, with prev/next arrows anchored to the outer edges of the
   container — same ScrollArrow component/styling as Section 2 — and
   the image/video itself inset between them (rather than the arrows
   floating on top of it). No thumbnail strip; the preview's height
   comes from `heightClassName` so it can fill whatever vertical space
   is given to it. Video (if provided) is simply the last item in the
   sequence. Strictly linear — the left arrow is absent on the first
   item, the right arrow on the last — so there's no wraparound.
   Swiping works the same as the arrows: a horizontal drag past the
   threshold steps one item at a time. Pointer Events cover touch and
   mouse-drag alike. The listeners live on `window` (attached only
   while a pointer is down) rather than using setPointerCapture, so a
   drag that starts on the video doesn't hijack its native play/seek
   controls; a mostly-vertical drag is ignored so the page can still
   scroll normally. */
function MainPreviewCarousel({
  images,
  videoSrc,
  heightClassName = "",
  className = "",
}) {
  const media = videoSrc
    ? [...images.map((img) => ({ type: "image", img })), { type: "video" }]
    : images.map((img) => ({ type: "image", img }));

  const [activeIndex, setActiveIndex] = useState(0);
  const active = media[activeIndex];
  const dragStart = useRef(null);

  const canLeft = activeIndex > 0;
  const canRight = activeIndex < media.length - 1;

  const step = (delta) => {
    setActiveIndex((prev) =>
      Math.max(0, Math.min(media.length - 1, prev + delta)),
    );
  };

  const SWIPE_THRESHOLD = 40;

  useEffect(() => {
    const handlePointerUp = (e) => {
      const start = dragStart.current;
      dragStart.current = null;
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      // Require a clearly horizontal drag so this never fights a
      // vertical page-scroll gesture.
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        step(dx < 0 ? 1 : -1);
      }
    };
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media.length]);

  const handlePointerDown = (e) => {
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  return (
    <div
      className={`relative w-full min-w-0 max-w-full px-12 sm:px-14 md:px-16 [touch-action:pan-y] ${heightClassName} ${className}`}
      onPointerDown={handlePointerDown}
    >
      {canLeft && <ScrollArrow direction="left" onClick={() => step(-1)} />}
      {active.type === "video" ? (
        <VideoPlayer videoSrc={videoSrc} className="w-full h-full" />
      ) : (
        <ImageTile img={active.img} className="w-full h-full" />
      )}
      {canRight && <ScrollArrow direction="right" onClick={() => step(1)} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 1 — Video (top on mobile/tablet, left on desktop) + 2×2 grid
   Centered in exactly one viewport on load (no snap, no forced cutoff —
   just a min-h block tall enough to fill the screen below the 80px
   fixed header, with its content vertically centered inside it).
   Mobile + tablet: video on top, 2×2 square image grid stacked below.
═══════════════════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════════════════════════
   ORIGINAL NORMAL GRID COMPONENTS (Retrieved when in normal mode)
   Authentic wide layout (max-w-[2560px]), generous luxury gaps (gap-8, gap-4),
   original cream-backed tiles with white pill label tags from c111c47.
═══════════════════════════════════════════════════════════════════════ */

function OriginalImageTile({ img, className = "" }) {
  return (
    <div
      className={`
        relative overflow-hidden bg-[#FAF9F6]
        border border-[#c4c7c7]/40 gallery-shadow
        hover:-translate-y-1 transition-transform duration-300
        ${className}
      `}
    >
      <img src={img.src} alt={img.alt} className="w-full h-full object-cover block" />
      {img.label && (
        <span
          className="
            absolute bottom-2 left-2
            font-[Poppins] text-[9px] tracking-[0.15em] font-light uppercase
            px-2 py-1 bg-white/80 text-[#444748]
          "
        >
          {img.label}
        </span>
      )}
    </div>
  );
}

function OriginalVideoPlayer({ videoSrc, className = "" }) {
  return (
    <div
      className={`
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

function OriginalSection1({ images, videoSrc }) {
  return (
    <section
      className="w-full flex items-center justify-center px-4 sm:px-6 md:px-8 lg:px-10 py-6 md:py-0"
      style={{ minHeight: "calc(100vh - 80px)" }}
    >
      <div className="w-full max-w-[2560px] mx-auto">
        <div className="flex flex-col gap-4 lg:hidden">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
            {images.slice(0, 4).map((img, i) => (
              <OriginalImageTile key={i} img={img} className="aspect-square" />
            ))}
          </div>
          <OriginalVideoPlayer videoSrc={videoSrc} className="w-full aspect-video" />
        </div>

        <div className="hidden lg:flex flex-row gap-8 items-center justify-center h-[75vh]">
          <OriginalVideoPlayer videoSrc={videoSrc} className="flex-1 h-full" />
          <div className="h-full aspect-square max-w-[100%] grid grid-cols-2 gap-4 shrink-0">
            {images.slice(0, 4).map((img, i) => (
              <OriginalImageTile key={i} img={img} className="aspect-square" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function OriginalSection2({ images, videoSrc }) {
  return (
    <section className="w-full px-4 sm:px-6 md:px-8 lg:px-10 py-16 md:py-24">
      <div className="w-full max-w-[2560px] mx-auto">
        <div className="flex flex-col gap-4 lg:hidden">
          <PeekCarousel images={images} />
          <OriginalVideoPlayer videoSrc={videoSrc} className="w-full aspect-[16/10]" />
        </div>

        <div className="hidden lg:flex flex-col gap-6">
          <div className="flex gap-4 justify-center">
            {images.slice(0, 4).map((img, i) => (
              <OriginalImageTile key={i} img={img} className="flex-1 aspect-square" />
            ))}
          </div>
          <OriginalVideoPlayer videoSrc={videoSrc} className="w-full aspect-[21/9]" />
        </div>
      </div>
    </section>
  );
}

function OriginalSection3({ images = [], videoSrc }) {
  const [hero, img2, img3, img4] = images.length >= 4 ? images : section3Images;

  return (
    <section className="w-full px-4 sm:px-6 md:px-8 lg:px-10 pt-16 pb-24 md:py-24">
      <div className="w-full max-w-[2560px] mx-auto">
        <div className="lg:hidden">
          <MainPreviewCarousel
            images={[hero, img2, img3, img4]}
            videoSrc={videoSrc}
            heightClassName="h-[72vh] sm:h-[78vh] md:h-[100vh]"
          />
        </div>

        <div className="hidden lg:flex flex-row gap-8 items-center justify-center h-[75vh]">
          <OriginalVideoPlayer videoSrc={videoSrc} className="w-1/2 h-full" />
          <div className="w-1/2 h-full grid grid-cols-2 gap-4">
            <OriginalImageTile img={hero} className="aspect-square" />
            <OriginalImageTile img={img2} className="aspect-square" />
            <OriginalImageTile img={img3} className="aspect-square" />
            <OriginalImageTile img={img4} className="aspect-square" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Section1({ images, videoSrc }) {
  return (
    <section
      className="w-full flex items-center justify-center px-4 sm:px-6 md:px-8 lg:px-10 py-6 md:py-10"
      style={{ minHeight: "calc(100vh - 80px)" }}
    >
      <div className="w-full max-w-[1920px] 2xl:max-w-[2040px] mx-auto glassy-container">
        {/* MOBILE + TABLET (<lg) — stacked: 1:1 video on top (top corners rounded), 2x2 grid below (bottom corners rounded) */}
        <div className="flex flex-col gap-1 lg:hidden">
          <VideoPlayer videoSrc={videoSrc} className="w-full aspect-square rounded-t-[12px] rounded-b-none" />
          <div className="grid grid-cols-2 gap-1 w-full">
            {images.slice(0, 4).map((img, i) => {
              const cornerClass =
                i === 2
                  ? "rounded-bl-[12px]"
                  : i === 3
                  ? "rounded-br-[12px]"
                  : "rounded-none";
              return (
                <ImageTile key={i} img={img} className={`aspect-square ${cornerClass}`} />
              );
            })}
          </div>
        </div>

        {/* DESKTOP (lg+) — 1:1 Video (left) + 1:1 2x2 Image Grid (right)
            Outer 4 corners have 12px radius; all inner joints have 0 radius (sharp 90°) */}
        <div className="hidden lg:grid grid-cols-2 gap-1 w-full items-stretch justify-center max-h-[82vh]">
          {/* Video on left: outer left corners rounded, inner right corners sharp */}
          <div className="w-full h-full aspect-square overflow-hidden rounded-l-[12px] rounded-r-none">
            <VideoPlayer videoSrc={videoSrc} className="w-full h-full aspect-square rounded-l-[12px] rounded-r-none" />
          </div>

          {/* 2x2 grid on right: only outer top-right (img 1) and outer bottom-right (img 3) rounded */}
          <div className="w-full h-full aspect-square grid grid-cols-2 grid-rows-2 gap-1">
            {images.slice(0, 4).map((img, i) => {
              // 0: top-left (inner joint with video & img 1) -> sharp
              // 1: top-right (outer container corner) -> rounded-tr
              // 2: bottom-left (inner joint with video & img 3) -> sharp
              // 3: bottom-right (outer container corner) -> rounded-br
              const cornerClass =
                i === 1
                  ? "rounded-tr-[12px] rounded-tl-none rounded-bl-none rounded-br-none"
                  : i === 3
                  ? "rounded-br-[12px] rounded-tl-none rounded-tr-none rounded-bl-none"
                  : "rounded-none";

              return (
                <ImageTile
                  key={i}
                  img={img}
                  className={`w-full h-full aspect-square ${cornerClass}`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 2 — 4-image row (top) + video strip (below)
   Outer 4 corners rounded; all 6 inner junctions completely square (0 radius)
═══════════════════════════════════════════════════════════════════════ */

function Section2({ images, videoSrc }) {
  return (
    <section className="w-full px-4 sm:px-6 md:px-8 lg:px-10 py-6 md:py-10">
      <div className="w-full max-w-[1920px] 2xl:max-w-[2040px] mx-auto glassy-container">
        {/* MOBILE / TABLET (<lg) */}
        <div className="flex flex-col gap-1 lg:hidden">
          <PeekCarousel images={images} />
          <VideoPlayer videoSrc={videoSrc} className="w-full aspect-[16/10] rounded-b-[12px] rounded-t-none" />
        </div>

        {/* DESKTOP — 4 equal square tiles in a row, video strip below
            Row of 4: only outer top-left (img 0) and outer top-right (img 3) rounded.
            Bottom video: only outer bottom-left and outer bottom-right rounded.
            All inner seams are sharp 90°. */}
        <div className="hidden lg:flex flex-col gap-1">
          <div className="grid grid-cols-4 gap-1 w-full">
            {images.slice(0, 4).map((img, i) => {
              const cornerClass =
                i === 0
                  ? "rounded-tl-[12px] rounded-tr-none rounded-bl-none rounded-br-none"
                  : i === 3
                  ? "rounded-tr-[12px] rounded-tl-none rounded-bl-none rounded-br-none"
                  : "rounded-none";

              return (
                <ImageTile
                  key={i}
                  img={img}
                  className={`w-full h-full aspect-square ${cornerClass}`}
                />
              );
            })}
          </div>
          <VideoPlayer videoSrc={videoSrc} className="w-full aspect-[21/9] rounded-b-[12px] rounded-t-none" />
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 3 — Portrait video (left) + 2×2 grid (right), pendant layout
   Outer left & outer right corners rounded; inner seams sharp 90°.
═══════════════════════════════════════════════════════════════════════ */

function Section3({ images = [], videoSrc }) {
  const hero = images[0] || section3Images[0];
  const img2 = images[1] || section3Images[1];
  const img3 = images[2] || section3Images[2];
  const img4 = images[3] || section3Images[3];

  return (
    <section className="w-full px-4 sm:px-6 md:px-8 lg:px-10 py-6 md:py-12">
      <div className="w-full max-w-[1920px] 2xl:max-w-[2040px] mx-auto glassy-container">
        {/* MOBILE / TABLET (<lg) */}
        <div className="lg:hidden">
          <MainPreviewCarousel
            images={[hero, img2, img3, img4]}
            videoSrc={videoSrc}
            heightClassName="h-[72vh] sm:h-[78vh] md:h-[100vh]"
          />
        </div>

        {/* DESKTOP (lg+) — single row, 5 columns: image, image, video (center), image, image
            Only outer-left of hero and outer-right of img4 are rounded! All inside are sharp. */}
        <div className="hidden lg:flex flex-row gap-1 items-stretch justify-center h-[72vh]">
          <ImageTile img={hero} className="h-full aspect-square rounded-l-[12px] rounded-r-none" />
          <ImageTile img={img2} className="h-full aspect-square rounded-none" />
          <VideoPlayer videoSrc={videoSrc} className="h-full aspect-[5/4] rounded-none" />
          <ImageTile img={img3} className="h-full aspect-square rounded-none" />
          <ImageTile img={img4} className="h-full aspect-square rounded-r-[12px] rounded-l-none" />
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════ */

export default function ClassicEComVisuals({
  videoSrc1 = "MarquiseSideStone_HiddenHalo_Cushion_533985AX-R.mp4",
  videoSrc2 = "/E-com Visuals/solitaire-high-polish-yellow-marquise-video.mp4",
  videoSrc3 = "MarquiseSideStone_HiddenHalo_Cushion_533985AX-R.mp4",
  title = "Classic E-Commerce Visuals",
  eyebrow = "Product Showcase",
}) {
  const containerRef = useRef(null);
  const [isCleanGrid, setIsCleanGrid] = useState(false);

  const {
    items,
    images,
    videos,
    total,
    loading,
    isFallback,
    lastSynced,
    refresh,
  } = useDriveMedia("E-Com Visuals");

  // Helper to categorize media item by filename / alt / code
  const categorizeJewelry = (item) => {
    const name = (item.name || item.src || item.alt || "").toUpperCase();
    if (/(^BR|_BR_|BR|BRACELET|BANGLE)/.test(name)) return "bracelet";
    if (/(^PD|_PD_|PD|PENDANT|NECKLACE|\d+P-)/.test(name)) return "necklace";
    if (/(^RG|_RG_|RG|RING|\d+R-)/.test(name)) return "ring";
    return "other";
  };

  // Check if images are strictly sequential numbers (e.g., 1.png .. 12.png)
  const isNumberedSequence =
    images.length >= 8 &&
    images.every((img) => /^\d+\.(png|jpg|jpeg|webp)$/i.test(img.name || ""));

  let dynamicSec1Images = section1Images;
  let dynamicSec2Images = section2Images;
  let dynamicSec3Images = section3Images;

  if (isNumberedSequence) {
    // Strictly follow 1..4, 5..8, 9..12 when user explicitly numbers them
    dynamicSec1Images = images.slice(0, 4);
    dynamicSec2Images = images.slice(4, 8);
    dynamicSec3Images = images.length >= 12 ? images.slice(8, 12) : images.slice(4, 8);
  } else if (images.length > 0) {
    // Intelligent category-aware grouping to ensure no necklaces appear in ring or bracelet sections
    const bracelets = images.filter((img) => categorizeJewelry(img) === "bracelet");
    const rings = images.filter((img) => categorizeJewelry(img) === "ring");
    const necklaces = images.filter((img) => categorizeJewelry(img) === "necklace");

    // SECTION 2: 100% Pure Rings (paired Emerald cuts & curved bands)
    const sec2Rings = [
      ...rings.filter((r) => (r.name || "").includes("KJ01914R")),
      ...rings.filter((r) => (r.name || "").includes("RG02")),
      ...rings.filter((r) => !(r.name || "").includes("KJ01914R") && !(r.name || "").includes("RG02")),
    ];
    dynamicSec2Images = sec2Rings.length >= 4
      ? sec2Rings.slice(0, 4)
      : (rings.length > 0 ? rings.concat(section2Images).slice(0, 4) : section2Images);

    // SECTION 1: 100% Pure Bracelets
    const sec1Bracelets = [...bracelets];
    if (sec1Bracelets.length === 3) {
      sec1Bracelets.push({
        src: "/E-com Visuals/Figaro-BR-CH-Y-V1.png",
        alt: "Figaro Gold Bracelet",
        label: "Bracelet",
        name: "Figaro-BR-CH-Y-V1.png",
      });
    }
    dynamicSec1Images = sec1Bracelets.length >= 4
      ? sec1Bracelets.slice(0, 4)
      : (bracelets.length > 0 ? bracelets.concat(section1Images).slice(0, 4) : section1Images);

    // SECTION 3: 100% Pure Necklaces / Pendants
    const sec3Necklaces = [
      ...necklaces.filter((n) => (n.name || "").includes("PD001")),
      ...necklaces.filter((n) => !(n.name || "").includes("PD001")),
    ];
    if (sec3Necklaces.length === 3) {
      sec3Necklaces.push({
        src: "/E-com Visuals/NP-1-YG-LS2-V2.png",
        alt: "Rose Gold Pendant",
        label: "Pendant",
        name: "NP-1-YG-LS2-V2.png",
      });
    }
    dynamicSec3Images = sec3Necklaces.length >= 4
      ? sec3Necklaces.slice(0, 4)
      : (necklaces.length > 0 ? necklaces.concat(section3Images).slice(0, 4) : section3Images);
  }

  const dynamicVideo1 = videos[0]?.src || videoSrc1;
  const dynamicVideo2 = videos[1]?.src || videoSrc2;
  const dynamicVideo3 = videos[2]?.src || videoSrc3;

  // Each section's cards/video animate independently of every other
  // section, bound only to that section's own "top 85%" line:
  //   • scrolling down past it  -> cards slide in from the RIGHT
  //   • scrolling back UP past it -> cards slide back out to the RIGHT
  return (
    <ServicePageLayout title={title} currentPage="/classic" fullBleed>
      {/* Floating Toggle: Retrieve clean grid without glassy container */}
      <RetrieveGridButton isClean={isCleanGrid} onToggle={setIsCleanGrid} pageName="Classic E-Commerce" />

      {/* Cinematic scroll-zoom hero */}
      <HeroSection
        backgroundSrc="/4.png"
        heading={["Classic", "E-Commerce", "Visuals"]}
        paragraph="Premium product photography and cinematic videos crafted for luxury jewellery brands."
      />

      <div ref={containerRef} className="relative z-10">
        {isCleanGrid ? (
          <>
            <OriginalSection1 images={dynamicSec1Images} videoSrc={dynamicVideo1} />
            <OriginalSection2 images={dynamicSec2Images} videoSrc={dynamicVideo2} />
            <OriginalSection3 images={dynamicSec3Images} videoSrc={dynamicVideo3} />
          </>
        ) : (
          <>
            <Section1 images={dynamicSec1Images} videoSrc={dynamicVideo1} />
            <Section2 images={dynamicSec2Images} videoSrc={dynamicVideo2} />
            <Section3 images={dynamicSec3Images} videoSrc={dynamicVideo3} />
          </>
        )}
      </div>
    </ServicePageLayout>
  );
}

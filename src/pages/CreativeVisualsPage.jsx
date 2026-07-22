// CreativeVisualsPage.jsx
//
// "Creative Visuals" service page.
//   1. Classic nav + cinematic hero (same shell as ClassicEComVisuals).
//   2. Below the hero: a true masonry grid of jewellery photos & videos.
//      Fixed-width columns, but every tile keeps its own natural height —
//      the box IS the image's real proportions, nothing is cropped to fit
//      a predetermined shape. A small square photo gets a small box; a
//      long portrait shot gets a tall box; a wide shot gets a short,
//      wide box. This matches the reference collage (masonry columns,
//      each item its native aspect ratio) rather than a fixed grid of
//      pre-shaped cells.
import { useState, useEffect, useRef, useMemo } from "react";
import { gsap } from "gsap";
import { ServicePageLayout } from "@/components/shared/ServicePageLayout";
import HeroSection from "@/components/sections/HeroSection";
import { LightboxModal } from "@/components/shared/LightboxModal";
import { useLightbox } from "@/hooks/useLightbox";
import Silk from "@/components/three/Silk";

/* ═══════════════════════════════════════════════════════════════════════
   DATA — creative jewellery photography + video
═══════════════════════════════════════════════════════════════════════ */

// Just drop in { type, src, alt } for a new photo or video — no shape
// tagging needed. The masonry grid below renders every tile at its own
// real width/height ratio, so the box always matches the file itself.
const mediaItems = [
  { type: "image", src: "/Creative visuals/4 Ring Banner T4 HQ_.jpg", alt: "Enamel marquise band ring, hero angle" },
  { type: "video", src: "/Creative visuals/360 Turntable black.mp4", alt: "Enamel marquise band ring, hero angle" },
  { type: "video", src: "/Creative visuals/A6-R3-HQ.mp4", alt: "Enamel marquise band ring, hero angle" },
  { type: "image", src: "/Creative visuals/RG01-Y-B-V2.png", alt: "Cinegem signature jewellery still" },
  { type: "video", src: "/Creative visuals/B4 ANimated.mp4", alt: "Enamel marquise band ring, hero angle" },
  { type: "image", src: "/Creative visuals/Beauty.png", alt: "Enamel marquise band ring, hero angle" },
  { type: "video", src: "/Creative visuals/E commerce 1 with Music.mp4", alt: "Enamel marquise band ring, hero angle" },
  { type: "image", src: "/Creative visuals/Earring 1 YG BlackBG V0000.png", alt: "Enamel marquise band ring, hero angle" },
  { type: "image", src: "/Creative visuals/Earring 1 YG BlackBG V0001.png", alt: "Two-tone gold ring, geometric pavé setting" },
  { type: "image", src: "/Creative visuals/SR-B-9-Y-V1.png", alt: "Gold pendant, front view" },
  { type: "video", src: "/Creative visuals/Multishot Brown.mp4", alt: "Gold chain necklace, editorial still" },

  { type: "video", src: "/Creative visuals/M-Video.mp4", alt: "Pendant detail, front view" },
  { type: "image", src: "/Creative visuals/NB-1 LO R.png", alt: "Hidden-halo ring, 360° turntable" },
  { type: "image", src: "/Creative visuals/NP-1-YG-LS2-V2.png", alt: "Rose gold pendant, macro" },

  { type: "image", src: "/Creative visuals/R1-L2-P1-SB-Y-V4.png", alt: "Diamond bracelet, editorial still" },
  { type: "image", src: "/Creative visuals/R4-L2-Y-V4.png", alt: "Creative CGI jewellery composition" },

  { type: "image", src: "/Creative visuals/RG01_Out2_0000.png", alt: "Ring detail, cinematic loop" },
  { type: "image", src: "/Creative visuals/RG01-Y-B-V1.png", alt: "Diamond stud earrings, editorial still" },
  { type: "image", src: "/Creative visuals/RG01-Y-B-V2.png", alt: "Cinegem signature jewellery still" },

  { type: "image", src: "/Creative visuals/RG01-Y-B-V3.png", alt: "Two-tone gold ring, front angle" },
  { type: "image", src: "/Creative visuals/RG01-Y-B-V4.png", alt: "Diamond ring, editorial macro" },
  { type: "image", src: "/Creative visuals/Ring 2-Color BG-V1-R3.png", alt: "Diamond drop earrings on dark surface" },
  { type: "image", src: "/Creative visuals/Ring 2-Color BG-V1-R6.png", alt: "Sculptural gold ring, editorial still" },
  { type: "image", src: "/Creative visuals/ring.png", alt: "Emerald ring on marble" },
  { type: "image", src: "/Creative visuals/SR-B-9-Y-V1.png", alt: "Pearl necklace, editorial still" },

  { type: "image", src: "/Creative visuals/Screenshot 2023-07-15 183627.png", alt: "Gold necklace and earring set, display still" },
  { type: "image", src: "/Creative visuals/SR-B-9-Y-V1.png", alt: "Gold hoop earrings" },
  { type: "image", src: "/Creative visuals/SR-B-9-Y-V1.png", alt: "Vintage gold and gemstone ring" },

  { type: "image", src: "/Creative visuals/Screenshot 2023-12-20 080608.png", alt: "Layered gold necklaces" },
  { type: "image", src: "/Creative visuals/Screenshot 2023-12-20 080659.png", alt: "Gold chain bracelet, editorial still" },

  { type: "image", src: "/Creative visuals/Screenshot 2024-06-24 184639.png", alt: "Two-tone gold ring, side profile" },
  { type: "image", src: "/Creative visuals/Screenshot 2024-06-24 184713.png", alt: "Two-tone gold ring, angled profile" },
  { type: "image", src: "/Creative visuals/Screenshot 2024-06-24 184810.png", alt: "Round halo diamond ring, front view" },
  { type: "image", src: "/Creative visuals/Screenshot 2024-06-24 184847.png", alt: "Round halo diamond ring, tight macro crop" },
  { type: "image", src: "/Creative visuals/SR-B-9-Y-V1.png", alt: "Gold pendant with geometric diamond links, full length" },
  { type: "image", src: "/Creative visuals/RG01-Y-B-V1.png", alt: "Enamel marquise band ring, hero angle" },
  { type: "image", src: "/Creative visuals/R4-L2-Y-V4.png", alt: "Creative CGI jewellery composition" },
  { type: "video", src: "/Creative visuals/M-Video.mp4", alt: "Pendant detail, front view" },
];

/* ═══════════════════════════════════════════════════════════════════════
   TILE — a plain block-level image/video, no forced box. It renders at
   its own natural aspect ratio inside a fixed-width masonry column, so a
   small/square photo takes a small box and a long shot takes a tall one.
   A soft skeleton fills the space until the file finishes loading (we
   don't know its real height ahead of time, so we can't reserve exact
   space — the fade-in keeps the "pop-in" from feeling jarring).
   Clicking a tile opens it full-screen in the lightbox.
═══════════════════════════════════════════════════════════════════════ */

function Tile({ item, index, onOpen }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const videoRef = useRef(null);

  // Mobile browsers frequently ignore the bare `autoPlay` attribute
  // (data-saver/low-power mode), which otherwise leaves the tile blank
  // with no frame at all — Orbit view's Masonry component has its own
  // matching workaround (see MasonryVideoTile in Masonry.jsx).
  useEffect(() => {
    if (item.type !== "video") return;
    const el = videoRef.current;
    if (!el) return;
    const tryPlay = () => {
      const playPromise = el.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    };
    tryPlay();
    el.addEventListener("canplay", tryPlay);
    return () => el.removeEventListener("canplay", tryPlay);
  }, [item.type, item.src]);

  // If the file 404s or otherwise fails to load, collapse the tile
  // entirely instead of leaving a blank placeholder box in the column.
  if (failed) return null;

  return (
    <div className="relative w-full overflow-hidden bg-[#EDEAE3]">
      <button
        type="button"
        onClick={() => onOpen(index)}
        aria-label={`Zoom in on ${item.alt}`}
        className="group block w-full cursor-pointer focus:outline-none"
      >
        {item.type === "video" ? (
          <video
            ref={videoRef}
            src={item.src}
            className={`block w-full h-auto transition-all duration-500 group-hover:scale-105 ${loaded ? "opacity-100" : "opacity-0"}`}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onLoadedData={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        ) : (
          <img
            src={item.src}
            alt={item.alt}
            className={`block w-full h-auto transition-all duration-500 group-hover:scale-105 ${loaded ? "opacity-100" : "opacity-0"}`}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        )}

        {item.type === "video" && (
          <span className="absolute top-3 right-3 font-[Manrope] text-[9px] tracking-[0.15em] font-semibold uppercase px-2.5 py-1 bg-[#121212]/70 text-[#FAF9F6] backdrop-blur-sm">
            Video
          </span>
        )}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MASONRY GRID — CSS multi-column layout: a fixed number of equal-width
   columns, and each tile just flows into the next column in reading
   order (break-inside: avoid keeps a tile from splitting across two
   columns). Because the tile's own <img>/<video> sets its height via
   h-auto (real aspect ratio, no cropping), the column naturally staggers
   exactly like the reference — this is what actually makes "box follows
   image size" true, rather than approximating it with preset shapes.
   Column count steps up with viewport width; see the media queries below.
═══════════════════════════════════════════════════════════════════════ */

function MasonryGrid({ items, onOpen }) {
  return (
    <>
      <style>{`
        .creative-masonry {
          column-count: 2;
          column-gap: 1rem;
        }
        .creative-masonry > * {
          break-inside: avoid;
          margin-bottom: 1rem;
        }
        @media (min-width: 640px) {
          .creative-masonry { column-count: 3; column-gap: 1.125rem; }
          .creative-masonry > * { margin-bottom: 1.125rem; }
        }
        @media (min-width: 1024px) {
          .creative-masonry { column-count: 4; column-gap: 1.25rem; }
          .creative-masonry > * { margin-bottom: 1.25rem; }
        }
        @media (min-width: 1536px) {
          .creative-masonry { column-count: 5; column-gap: 1.25rem; }
          .creative-masonry > * { margin-bottom: 1.25rem; }
        }
      `}</style>
      <div className="creative-masonry bg-transparent">
        {items.map((item, index) => (
          <Tile key={index} item={item} index={index} onOpen={onOpen} />
        ))}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ORBIT GRID — CSS multi-column masonry, same underlying mechanism as
   Grid View's MasonryGrid: fixed-width columns, and each tile's own
   <img>/<video> sets its own height via h-auto, so the box IS the file's
   real aspect ratio. No fixed-size cells, no object-contain letterboxing,
   nothing to "fit" — there's no mismatch between box and image to begin
   with, so the awkward padding when a square-ish photo landed in a
   forced 1x1 cell (or a fixed-track grid computed the wrong span) simply
   can't happen anymore.
   Orbit stays visually distinct from the default Grid view via a larger,
   fewer-column layout (bigger tiles, more breathing room), images and
   videos shuffled together randomly (see shuffleWithOriginalIndex below)
   instead of rendering in data order, and GSAP animation adapted from
   the React Bits Masonry component:
     - load-in: fades/slides up from below with a blur-to-focus resolve,
       staggered across tiles (animateFrom="bottom" + blurToFocus)
     - continuous drift: once settled in, each tile gently floats in
       place on its own randomized loop, giving the grid an "in orbit"
       feel rather than sitting perfectly still
   Only the animation behavior is borrowed from that component; sizing
   stays driven by each file's real aspect ratio (not a fixed height
   prop) and clicking still opens the shared lightbox (not a new tab),
   since those are what make this grid correct for real jewellery
   photography/video in the first place.
═══════════════════════════════════════════════════════════════════════ */

function OrbitTile({ item, onOpen, staggerIndex }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [inView, setInView] = useState(false);
  const videoRef = useRef(null);
  const wrapperRef = useRef(null);
  const hasAnimated = useRef(false);
  const floatTween = useRef(null);

  // Gate the entrance animation on scroll position, not just file-load
  // completion. Without this, tiles fire the instant their own image/
  // video finishes downloading — which, on a fast connection, can mean
  // tiles far below the fold animate in at the same moment as tiles at
  // the top, all at once, instead of resolving as the person actually
  // scrolls down to them. threshold: 0.15 + rootMargin gives the tile a
  // small head start so it's settled in by the time it's fully in view,
  // rather than animating mid-scroll.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect(); // only need to fire once per tile
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -5% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Mobile browsers (data-saver mode, low-power mode) frequently ignore
  // the bare `autoPlay` attribute. preload="auto" makes sure a real frame
  // downloads and paints regardless of whether autoplay succeeds, and
  // explicitly calling play() (with a .catch to swallow the still-
  // possible rejection) is the standard workaround for browsers that need
  // a script-driven play call rather than just the attribute.
  useEffect(() => {
    if (item.type !== "video") return;
    const el = videoRef.current;
    if (!el) return;
    const tryPlay = () => {
      const playPromise = el.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          /* Autoplay blocked — preload="auto" still gets a frame on
             screen, so the tile shows real content, just paused. */
        });
      }
    };
    tryPlay();
    el.addEventListener("canplay", tryPlay);
    return () => el.removeEventListener("canplay", tryPlay);
  }, [item.type, item.src]);

  // GSAP load-in: only once this tile's own media has loaded AND it has
  // scrolled into view (both loaded and inView must be true) does it
  // animate up from slightly below with a blur-to-focus resolve,
  // matching the reference Masonry component's animateFrom="bottom" +
  // blurToFocus look. Gating on inView is what makes tiles resolve as
  // you actually scroll to them, instead of every already-loaded tile on
  // the page (including ones far below the fold) firing together the
  // moment their file happens to finish downloading.
  // Runs once per tile (hasAnimated guards against firing again) and is
  // staggered by the tile's position so a row of tiles that all just
  // entered the viewport together still cascades in, rather than
  // snapping in as one block. Once the entrance settles, a continuous
  // drift kicks in (see below).
  useEffect(() => {
    if (!loaded || !inView || hasAnimated.current || !wrapperRef.current) return;
    hasAnimated.current = true;
    const el = wrapperRef.current;
    gsap.fromTo(
      el,
      { opacity: 0, y: 40, filter: "blur(10px)" },
      {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.6,
        ease: "power3.out",
        delay: (staggerIndex % 6) * 0.06,
        onComplete: () => {
          // Continuous "in orbit" drift — a slow, gentle, never-quite-
          // repeating float. Each tile gets its own randomized amplitude,
          // duration, and horizontal offset (seeded off staggerIndex so
          // it's stable across re-renders) so the grid doesn't read as a
          // single mechanical wave, but as many independently-drifting
          // tiles. yoyo+repeat:-1 keeps it looping forever at low cost
          // since GSAP just reverses the same tween rather than re-timing.
          const seed = (staggerIndex * 37) % 100;
          const driftY = 6 + (seed % 6); // 6–11px vertical drift
          const driftX = ((seed % 5) - 2) * 1.6; // small, varied horizontal drift
          const duration = 3.2 + (seed % 9) * 0.22; // ~3.2–5.1s, varied per tile

          floatTween.current = gsap.to(el, {
            y: `+=${driftY}`,
            x: `+=${driftX}`,
            duration,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        },
      }
    );

    return () => {
      floatTween.current?.kill();
    };
  }, [loaded, inView, staggerIndex]);

  // If the file 404s or otherwise fails to load, collapse the tile
  // entirely instead of leaving a blank placeholder box in the column.
  if (failed) return null;

  return (
    <div
      ref={wrapperRef}
      className="relative w-full overflow-hidden bg-[#EDEAE3]"
      style={{ opacity: 0 }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Zoom in on ${item.alt}`}
        className="block w-full cursor-pointer focus:outline-none"
      >
        {item.type === "video" ? (
          <video
            ref={videoRef}
            src={item.src}
            className="block w-full h-auto"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onLoadedData={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        ) : (
          <img
            src={item.src}
            alt={item.alt}
            className="block w-full h-auto"
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        )}

        {item.type === "video" && (
          <span className="absolute top-3 right-3 font-[Manrope] text-[9px] tracking-[0.15em] font-semibold uppercase px-2.5 py-1 bg-[#121212]/70 text-[#FAF9F6] backdrop-blur-sm">
            Video
          </span>
        )}
      </button>
    </div>
  );
}

// Fisher-Yates shuffle. Keeps each item's ORIGINAL index attached (as
// __index) so the shuffled tile can still open the right slide in the
// shared lightbox, which navigates by position in the untouched
// `mediaItems` array, not the shuffled render order.
function shuffleWithOriginalIndex(items) {
  const withIndex = items.map((item, __index) => ({ item, __index }));
  for (let i = withIndex.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [withIndex[i], withIndex[j]] = [withIndex[j], withIndex[i]];
  }
  return withIndex;
}

function OrbitGrid({ items, onOpen }) {
  // Shuffled once per mount/items-change (useMemo), not on every re-render
  // — OrbitTile's own state updates (finishing load) would otherwise
  // re-run Math.random() each time and make tiles visibly jump to new
  // positions mid-load.
  const shuffled = useMemo(() => shuffleWithOriginalIndex(items), [items]);

  return (
    <>
      <style>{`
        .orbit-masonry {
          column-count: 2;
          column-gap: 0.75rem;
        }
        .orbit-masonry > * {
          break-inside: avoid;
          margin-bottom: 0.75rem;
        }
        @media (min-width: 640px) {
          .orbit-masonry { column-count: 2; column-gap: 1rem; }
          .orbit-masonry > * { margin-bottom: 1rem; }
        }
        @media (min-width: 1024px) {
          .orbit-masonry { column-count: 3; column-gap: 1.25rem; }
          .orbit-masonry > * { margin-bottom: 1.25rem; }
        }
        @media (min-width: 1536px) {
          .orbit-masonry { column-count: 4; column-gap: 1.5rem; }
          .orbit-masonry > * { margin-bottom: 1.5rem; }
        }
      `}</style>
      <div className="bg-transparent p-2 md:p-3">
        <div className="orbit-masonry">
          {shuffled.map(({ item, __index }, position) => (
            <OrbitTile
              key={__index}
              item={item}
              onOpen={() => onOpen(__index)}
              staggerIndex={position}
            />
          ))}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════ */

// Grid view (default) uses MasonryGrid: a CSS multi-column layout where
// each tile's own h-auto image/video sets its box height — no measuring
// needed, the box just IS the file's natural proportions.
//
// Orbit view uses OrbitGrid, the same masonry mechanism with a larger,
// fewer-column layout: images and videos are shuffled together randomly
// instead of rendering in data order, each tile animates in with GSAP
// (fade/rise/blur-to-focus) as its media finishes loading, and hovering
// a tile scales it down slightly with a soft color-shift overlay.
export default function CreativeVisualsPage() {
  const { activeIndex, openAt, close, prev, next } = useLightbox(mediaItems);
  const [isOrbitLayout, setIsOrbitLayout] = useState(false);
  const [silkOn, setSilkOn] = useState(true);

  return (
    <ServicePageLayout title="Creative Visuals" currentPage="/creative-visuals" fullBleed>
      {/* Fixed, full-viewport Silk background — same treatment as Classic
          E-Commerce Visuals: sits behind page content, doesn't scroll,
          never intercepts clicks/scroll. z-0 (not a negative z-index) so
          it paints above ServicePageLayout's own root gradient but below
          this page's z-10 content wrapper. */}
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

      {/* Nav bar + cinematic hero, same treatment as Classic E-Commerce */}
      <HeroSection
        backgroundSrc="/Creative visuals/4 Ring Banner T4 HQ_.jpg"
        heading={["Creative", "Visuals"]}
        paragraph="A cascading edit of jewellery photography and motion — an interlocking mosaic of every piece."
      />

      <div
        className={`relative z-10 max-w-[1800px] mx-auto overflow-x-hidden ${
          isOrbitLayout
            ? "px-2 sm:px-3 md:px-4 pt-6 md:pt-8 pb-10 md:pb-14"
            : "px-4 sm:px-6 md:px-10 lg:px-16 pt-20 md:pt-28 pb-40 md:pb-56"
        }`}
      >
        {isOrbitLayout ? (
          <div className="relative">
            {/* Icon-only layout toggle, overlaid top-right like the reference */}
            <button
              type="button"
              onClick={() => setIsOrbitLayout((prev) => !prev)}
              aria-label="Switch to grid view"
              title="Switch to grid view"
              className="absolute top-3 right-3 z-20 flex items-center justify-center w-9 h-9 bg-[#FAF9F6] text-[#121212] border border-[#121212]/15 hover:bg-[#121212] hover:text-[#FAF9F6] transition-colors duration-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="M21 12a9 9 0 0 1-15.3 6.4M3 12a9 9 0 0 1 15.3-6.4" />
                <path d="M3 3v6h6" />
                <path d="M21 21v-6h-6" />
              </svg>
            </button>
            <OrbitGrid items={mediaItems} onOpen={openAt} />
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-8 md:mb-12">
              <button
                type="button"
                onClick={() => setIsOrbitLayout((prev) => !prev)}
                className="font-[Manrope] text-[11px] tracking-[0.15em] font-semibold uppercase px-5 py-2.5 border border-[#121212]/25 text-[#121212] hover:bg-[#121212] hover:text-[#FAF9F6] transition-colors duration-300"
              >
                Orbit View
              </button>
            </div>
            <MasonryGrid items={mediaItems} onOpen={openAt} />
          </>
        )}
      </div>

      <LightboxModal
        images={mediaItems.map((m) => ({ src: m.src, alt: m.alt, isVideo: m.type === "video" }))}
        activeIndex={activeIndex}
        onClose={close}
        onPrev={prev}
        onNext={next}
      />
    </ServicePageLayout>
  );
}

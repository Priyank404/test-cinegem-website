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
        {direction === "left" ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}
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
      {canLeft && <ScrollArrow direction="left" onClick={() => goTo(activeIndex - 1)} />}
      <div
        ref={trackRef}
        className="peek-scroll flex gap-3 overflow-x-auto snap-x snap-mandatory max-w-full px-[9%] sm:px-[16%] md:px-[22%]"
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
      {canRight && <ScrollArrow direction="right" onClick={() => goTo(activeIndex + 1)} />}
      <style>{`.peek-scroll::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION DIVIDER — thin gold gradient rule meeting a small faceted
   gem mark at center (echoes the "CINEGEM" mark). Sits on the dark
   Silk background, so it's rendered in cream/gold rather than the
   charcoal tones used on the light service pages. Draws in on scroll,
   matching the site's existing divider convention.
═══════════════════════════════════════════════════════════════════════ */

/* Single main-preview carousel: exactly one media item shown at a
   time, full-size, with prev/next arrows sitting on the preview
   itself — same ScrollArrow component/styling as Section 2, but
   without Section 2's scroll-snap track. No thumbnail strip; the
   preview's height comes from `heightClassName` so it can fill
   whatever vertical space is given to it. Video (if provided) is
   simply the last item in the sequence. Strictly linear — the left
   arrow is absent on the first item, the right arrow on the last —
   so there's no wraparound.
   Swiping works the same as the arrows: a horizontal drag past the
   threshold steps one item at a time. Pointer Events cover touch and
   mouse-drag alike. The listeners live on `window` (attached only
   while a pointer is down) rather than using setPointerCapture, so a
   drag that starts on the video doesn't hijack its native play/seek
   controls; a mostly-vertical drag is ignored so the page can still
   scroll normally. */
function MainPreviewCarousel({ images, videoSrc, heightClassName = "", className = "" }) {
  const media = videoSrc
    ? [...images.map((img) => ({ type: "image", img })), { type: "video" }]
    : images.map((img) => ({ type: "image", img }));

  const [activeIndex, setActiveIndex] = useState(0);
  const active = media[activeIndex];
  const dragStart = useRef(null);

  const canLeft = activeIndex > 0;
  const canRight = activeIndex < media.length - 1;

  const step = (delta) => {
    setActiveIndex((prev) => Math.max(0, Math.min(media.length - 1, prev + delta)));
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
      className={`relative w-full min-w-0 max-w-full [touch-action:pan-y] ${heightClassName} ${className}`}
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

function SectionDivider() {
  return (
    <div className="theme-divider w-full flex items-center justify-center gap-5 md:gap-8 py-2 md:py-4 px-4 sm:px-6 md:px-8 lg:px-10">
      <span
        className="divider-line flex-1 h-px max-w-[420px]"
        style={{
          transformOrigin: "right center",
          background: "linear-gradient(to right, transparent, rgba(197,160,89,0.6))",
        }}
      />
      <svg
        className="divider-gem w-4 h-4 md:w-5 md:h-5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        style={{ filter: "drop-shadow(0 0 6px rgba(197,160,89,0.6))" }}
      >
        <path
          d="M8 4H16L20 9L12 20L4 9L8 4Z"
          fill="rgba(197,160,89,0.15)"
          stroke="#C5A059"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path d="M4 9H20" stroke="#C5A059" strokeWidth="0.75" opacity="0.7" />
        <path d="M8 4L12 20" stroke="#C5A059" strokeWidth="0.6" opacity="0.55" />
        <path d="M16 4L12 20" stroke="#C5A059" strokeWidth="0.6" opacity="0.55" />
      </svg>
      <span
        className="divider-line flex-1 h-px max-w-[420px]"
        style={{
          transformOrigin: "left center",
          background: "linear-gradient(to left, transparent, rgba(197,160,89,0.6))",
        }}
      />
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
      className="w-full flex items-center justify-center px-4 sm:px-6 md:px-8 lg:px-10 py-6 md:py-0"
      style={{ minHeight: "calc(100vh - 80px)" }}
    >
      <div className="w-full max-w-[1800px] mx-auto">
        {/* MOBILE (<md) — stacked. Video is kept to a wide 16:9 rather
            than a tall portrait crop so it doesn't eat the screen and
            push the 2×2 grid (and the rest of the page) further down. */}
        <div className="flex flex-col gap-4 md:hidden">
          <div className="grid grid-cols-2 gap-3 aspect-square">
            {images.map((img, i) => (
              <ImageTile key={i} img={img} />
            ))}
          </div>

          <VideoPlayer videoSrc={videoSrc} className="w-full aspect-video" />
        </div>

        {/* TABLET (md–lg) — same side-by-side idea as desktop, just a
            shorter row height suited to iPad-class viewports instead
            of desktop's 75vh. */}
        <div className="hidden md:flex lg:hidden flex-row gap-6 items-center justify-center h-[52vh]">
          <VideoPlayer videoSrc={videoSrc} className="flex-1 h-full" />
          <div className="h-full aspect-square max-w-[42%] grid grid-cols-2 gap-3 shrink-0">
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
    <section className="w-full px-4 sm:px-6 md:px-8 lg:px-10 py-16 md:py-24">
      <div className="w-full max-w-[1800px] mx-auto">
        {/* MOBILE / TABLET (<lg) — one-at-a-time peek carousel: the
            active image sits centered at full slide size, the next/
            previous image peeks in dimmed at each edge, and the arrows
            (present only when there's somewhere left to go — no loop)
            sit on top of the track so tapping works as well as
            swiping. */}
        <div className="flex flex-col gap-4 lg:hidden">
          <PeekCarousel images={images} />
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
    <section className="w-full px-4 sm:px-6 md:px-8 lg:px-10 py-16 md:py-24">
      <div className="w-full max-w-[1800px] mx-auto">
        {/* MOBILE / TABLET (<lg) — same main-preview container/arrows
            as before (ScrollArrow, same styling), just without the
            thumbnail strip underneath. With that strip gone, the
            preview now fills the height it used to occupy, sized for
            vertical pieces like pendants and chains. Video is the
            last item in the sequence, arrow-navigable like the
            images. No looping at either end. */}
        <div className="lg:hidden">
          <MainPreviewCarousel
            images={[hero, img2, img3, img4]}
            videoSrc={videoSrc}
            heightClassName="h-[58vh] sm:h-[62vh] md:h-[66vh]"
          />
        </div>

        {/* DESKTOP (lg+) — single row, 5 columns: image, image, video
            (center, emphasized), image, image. All height-driven
            (h-full) off the same row height so nothing stretches
            unevenly; the video gets a wider aspect ratio than the
            square tiles so it reads as the focal point without
            breaking the shared-height row. */}
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

      // Ornamental dividers between sections: the two gradient lines
      // draw outward from the center gem, which then pops in with a
      // slight overshoot. Each divider triggers once, independently,
      // the first time it crosses into view — no reverse, since an
      // already-drawn rule shouldn't undraw itself on scroll-back.
      gsap.utils.toArray(".theme-divider", containerRef.current).forEach((divider) => {
        const lines = divider.querySelectorAll(".divider-line");
        const gem = divider.querySelector(".divider-gem");

        gsap.set(lines, { scaleX: 0 });
        gsap.set(gem, { scale: 0, rotate: -30, opacity: 0 });

        gsap
          .timeline({
            scrollTrigger: { trigger: divider, start: "top 88%", once: true },
          })
          .to(lines, { scaleX: 1, duration: 1, ease: "power3.inOut" }, 0)
          .to(
            gem,
            { scale: 1, rotate: 0, opacity: 1, duration: 0.6, ease: "back.out(2.2)" },
            0.35
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
        <SectionDivider />
        <Section2 images={section2Images} videoSrc={videoSrc2} />
        <SectionDivider />
        <Section3 images={section3Images} videoSrc={videoSrc3} />
      </div>
    </ServicePageLayout>
  );
}
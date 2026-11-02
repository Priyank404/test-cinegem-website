// CreativeVisualsPage.jsx
//
// "Creative Visuals" service page with Google Drive & Dynamic Media Sync.
// Automatically fetches images and videos from Google Drive folder (or local public folder).
// Reflects changes in Google Drive automatically on window focus and background polling.
import { useState, useEffect, useRef, useMemo } from "react";
import { ServicePageLayout } from "@/components/shared/ServicePageLayout";
import HeroSection from "@/components/sections/HeroSection";
import RetrieveGridButton from "@/components/ui/RetrieveGridButton";
import { LightboxModal } from "@/components/shared/LightboxModal";
import { useLightbox } from "@/hooks/useLightbox";
import { useDriveMedia } from "@/hooks/useDriveMedia";
import { cleanJewelryAlt } from "@/seo/alt";

// Tracks the true, scrollbar-safe viewport width
function useViewportWidth() {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const update = () => setWidth(document.documentElement.clientWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return width;
}

/* ═══════════════════════════════════════════════════════════════════════
  LAYOUT COMPONENTS
═══════════════════════════════════════════════════════════════════════ */

// Section 1 & 2 layout: video on one side at 50% width, compact 2x2 grid on the other.
function FullWidthVideoWithImagesBelow({ video, images, onOpen, reverse }) {
  const vw = useViewportWidth();
  const videoRef = useRef(null);
  const [videoHeight, setVideoHeight] = useState(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const measure = () => setVideoHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <section className="relative w-full max-w-[1920px] 2xl:max-w-[2040px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10">
      <div className="glassy-container">
        <div
          className={`flex flex-col gap-1 md:items-start ${
            reverse ? "md:flex-row-reverse" : "md:flex-row"
          }`}
        >
          {/* Video: on mobile, video is always on top (rounded-t, rounded-b-none).
              On desktop, outer side corners are rounded (md:rounded-l or md:rounded-r), inner seam is sharp (0px) */}
          <div
            className={`w-full md:w-1/2 overflow-hidden isolate bg-black border-0 rounded-t-[12px] rounded-b-none ${
              reverse
                ? "md:rounded-r-[12px] md:rounded-l-none"
                : "md:rounded-l-[12px] md:rounded-r-none"
            }`}
          >
            <video
              ref={videoRef}
              src={video.src}
              className={`block w-full h-auto [border-radius:inherit] rounded-t-[12px] rounded-b-none ${
                reverse
                  ? "md:rounded-r-[12px] md:rounded-l-none"
                  : "md:rounded-l-[12px] md:rounded-r-none"
              }`}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
          </div>
          {/* Images: compact grid matching the video height.
              On mobile (<md), video is on top, so top row (i=0, 1) meets video with SHARP 0px (no radius in the middle).
              Bottom row (i=6, 7) has outer bottom corners rounded (rounded-bl, rounded-br).
              On desktop (md+), outer corners rounded, inner seam facing video is sharp 0px. */}
          <div
            className="w-full md:w-1/2 grid grid-cols-2 grid-rows-4 gap-1 content-start overflow-hidden bg-transparent"
            style={videoHeight ? { height: videoHeight } : undefined}
          >
            {images.slice(0, 8).map((img, i) => {
              // 2 columns: col 0 = even indices (0, 2, 4, 6), col 1 = odd indices (1, 3, 5, 7)
              // 4 rows: row 0 (0,1), row 1 (2,3), row 2 (4,5), row 3 (6,7)
              let cornerClass = "rounded-none";

              if (!reverse) {
                // Video is on left on desktop:
                // Mobile (<md): top meets video (sharp), bottom row has rounded-bl (i=6) and rounded-br (i=7)
                // Desktop (md+): outer right has md:rounded-tr (i=1) and md:rounded-br (i=7); inner left is sharp (md:rounded-bl-none)
                if (i === 1) cornerClass = "rounded-none md:rounded-tr-[12px]";
                else if (i === 6) cornerClass = "rounded-bl-[12px] md:rounded-bl-none";
                else if (i === 7) cornerClass = "rounded-br-[12px]";
              } else {
                // Video is on right on desktop:
                // Mobile (<md): top meets video (sharp), bottom row has rounded-bl (i=6) and rounded-br (i=7)
                // Desktop (md+): outer left has md:rounded-tl (i=0) and md:rounded-bl (i=6); inner right facing video is sharp (md:rounded-br-none)
                if (i === 0) cornerClass = "rounded-none md:rounded-tl-[12px]";
                else if (i === 6) cornerClass = "rounded-bl-[12px]";
                else if (i === 7) cornerClass = "rounded-br-[12px] md:rounded-br-none";
              }

              return (
                <button
                  key={img.src}
                  type="button"
                  onClick={() => onOpen(img.mediaIndex)}
                  aria-label={`Zoom in on ${img.alt}`}
                  className={`relative block w-full h-full cursor-pointer focus:outline-none overflow-hidden bg-transparent border-0 group ${cornerClass}`}
                >
                  <img
                    src={img.thumb || img.src}
                    alt={img.alt}
                    className="block w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// Intelligent background detector for showcase videos:
// Matches video background (e.g. gradient for turntable, #ffffff for white videos)
// so the full-screen edge-to-edge section seamlessly extends the video background with zero visible seam.
function useVideoBgColor(src, customBg) {
  const [bgStyle, setBgStyle] = useState(() => {
    if (customBg) return customBg;
    if (!src) return "#141416";
    const lower = src.toLowerCase();
    if (
      lower.includes("m-video") ||
      lower.includes("white") ||
      lower.includes("wb") ||
      lower.includes("b4 animated") ||
      lower.includes("e commerce 1") ||
      lower.includes("fk-a1") ||
      lower.includes("s4")
    ) {
      return "#ffffff";
    }
    if (lower.includes("turntable") || lower.includes("black")) {
      return "linear-gradient(to bottom, #171717 0%, #131313 50%, #111111 100%)";
    }
    return "linear-gradient(to bottom, #171717 0%, #131313 50%, #111111 100%)";
  });

  useEffect(() => {
    if (customBg) {
      setBgStyle(customBg);
      return;
    }
    if (!src) return;

    const lower = src.toLowerCase();
    const isKnownWhite =
      lower.includes("m-video") ||
      lower.includes("white") ||
      lower.includes("wb") ||
      lower.includes("b4 animated") ||
      lower.includes("e commerce 1") ||
      lower.includes("fk-a1") ||
      lower.includes("s4");

    if (isKnownWhite) {
      setBgStyle("#ffffff");
      return;
    }

    if (lower.includes("turntable") || lower.includes("black")) {
      setBgStyle("linear-gradient(to bottom, #171717 0%, #131313 50%, #111111 100%)");
      return;
    }

    // Dynamic color sampling from video first frame via offscreen canvas
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.muted = true;
    v.playsInline = true;
    v.src = src;

    const onLoaded = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(v, 0, 0, 32, 32);

        // Sample top edge and bottom edge
        const topData = ctx.getImageData(16, 1, 1, 1).data;
        const btmData = ctx.getImageData(16, 30, 1, 1).data;

        const topLum = topData[0] * 0.299 + topData[1] * 0.587 + topData[2] * 0.114;
        if (topLum > 230) {
          setBgStyle("#ffffff");
        } else {
          const topRgb = `rgb(${topData[0]}, ${topData[1]}, ${topData[2]})`;
          const btmRgb = `rgb(${btmData[0]}, ${btmData[1]}, ${btmData[2]})`;
          setBgStyle(`linear-gradient(to bottom, ${topRgb} 0%, ${btmRgb} 100%)`);
        }
      } catch {
        // Fallback remains current style
      } finally {
        v.remove();
      }
    };

    v.addEventListener("loadeddata", onLoaded);
    v.load();
    return () => {
      v.removeEventListener("loadeddata", onLoaded);
      v.src = "";
    };
  }, [src, customBg]);

  return bgStyle;
}

// Full-screen showcase video (Section 3 & 5)
// Spans the full viewport width (100vw) and height (100vh).
// Sticks to the whole screen with a magnetic lock for an immersive showcase.
function FullWidthVideo({ src, driftUp, bgColor }) {
  const trackRef = useRef(null);
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const vw = useViewportWidth();
  const bgStyle = useVideoBgColor(src, bgColor);
  const isSnappingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => {
      const rect = track.getBoundingClientRect();
      const vh = window.innerHeight;

      if (driftUp) {
        const total = rect.height - vh;
        if (total > 0) {
          const scrolled = -rect.top;
          const progress = Math.min(1, Math.max(0, scrolled / total));
          setOffset(progress * -40);
        }
      }

      // Magnetic snap: when the user stops scrolling close to top: 0, lock it flush
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        if (isSnappingRef.current) return;
        const currentRect = track.getBoundingClientRect();
        // If within magnetic lock zone (-60px to 120px)
        if (currentRect.top > -60 && currentRect.top < 120 && Math.abs(currentRect.top) > 2) {
          isSnappingRef.current = true;
          const targetScroll = window.scrollY + currentRect.top;
          window.scrollTo({
            top: targetScroll,
            behavior: "smooth",
          });
          setTimeout(() => {
            isSnappingRef.current = false;
          }, 500);
        }
      }, 80);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [driftUp]);

  return (
    <div
      ref={trackRef}
      className="fullscreen-video-track relative w-full"
      style={{
        height: "190vh",
        scrollSnapAlign: "start",
        scrollSnapStop: "normal",
      }}
    >
      <section
        ref={sectionRef}
        className="sticky top-0 w-screen min-h-screen h-screen flex items-center justify-center overflow-hidden my-0 z-20"
        style={{
          background: bgStyle,
          marginLeft: vw ? `calc(50% - ${vw / 2}px)` : undefined,
          marginRight: vw ? `calc(50% - ${vw / 2}px)` : undefined,
          width: vw ? `${vw}px` : "100vw",
          height: "100vh",
        }}
      >
        <video
          ref={videoRef}
          src={src}
          crossOrigin="anonymous"
          className="block w-full h-full max-h-screen max-w-full object-contain select-none"
          style={{
            ...(driftUp ? { transform: `translateY(${offset}px)` } : {}),
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 2%, black 98%, transparent 100%)",
            maskImage:
              "linear-gradient(to right, transparent 0%, black 2%, black 98%, transparent 100%)",
          }}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      </section>
    </div>
  );
}

// Long image pair (Section 4)
function LongImagePair({ images, onOpen }) {
  return (
    <section className="relative w-full max-w-[1920px] 2xl:max-w-[2040px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10">
      <div className="glassy-container">
        <div className="flex flex-col md:flex-row gap-1">
          {images.map((img, i) => {
            const cornerClass =
              i === 0
                ? "rounded-t-[12px] md:rounded-t-none md:rounded-l-[12px] md:rounded-r-none"
                : "rounded-b-[12px] md:rounded-b-none md:rounded-r-[12px] md:rounded-l-none";
            return (
              <button
                key={img.src}
                type="button"
                onClick={() => onOpen?.(img.mediaIndex)}
                className={`block ${images.length === 1 ? "w-full rounded-[12px]" : "w-full md:w-1/2"} cursor-pointer focus:outline-none group overflow-hidden bg-transparent border-0 ${images.length > 1 ? cornerClass : ""}`}
              >
                <img
                  src={img.thumb || img.src}
                  alt={img.alt}
                  loading="lazy"
                  decoding="async"
                  className="block w-full h-auto transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
  DYNAMIC SCROLL STORY LAYOUT
  Dynamically maps any number of images & videos through the 5-section
  luxury editorial structure, repeating in 18-image cycles so users can
  add as many images and videos as they want to Google Drive.
═══════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════
   ORIGINAL NORMAL GRID LAYOUT COMPONENTS (Retrieved when in normal mode)
   Authentic full-bleed edge-to-edge layout, natural gap-4 spacing,
   unconstrained video & image proportions from original design.
═══════════════════════════════════════════════════════════════════════ */

function OriginalVideoWithImages({ video, images, onOpen, reverse }) {
  const vw = useViewportWidth();
  const videoRef = useRef(null);
  const [videoHeight, setVideoHeight] = useState(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const measure = () => setVideoHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <section
      className="relative w-auto bg-transparent"
      style={vw ? { marginLeft: `calc(50% - ${vw / 2}px)`, marginRight: `calc(50% - ${vw / 2}px)` } : undefined}
    >
      <div
        className={`flex flex-col gap-4 md:items-start ${
          reverse ? "md:flex-row-reverse" : "md:flex-row"
        }`}
      >
        <div className="w-full md:w-1/2">
          <video
            ref={videoRef}
            src={video.src}
            className="block w-full h-auto"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        </div>
        <div
          className="w-full md:w-1/2 grid grid-cols-2 grid-rows-4 gap-4 content-start overflow-hidden bg-transparent"
          style={videoHeight ? { height: videoHeight } : undefined}
        >
          {images.slice(0, 8).map((img) => (
            <button
              key={img.src}
              type="button"
              onClick={() => onOpen(img.mediaIndex)}
              aria-label={`Zoom in on ${img.alt}`}
              className="relative block w-full h-full cursor-pointer focus:outline-none overflow-hidden group"
            >
              <img
                src={img.thumb || img.src}
                alt={img.alt}
                className="block w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function OriginalFullWidthVideo({ src, driftUp }) {
  const trackRef = useRef(null);
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const vw = useViewportWidth();
  const bgStyle = useVideoBgColor(src);
  const isSnappingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => {
      const rect = track.getBoundingClientRect();
      const vh = window.innerHeight;

      if (driftUp) {
        const total = rect.height - vh;
        if (total > 0) {
          const scrolled = -rect.top;
          const progress = Math.min(1, Math.max(0, scrolled / total));
          setOffset(progress * -40);
        }
      }

      // Magnetic snap: when the user stops scrolling close to top: 0, lock it flush
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        if (isSnappingRef.current) return;
        const currentRect = track.getBoundingClientRect();
        // If within magnetic lock zone (-60px to 120px)
        if (currentRect.top > -60 && currentRect.top < 120 && Math.abs(currentRect.top) > 2) {
          isSnappingRef.current = true;
          const targetScroll = window.scrollY + currentRect.top;
          window.scrollTo({
            top: targetScroll,
            behavior: "smooth",
          });
          setTimeout(() => {
            isSnappingRef.current = false;
          }, 500);
        }
      }, 80);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [driftUp]);

  return (
    <div
      ref={trackRef}
      className="fullscreen-video-track relative w-full"
      style={{
        height: "190vh",
        scrollSnapAlign: "start",
        scrollSnapStop: "normal",
      }}
    >
      <section
        ref={sectionRef}
        className="sticky top-0 w-screen min-h-screen h-screen flex items-center justify-center overflow-hidden my-0 z-20"
        style={{
          background: bgStyle,
          marginLeft: vw ? `calc(50% - ${vw / 2}px)` : undefined,
          marginRight: vw ? `calc(50% - ${vw / 2}px)` : undefined,
          width: vw ? `${vw}px` : "100vw",
          height: "100vh",
        }}
      >
        <video
          ref={videoRef}
          src={src}
          crossOrigin="anonymous"
          className="block w-full h-full max-h-screen max-w-full object-contain select-none"
          style={{
            ...(driftUp ? { transform: `translateY(${offset}px)` } : {}),
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 2%, black 98%, transparent 100%)",
            maskImage:
              "linear-gradient(to right, transparent 0%, black 2%, black 98%, transparent 100%)",
          }}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      </section>
    </div>
  );
}

function OriginalLongImagePair({ images, onOpen }) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      {images.map((img) => (
        <button
          key={img.src}
          type="button"
          onClick={() => onOpen?.(img.mediaIndex)}
          className="block w-full md:w-1/2 cursor-pointer focus:outline-none overflow-hidden group"
        >
          <img
            src={img.thumb || img.src}
            alt={img.alt}
            loading="lazy"
            decoding="async"
            className="block w-full h-auto transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </button>
      ))}
    </div>
  );
}

function ScrollStoryLayout({ mediaItems, images, videos, onOpen, isClean }) {
  const findIndex = (src) => mediaItems.findIndex((m) => m.src === src);

  const getVideo = (index, fallbackSrc) => {
    if (videos && videos.length > 0) {
      return videos[index] || videos[index % videos.length];
    }
    return { src: fallbackSrc, alt: "Cinegem Studio Video" };
  };

  // Dynamically calculate the number of 18-image story cycles needed
  const numCycles = Math.max(1, Math.ceil(images.length / 18));

  const cycles = useMemo(() => {
    const list = [];
    const hasDriveVideos = videos && videos.length > 0;

    for (let c = 0; c < numCycles; c++) {
      const cImages = images.slice(c * 18, (c + 1) * 18).map((img) => ({
        ...img,
        mediaIndex: findIndex(img.src),
      }));

      // Section 1: 8 images, Section 2: 8 images, Section 4: 2 images
      const s1Images = cImages.slice(0, 8);
      const s2Images = cImages.slice(8, 16);
      const s4Images = cImages.slice(16, 18);

      const v1 = getVideo(c * 4 + 0, "/Creative visuals/A6-R3-HQ.mp4");
      const v2 = getVideo(c * 4 + 1, "/Creative visuals/KC-A01-TR1 .mp4");
      const v3 =
        (hasDriveVideos && videos.length > c * 4 + 2) || c === 0
          ? getVideo(c * 4 + 2, "/Creative visuals/M-Video.mp4")
          : null;
      const v4 =
        (hasDriveVideos && videos.length > c * 4 + 3) || c === 0
          ? getVideo(c * 4 + 3, "/Creative visuals/360 Turntable black.mp4")
          : null;

      list.push({
        cycleIndex: c,
        s1Images,
        s2Images,
        s4Images,
        v1,
        v2,
        v3,
        v4,
      });
    }
    return list;
  }, [images, videos, numCycles, mediaItems]);

  return (
    <div className="flex flex-col gap-16 md:gap-24">
      {cycles.map(({ cycleIndex, s1Images, s2Images, s4Images, v1, v2, v3, v4 }) => (
        <div key={`cycle-${cycleIndex}`} className="flex flex-col gap-16 md:gap-24">
          {/* Section 1: Video Left + 8 Images Right */}
          {s1Images.length > 0 && v1 && (
            isClean ? (
              <OriginalVideoWithImages video={v1} images={s1Images} onOpen={onOpen} />
            ) : (
              <FullWidthVideoWithImagesBelow video={v1} images={s1Images} onOpen={onOpen} />
            )
          )}

          {/* Section 2: 8 Images Left + Video Right */}
          {s2Images.length > 0 && v2 && (
            isClean ? (
              <OriginalVideoWithImages video={v2} images={s2Images} onOpen={onOpen} reverse={true} />
            ) : (
              <FullWidthVideoWithImagesBelow video={v2} images={s2Images} onOpen={onOpen} reverse={true} />
            )
          )}

          {/* Section 3: Full-Width Showcase Video */}
          {v3 && (
            isClean ? (
              <OriginalFullWidthVideo src={v3.src} />
            ) : (
              <FullWidthVideo src={v3.src} />
            )
          )}

          {/* Section 4: Dual Images Side-by-Side */}
          {s4Images.length > 0 && (
            isClean ? (
              <OriginalLongImagePair images={s4Images} onOpen={onOpen} />
            ) : (
              <LongImagePair images={s4Images} onOpen={onOpen} />
            )
          )}

          {/* Section 5: Parallax Turntable Video */}
          {v4 && (
            isClean ? (
              <OriginalFullWidthVideo src={v4.src} driftUp />
            ) : (
              <FullWidthVideo src={v4.src} driftUp />
            )
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
  MAIN PAGE COMPONENT
═══════════════════════════════════════════════════════════════════════ */
export default function CreativeVisualsPage() {
  const {
    items,
    images,
    videos,
    total,
    loading,
    isFallback,
    lastSynced,
    refresh,
  } = useDriveMedia("Creative visuals");

  // Hook up Lightbox with dynamically loaded items
  const { activeIndex, openAt, close, prev, next } = useLightbox(items);
  const [isCleanGrid, setIsCleanGrid] = useState(false);

  // Hero background image: pick first banner or first available image
  const heroBackgroundSrc = useMemo(() => {
    const banner = images.find((i) => {
      const name = (i.filename || i.alt || i.src || "").toLowerCase();
      return name.includes("banner") || name.includes("hero");
    });
    if (banner) return banner.src;
    if (images.length > 0) return images[0].src;
    return "/Creative visuals/4 Ring Banner T4 HQ_.jpg";
  }, [images]);

  // Separate story images so dedicated banner/hero image doesn't displace 1.png - 18.png
  const storyImages = useMemo(() => {
    const filtered = images.filter((i) => {
      const name = (i.filename || i.alt || i.src || "").toLowerCase();
      return !name.includes("banner") && !name.includes("hero");
    });
    const list = filtered.length > 0 ? filtered : images;
    return list.map((item) => ({
      ...item,
      alt: cleanJewelryAlt(item, "Creative Visuals"),
    }));
  }, [images]);

  return (
    <ServicePageLayout title="Creative Visuals" currentPage="/creative-visuals" fullBleed>
      {/* Floating Toggle: Retrieve clean grid without glassy container */}
      <RetrieveGridButton isClean={isCleanGrid} onToggle={setIsCleanGrid} pageName="Creative Visuals" />

      {/* Nav bar + cinematic hero */}
      <HeroSection
        backgroundSrc={heroBackgroundSrc}
        heading={["Creative", "Visuals"]}
        paragraph="A cascading edit of jewellery photography and motion — an interlocking mosaic of every piece."
      />

      <div className={`relative z-10 w-full overflow-x-clip pb-40 md:pb-56 ${isCleanGrid ? "px-4 sm:px-6 md:px-10 lg:px-16" : ""}`}>
        <ScrollStoryLayout
          mediaItems={items}
          images={storyImages}
          videos={videos}
          onOpen={openAt}
          isClean={isCleanGrid}
        />
      </div>

      {/* Lightbox Modal */}
      <LightboxModal
        images={items.map((m) => ({ src: m.full || m.src, alt: m.alt, isVideo: m.type === "video" }))}
        activeIndex={activeIndex}
        onClose={close}
        onPrev={prev}
        onNext={next}
      />
    </ServicePageLayout>
  );
}

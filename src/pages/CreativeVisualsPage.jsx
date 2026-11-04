// CreativeVisualsPage.jsx
//
// "Creative Visuals" service page with Google Drive & Dynamic Media Sync.
// Automatically fetches images and videos from Google Drive folder (or local public folder).
// Reflects changes in Google Drive automatically on window focus and background polling.
import { useState, useEffect, useRef, useMemo } from "react";
import { ServicePageLayout } from "@/components/shared/ServicePageLayout";
import HeroSection from "@/components/sections/HeroSection";
import GlassyGallery from "@/components/shared/GlassyGallery";
import { useMediaFolder } from "@/hooks/useMediaFolder";
import { cleanJewelryAlt } from "@/seo/alt";
import { UniversalMediaTile } from "@/components/shared/UniversalMediaTile";
import { resolveMediaForPosition, isMediaVideo } from "@/utils/mediaPositioning";

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

// Section 1 & 2 layout: featured media on one side (50% width), 2-column by 4-row square grid on the other.
// Both sides use UniversalMediaTile so any slot can be image or video based on filename position.
// Crucially, the 8 grid items define their own aspect-square (1:1), so the container NEVER squeezes down.
function FullWidthVideoWithImagesBelow({
  featuredMedia,
  gridMedia = [],
  onOpen,
  reverse = false,
  // legacy aliases for backward compatibility
  video,
  images,
}) {
  const activeFeatured = featuredMedia || video;
  const activeGrid = gridMedia && gridMedia.length > 0 ? gridMedia : (images || []);

  return (
    <section className="relative w-full max-w-[1920px] 2xl:max-w-[2040px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10">
      <div className="glassy-container">
        <div
          className={`flex flex-col gap-1 md:items-stretch ${
            reverse ? "md:flex-row-reverse" : "md:flex-row"
          }`}
        >
          {/* Featured media (Position 1 on left, or Position 18 on right):
              Stretches to match the 4-row grid height. If media is 1:1, the container does NOT squeeze! */}
          <div
            onClick={() => onOpen?.(activeFeatured)}
            className={`w-full md:w-1/2 self-stretch min-h-0 relative overflow-hidden isolate bg-black border-0 rounded-t-[12px] rounded-b-none cursor-pointer flex items-center justify-center ${
              reverse
                ? "md:rounded-r-[12px] md:rounded-l-none"
                : "md:rounded-l-[12px] md:rounded-r-none"
            }`}
          >
            <UniversalMediaTile
              media={activeFeatured}
              className={`w-full h-full [border-radius:inherit] rounded-t-[12px] rounded-b-none ${
                reverse
                  ? "md:rounded-r-[12px] md:rounded-l-none"
                  : "md:rounded-l-[12px] md:rounded-r-none"
              }`}
              videoClassName="w-full h-full object-cover block"
              imageClassName="w-full h-full object-cover block"
            />
          </div>

          {/* 8-cell Grid (Positions 2..9 or 10..17):
              2 columns of true 1:1 squares (aspect-square).
              Because each cell is aspect-square, this container dictates its own natural height
              and is NEVER squeezed by whatever aspect ratio media is placed in the featured box! */}
          <div className="w-full md:w-1/2 grid grid-cols-2 gap-1 content-start overflow-hidden bg-transparent">
            {activeGrid.slice(0, 8).map((item, i) => {
              let cornerClass = "rounded-none";

              if (!reverse) {
                // Featured is on left on desktop:
                // Mobile (<md): top meets featured (sharp), bottom row has rounded-bl (i=6) and rounded-br (i=7)
                // Desktop (md+): outer right has md:rounded-tr (i=1) and md:rounded-br (i=7); inner left is sharp (md:rounded-bl-none)
                if (i === 1) cornerClass = "rounded-none md:rounded-tr-[12px]";
                else if (i === 6) cornerClass = "rounded-bl-[12px] md:rounded-bl-none";
                else if (i === 7) cornerClass = "rounded-br-[12px]";
              } else {
                // Featured is on right on desktop:
                // Mobile (<md): top meets featured (sharp), bottom row has rounded-bl (i=6) and rounded-br (i=7)
                // Desktop (md+): outer left has md:rounded-tl (i=0) and md:rounded-bl (i=6); inner right facing featured is sharp (md:rounded-br-none)
                if (i === 0) cornerClass = "rounded-none md:rounded-tl-[12px]";
                else if (i === 6) cornerClass = "rounded-bl-[12px]";
                else if (i === 7) cornerClass = "rounded-br-[12px] md:rounded-br-none";
              }

              return (
                <div
                  key={item?.src || i}
                  className={`relative block w-full aspect-square overflow-hidden bg-transparent border-0 ${cornerClass}`}
                >
                  <UniversalMediaTile
                    media={item}
                    onClick={onOpen}
                    className={`w-full h-full aspect-square ${cornerClass}`}
                    videoClassName="w-full h-full aspect-square object-cover block"
                    imageClassName="w-full h-full aspect-square object-cover block"
                  />
                </div>
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

// Full-screen showcase media (Section 3 & 5)
// Spans the full viewport width (100vw) and height (100vh).
// Sticks to the whole screen with a magnetic lock for an immersive showcase.
function FullWidthVideo({ src, media, driftUp, bgColor, onOpen }) {
  const activeMedia = media || { src, isVideo: isMediaVideo(src) };
  const trackRef = useRef(null);
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const vw = useViewportWidth();
  const bgStyle = useVideoBgColor(activeMedia?.src || src, bgColor);
  const isSnappingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const isVideo = isMediaVideo(activeMedia);

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
        {isVideo ? (
          <video
            ref={videoRef}
            src={activeMedia?.src || src}
            crossOrigin="anonymous"
            onClick={() => onOpen?.(activeMedia)}
            className="block w-full h-full max-h-screen max-w-full object-contain select-none cursor-pointer"
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
        ) : (
          <img
            src={activeMedia?.thumb || activeMedia?.src || src}
            alt={activeMedia?.alt || "Cinegem Studio Showcase"}
            onClick={() => onOpen?.(activeMedia)}
            className="block w-full h-full max-h-screen max-w-full object-contain select-none cursor-pointer"
            style={{
              ...(driftUp ? { transform: `translateY(${offset}px)` } : {}),
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, black 2%, black 98%, transparent 100%)",
              maskImage:
                "linear-gradient(to right, transparent 0%, black 2%, black 98%, transparent 100%)",
            }}
          />
        )}
      </section>
    </div>
  );
}

// Long media pair (Section 4)
function LongImagePair({ images, onOpen }) {
  return (
    <section className="relative w-full max-w-[1920px] 2xl:max-w-[2040px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10">
      <div className="glassy-container">
        <div className="flex flex-col md:flex-row gap-1">
          {images.map((item, i) => {
            const cornerClass =
              i === 0
                ? "rounded-t-[12px] md:rounded-t-none md:rounded-l-[12px] md:rounded-r-none"
                : "rounded-b-[12px] md:rounded-b-none md:rounded-r-[12px] md:rounded-l-none";
            return (
              <div
                key={item?.src || i}
                onClick={() => onOpen?.(item)}
                className={`block ${images.length === 1 ? "w-full rounded-[12px]" : "w-full md:w-1/2"} cursor-pointer focus:outline-none group overflow-hidden bg-transparent border-0 ${images.length > 1 ? cornerClass : ""}`}
              >
                <UniversalMediaTile
                  media={item}
                  onClick={onOpen}
                  className="block w-full h-auto"
                />
              </div>
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
              onClick={() => onOpen?.(img)}
              aria-label={`Zoom in on ${img.alt}`}
              className="relative block w-full h-full cursor-pointer focus:outline-none overflow-hidden group"
            >
              <img
                src={img.thumb || img.src}
                alt={img.alt}
                className="block w-full h-full object-cover"
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
          onClick={() => onOpen?.({ src, isVideo: true })}
          className="block w-full h-full max-h-screen max-w-full object-contain select-none cursor-pointer"
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
          onClick={() => onOpen?.(img)}
          className="block w-full md:w-1/2 cursor-pointer focus:outline-none overflow-hidden group"
        >
          <img
            src={img.thumb || img.src}
            alt={img.alt}
            loading="lazy"
            decoding="async"
            className="block w-full h-auto"
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

      // Fallback media if no numbered filename override is present
      const s1FallbackImages = cImages.slice(0, 8);
      const s2FallbackImages = cImages.slice(8, 16);
      const s4FallbackImages = cImages.slice(16, 18);

      const v1Fallback = getVideo(c * 4 + 0, "/Creative visuals/A6-R3-HQ.mp4");
      const v2Fallback = getVideo(c * 4 + 1, "/Creative visuals/KC-A01-TR1 .mp4");
      const v3Fallback =
        (hasDriveVideos && videos.length > c * 4 + 2) || c === 0
          ? getVideo(c * 4 + 2, "/Creative visuals/M-Video.mp4")
          : null;
      const v4Fallback =
        (hasDriveVideos && videos.length > c * 4 + 3) || c === 0
          ? getVideo(c * 4 + 3, "/Creative visuals/360 Turntable black.mp4")
          : null;

      // UNIVERSAL POSITION-BASED MEDIA RESOLUTION:
      // Position 1: Featured Left (Section 1) — Blue Box
      const s1Featured = resolveMediaForPosition(mediaItems, 1 + c * 22, v1Fallback);

      // Positions 2..9: 8 Grid Tiles (Section 1) — Red Box is Position 2
      const s1Grid = [2, 3, 4, 5, 6, 7, 8, 9].map((pos, i) =>
        resolveMediaForPosition(mediaItems, pos + c * 22, s1FallbackImages[i])
      );

      // Positions 10..17: 8 Grid Tiles (Section 2)
      const s2Grid = [10, 11, 12, 13, 14, 15, 16, 17].map((pos, i) =>
        resolveMediaForPosition(mediaItems, pos + c * 22, s2FallbackImages[i])
      );

      // Position 18: Featured Right (Section 2)
      const s2Featured = resolveMediaForPosition(mediaItems, 18 + c * 22, v2Fallback);

      // Position 19: Full-width showcase video / image (Section 3)
      const s3Media = resolveMediaForPosition(mediaItems, 19 + c * 22, v3Fallback);

      // Positions 20, 21: Dual side-by-side media (Section 4)
      const s4Media = [20, 21].map((pos, i) =>
        resolveMediaForPosition(mediaItems, pos + c * 22, s4FallbackImages[i])
      );

      // Position 22: Parallax Turntable media (Section 5)
      const s5Media = resolveMediaForPosition(mediaItems, 22 + c * 22, v4Fallback);

      list.push({
        cycleIndex: c,
        s1Featured,
        s1Grid,
        s2Grid,
        s2Featured,
        s3Media,
        s4Media,
        s5Media,
      });
    }
    return list;
  }, [images, videos, numCycles, mediaItems]);

  return (
    <div className="flex flex-col gap-16 md:gap-24">
      {cycles.map(({ cycleIndex, s1Featured, s1Grid, s2Grid, s2Featured, s3Media, s4Media, s5Media }) => (
        <div key={`cycle-${cycleIndex}`} className="flex flex-col gap-16 md:gap-24">
          {/* Section 1: Featured Left (Pos 1) + 8 Grid Right (Pos 2..9) */}
          {s1Featured && s1Grid.length > 0 && (
            <FullWidthVideoWithImagesBelow
              featuredMedia={s1Featured}
              gridMedia={s1Grid}
              onOpen={onOpen}
            />
          )}

          {/* Section 2: 8 Grid Left (Pos 10..17) + Featured Right (Pos 18) */}
          {s2Featured && s2Grid.length > 0 && (
            <FullWidthVideoWithImagesBelow
              featuredMedia={s2Featured}
              gridMedia={s2Grid}
              onOpen={onOpen}
              reverse={true}
            />
          )}

          {/* Section 3: Full-Width Showcase Video / Image (Pos 19) */}
          {s3Media && (
            <FullWidthVideo media={s3Media} src={s3Media.src} onOpen={onOpen} />
          )}

          {/* Section 4: Dual Media Side-by-Side (Pos 20, 21) */}
          {s4Media.length > 0 && (
            <LongImagePair images={s4Media} onOpen={onOpen} />
          )}

          {/* Section 5: Parallax Turntable Media (Pos 22) */}
          {s5Media && (
            <FullWidthVideo media={s5Media} src={s5Media.src} driftUp onOpen={onOpen} />
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
  } = useMediaFolder("creative-visuals");

  const [galleryIndex, setGalleryIndex] = useState(null);

  // Hero background image: pick first banner, hero, or 0. item
  const heroBackgroundSrc = useMemo(() => {
    const banner = (items || []).find((i) => {
      const name = (i.filename || i.name || i.alt || i.src || "").toLowerCase();
      return name.includes("banner") || name.includes("hero") || name.startsWith("0.") || name.startsWith("0_") || name.startsWith("0-");
    });
    if (banner) return banner.src;
    if (images.length > 0) return images[0].src;
    return "/Creative visuals/4 Ring Banner T4 HQ_.jpg";
  }, [items, images]);

  // Separate story images so dedicated banner/hero image doesn't displace 1.png - 18.png
  const storyImages = useMemo(() => {
    const filtered = images.filter((i) => {
      const name = (i.filename || i.name || i.alt || i.src || "").toLowerCase();
      return !name.includes("banner") && !name.includes("hero") && !name.startsWith("0.") && !name.startsWith("0_") && !name.startsWith("0-");
    });
    const list = filtered.length > 0 ? filtered : images;
    return list.map((item) => ({
      ...item,
      alt: cleanJewelryAlt(item, "Creative Visuals"),
    }));
  }, [images]);

  const allCreativeMedia = useMemo(() => {
    const list = [];
    if (items && items.length > 0) {
      items.forEach((item) => {
        if (!list.some((existing) => existing.src === item.src)) {
          list.push({
            ...item,
            isVideo: isMediaVideo(item),
            alt: cleanJewelryAlt(item, "Creative Visuals"),
          });
        }
      });
    } else {
      storyImages.forEach((img) => list.push(img));
      if (videos && videos.length > 0) {
        videos.forEach((v) => {
          if (!list.some((item) => item.src === v.src)) {
            list.push({ ...v, isVideo: true });
          }
        });
      } else {
        [
          "/Creative visuals/A6-R3-HQ.mp4",
          "/Creative visuals/KC-A01-TR1 .mp4",
          "/Creative visuals/M-Video.mp4",
          "/Creative visuals/360 Turntable black.mp4",
        ].forEach((src) => {
          if (!list.some((item) => item.src === src)) {
            list.push({ src, isVideo: true, alt: "Creative Visuals Motion Showcase" });
          }
        });
      }
    }
    return list;
  }, [items, storyImages, videos]);

  const handleOpenMedia = (media) => {
    const targetSrc = typeof media === "string" ? media : media?.src;
    const idx = allCreativeMedia.findIndex((item) => item.src === targetSrc);
    setGalleryIndex(idx !== -1 ? idx : 0);
  };

  return (
    <ServicePageLayout title="Creative Visuals" currentPage="/creative-visuals" fullBleed>
      {/* Nav bar + cinematic hero */}
      <HeroSection
        backgroundSrc={heroBackgroundSrc}
        heading={["Creative", "Visuals"]}
        paragraph="A cascading edit of jewellery photography and motion — an interlocking mosaic of every piece."
      />

      <div className="relative z-10 w-full overflow-x-clip pb-40 md:pb-56">
        <ScrollStoryLayout
          mediaItems={items}
          images={storyImages}
          videos={videos}
          onOpen={handleOpenMedia}
        />
      </div>

      {/* Glassy Gallery Modal */}
      <GlassyGallery
        images={allCreativeMedia}
        activeIndex={galleryIndex}
        onClose={() => setGalleryIndex(null)}
        onSelect={setGalleryIndex}
      />
    </ServicePageLayout>
  );
}

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
import FullScreenShowcase, { useViewportWidth, useVideoBgColor } from "@/components/shared/FullScreenShowcase";
import CreativeVisualsDevControls from "@/components/dev/CreativeVisualsDevControls";
import { isDevMode } from "@/config/env";
import {
  resolveMediaForPosition,
  resolveFullScreenMedia,
  filterGridMedia,
  isMediaVideo,
} from "@/utils/mediaPositioning";

// Backwards-compatible alias for FullScreenShowcase
const FullWidthVideo = FullScreenShowcase;

/* ═══════════════════════════════════════════════════════════════════════
  LAYOUT COMPONENTS
═══════════════════════════════════════════════════════════════════════ */

// Section 1 & 3 layout: featured media on one side (50% width), 2-column dynamic-row square grid on the other.
// Both sides use UniversalMediaTile so any slot can be image or video based on filename position.
// Crucially, the grid items define their own aspect-square (1:1), so the container NEVER squeezes down.
// Featured media automatically stretches to match whatever height the grid row count dictates (1 to 6 rows).
function FullWidthVideoWithImagesBelow({
  featuredMedia,
  gridMedia = [],
  onOpen,
  reverse = false,
  rows = 4,
  // legacy aliases for backward compatibility
  video,
  images,
}) {
  const activeFeatured = featuredMedia || video;
  const activeGrid = gridMedia && gridMedia.length > 0 ? gridMedia : (images || []);
  const maxItems = Math.max(2, rows * 2);
  const displayItems = activeGrid.slice(0, maxItems);

  // Compute row boundaries for corner classes based on actual rendered rows
  const actualRows = Math.max(1, Math.ceil(displayItems.length / 2));
  const lastLeftIndex = Math.max(0, (actualRows - 1) * 2);
  const lastRightIndex = lastLeftIndex + 1;
  const totalDisplay = displayItems.length;

  return (
    <section className="relative w-full max-w-[1920px] 2xl:max-w-[2040px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10">
      <div className="glassy-container">
        <div
          className={`flex flex-col gap-1 md:items-stretch ${
            reverse ? "md:flex-row-reverse" : "md:flex-row"
          }`}
        >
          {/* Featured media (Position 1 on left, or Position 18 on right):
              Crucial: On desktop, this must NOT expand the flex container height.
              The grid strictly dictates the row height, and this featured wrapper
              stretches to match that exact height, shrinking the video and glassy container. */}
          <div
            onClick={() => onOpen?.(activeFeatured)}
            className={`w-full md:w-1/2 md:flex-1 relative self-stretch min-h-0 overflow-hidden isolate bg-black border-0 rounded-t-[12px] md:rounded-t-none cursor-pointer aspect-[4/5] sm:aspect-square md:aspect-auto ${
              reverse
                ? "md:rounded-r-[12px] md:rounded-l-none"
                : "md:rounded-l-[12px] md:rounded-r-none"
            }`}
          >
            <div className="w-full h-full md:absolute md:inset-0 overflow-hidden [border-radius:inherit] flex items-center justify-center">
              <UniversalMediaTile
                media={activeFeatured}
                className={`w-full h-full [border-radius:inherit] rounded-t-[12px] md:rounded-t-none ${
                  reverse
                    ? "md:rounded-r-[12px] md:rounded-l-none"
                    : "md:rounded-l-[12px] md:rounded-r-none"
                }`}
                videoClassName="w-full h-full object-cover block"
                imageClassName="w-full h-full object-cover block"
              />
            </div>
          </div>

          {/* Dynamic 2-column Grid (1 to 6 rows):
              2 columns of true 1:1 squares (aspect-square).
              Because each cell is aspect-square, this container dictates its own natural height
              and controls the height of the entire section! */}
          <div className="w-full md:w-1/2 md:flex-1 grid grid-cols-2 gap-1 content-start overflow-hidden bg-transparent">
            {displayItems.map((item, i) => {
              let cornerClass = "rounded-none";

              if (!reverse) {
                // Featured is on left on desktop:
                // Desktop: outer top right
                if (i === 1) cornerClass = "rounded-none md:rounded-tr-[12px]";
                // Bottom row:
                if (i === lastLeftIndex) {
                  cornerClass = "rounded-bl-[12px] md:rounded-bl-none";
                } else if (i === lastRightIndex || (i === totalDisplay - 1 && i % 2 === 1)) {
                  cornerClass = "rounded-br-[12px]";
                }
              } else {
                // Featured is on right on desktop:
                // Desktop: outer top left
                if (i === 0) cornerClass = "rounded-none md:rounded-tl-[12px]";
                // Bottom row:
                if (i === lastLeftIndex) {
                  cornerClass = "rounded-bl-[12px]";
                } else if (i === lastRightIndex || (i === totalDisplay - 1 && i % 2 === 1)) {
                  cornerClass = "rounded-br-[12px] md:rounded-br-none";
                }
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

// Section 3 & 4 full-screen showcase components are imported from @/components/shared/FullScreenShowcase

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


function ScrollStoryLayout({
  mediaItems,
  images,
  videos,
  onOpen,
  isClean,
  grid1Rows = 3,
  grid2Rows = 4,
}) {
  const findIndex = (src) => mediaItems.findIndex((m) => m.src === src);

  const getVideo = (index, fallbackSrc) => {
    if (videos && videos.length > 0) {
      return videos[index] || videos[index % videos.length];
    }
    return { src: fallbackSrc, alt: "Cinegem Studio Video" };
  };

  const grid1Count = Math.max(2, (grid1Rows || 3) * 2);
  const grid2Count = Math.max(2, (grid2Rows || 4) * 2);
  const cycleImagesCount = grid1Count + grid2Count;

  // Dynamically calculate the number of story cycles needed
  const numCycles = Math.max(1, Math.ceil(images.length / cycleImagesCount));

  const cycles = useMemo(() => {
    const list = [];
    const hasDriveVideos = videos && videos.length > 0;

    for (let c = 0; c < numCycles; c++) {
      const cImages = images.slice(c * cycleImagesCount, (c + 1) * cycleImagesCount).map((img) => ({
        ...img,
        mediaIndex: findIndex(img.src),
      }));

      // Fallback media if no numbered filename override is present
      const s1FallbackImages = cImages.slice(0, grid1Count);
      const s2FallbackImages = cImages.slice(grid1Count, grid1Count + grid2Count);

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
      // Section 1: Featured Left (Pos 1) + Dynamic Grid Tiles (grid1Count)
      const s1Featured = resolveMediaForPosition(mediaItems, 1 + c * 20, v1Fallback);
      const s1Grid = [];
      for (let i = 0; i < grid1Count; i++) {
        s1Grid.push(resolveMediaForPosition(mediaItems, 2 + i + c * 20, s1FallbackImages[i]));
      }

      // Section 2: Full-Screen Showcase 1 (explicitly mapped via full-1, full-3..., with fallback to pos 19)
      const full1Slot = 1 + c * 2;
      const s2FullScreen = resolveFullScreenMedia(
        mediaItems,
        full1Slot,
        resolveMediaForPosition(mediaItems, 19 + c * 20, v3Fallback)
      );

      // Section 3: Dynamic Grid Tiles (grid2Count) + Featured Right (Pos 18)
      const s3Grid = [];
      for (let i = 0; i < grid2Count; i++) {
        const fixedPos = 10 + i + c * 20;
        const seqPos = 2 + grid1Count + i + c * 20;
        const resolved =
          resolveMediaForPosition(mediaItems, fixedPos, null) ||
          resolveMediaForPosition(mediaItems, seqPos, s2FallbackImages[i]);
        s3Grid.push(resolved);
      }
      const s3Featured =
        resolveMediaForPosition(mediaItems, 18 + c * 20, null) ||
        resolveMediaForPosition(mediaItems, 2 + grid1Count + grid2Count + c * 20, v2Fallback);

      // Section 4: Parallax Turntable Media (explicitly mapped via full-2, full-4..., with fallback to pos 20)
      const full2Slot = 2 + c * 2;
      const s4FullScreen = resolveFullScreenMedia(
        mediaItems,
        full2Slot,
        resolveMediaForPosition(mediaItems, 20 + c * 20, v4Fallback)
      );

      list.push({
        cycleIndex: c,
        s1Featured,
        s1Grid,
        s2FullScreen,
        s3Grid,
        s3Featured,
        s4FullScreen,
      });
    }
    return list;
  }, [images, videos, numCycles, mediaItems, grid1Count, grid2Count]);

  return (
    <div className="flex flex-col gap-16 md:gap-24">
      {cycles.map(({ cycleIndex, s1Featured, s1Grid, s2FullScreen, s3Grid, s3Featured, s4FullScreen }) => (
        <div key={`cycle-${cycleIndex}`} className="flex flex-col gap-16 md:gap-24">
          {/* Section 1: Featured Left (Pos 1) + Dynamic Grid Right */}
          {s1Featured && s1Grid.length > 0 && (
            <FullWidthVideoWithImagesBelow
              featuredMedia={s1Featured}
              gridMedia={s1Grid}
              rows={grid1Rows}
              onOpen={onOpen}
            />
          )}

          {/* Section 2: Full-Width Showcase Video / Image (full-1) */}
          {s2FullScreen && (
            <FullWidthVideo media={s2FullScreen} src={s2FullScreen.src} onOpen={onOpen} />
          )}

          {/* Section 3: Dynamic Grid Left + Featured Right */}
          {s3Featured && s3Grid.length > 0 && (
            <FullWidthVideoWithImagesBelow
              featuredMedia={s3Featured}
              gridMedia={s3Grid}
              rows={grid2Rows}
              onOpen={onOpen}
              reverse={true}
            />
          )}

          {/* Section 4: Parallax Turntable Media (full-2) */}
          {s4FullScreen && (
            <FullWidthVideo media={s4FullScreen} src={s4FullScreen.src} driftUp onOpen={onOpen} />
          )}
        </div>
      ))}
    </div>
  );
}

// Default grid configuration for production:
// (Can be adjusted dynamically in development mode via the Dev Grid Controls)
const DEFAULT_GRID_CONFIG = {
  grid1Rows: 3, // Default 3 rows as requested
  grid2Rows: 4,
};

const GRID_STORAGE_KEY = "cinegem_creative_grid_config";

function getInitialGridConfig() {
  if (typeof window !== "undefined" && isDevMode()) {
    try {
      const saved = localStorage.getItem(GRID_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed.grid1Rows === "number" &&
          parsed.grid1Rows >= 1 &&
          parsed.grid1Rows <= 6 &&
          typeof parsed.grid2Rows === "number" &&
          parsed.grid2Rows >= 1 &&
          parsed.grid2Rows <= 6
        ) {
          return parsed;
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }
  return DEFAULT_GRID_CONFIG;
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
  const [gridConfig, setGridConfig] = useState(getInitialGridConfig);

  const handleUpdateGrid1Rows = (rows) => {
    setGridConfig((prev) => {
      const next = { ...prev, grid1Rows: rows };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const handleUpdateGrid2Rows = (rows) => {
    setGridConfig((prev) => {
      const next = { ...prev, grid2Rows: rows };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const handleResetGrid = () => {
    setGridConfig(DEFAULT_GRID_CONFIG);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(GRID_STORAGE_KEY);
      } catch {}
    }
  };

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

  // Separate story images so dedicated banner/hero/full-screen images don't displace 1.png - 18.png
  const storyImages = useMemo(() => {
    const filtered = filterGridMedia(images);
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
        pageKey="creative-visuals"
        backgroundSrc={heroBackgroundSrc}
        heading={["Creative", "Visuals"]}
        paragraph="A cascading edit of jewellery photography and motion — an interlocking mosaic of every piece."
      />

      <div className="relative z-10 w-full overflow-x-clip pb-40 md:pb-56">
        <ScrollStoryLayout
          mediaItems={items}
          images={storyImages}
          videos={videos}
          grid1Rows={gridConfig.grid1Rows}
          grid2Rows={gridConfig.grid2Rows}
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

      {/* Dev Mode Grid Controls (strictly excluded in production) */}
      {isDevMode() && (
        <CreativeVisualsDevControls
          grid1Rows={gridConfig.grid1Rows}
          grid2Rows={gridConfig.grid2Rows}
          onChangeGrid1Rows={handleUpdateGrid1Rows}
          onChangeGrid2Rows={handleUpdateGrid2Rows}
          onReset={handleResetGrid}
        />
      )}
    </ServicePageLayout>
  );
}

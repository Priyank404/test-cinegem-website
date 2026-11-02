// OnBodyVisualizationPage.jsx
import { useEffect, useLayoutEffect, useRef, useState, useMemo, createContext, useContext } from "react";
import { ServicePageLayout } from "@/components/shared/ServicePageLayout";
import HeroSection from "@/components/sections/HeroSection";
import GlassyGallery from "@/components/shared/GlassyGallery";
import { useDriveMedia } from "@/hooks/useDriveMedia";
import { cleanJewelryAlt } from "@/seo/alt";
import { UniversalMediaTile } from "@/components/shared/UniversalMediaTile";
import { resolveMediaForPosition, isMediaVideo } from "@/utils/mediaPositioning";

const ImageClickContext = createContext(null);

/* ═══════════════════════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════════════════════ */

const galleryImages = [
  { src: "1.png", alt: "Solitaire diamond ring on hand model on-body 3D render — Cinegem Studio" },
  { src: "2.png", alt: "Marquise diamond ring side angle on finger on-body 3D render — Cinegem Studio" },
  { src: "3.png", alt: "Diamond engagement ring perspective on hand on-body 3D render — Cinegem Studio" },
  { src: "4.png", alt: "Solitaire yellow gold ring close-up on hand on-body 3D render — Cinegem Studio" },
  { src: "5.jpg", alt: "Diamond drop earrings on human ear on-body 3D render — Cinegem Studio" },
  { src: "6.jpg", alt: "Fine jewellery pendant necklace on neck model on-body 3D render — Cinegem Studio" },
  { src: "7.jpg", alt: "Luxury tennis bracelet on wrist on-body 3D render — Cinegem Studio" },
  { src: "cinegem jewellery.png", alt: "Luxury high jewellery suite on-body 3D visualization — Cinegem Studio" },
  {
    src: "Band Ring With Enamel Marquise-Y-V1.jpg",
    alt: "Yellow gold enamel band ring with marquise diamond on hand 3D render — Cinegem Studio",
  },
  {
    src: "G7P25CLACRAW0113D00-TZPDP00005-14Y-V4-WB.png",
    alt: "Diamond pendant necklace in 14K yellow gold on-body 3D render — Cinegem Studio",
  },
  {
    src: "Gemini_Generated_Image_udnfihudnfihudnf.png",
    alt: "Editorial fine jewellery necklace on human collarbone 3D render — Cinegem Studio",
  },
];

const GAP_GLASSY = 4; // Minimal hairline gap for glassy container mode
const GAP_ORIGINAL = 16; // Original generous gap from c111c47
const FALLBACK_AR = 0.8;

/* ═══════════════════════════════════════════════════════════════════════
   ASPECT RATIO & WIDTH HOOKS
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
  }, [images]);

  return ratios;
}

function arOf(img, ratios) {
  return ratios[img.src] ?? FALLBACK_AR;
}

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
      width: availableWidth * (ars[i] / sumAR),
    })),
  };
}

function chunk(images, size) {
  const chunks = [];
  for (let i = 0; i < images.length; i += size) {
    chunks.push(images.slice(i, i + size));
  }
  return chunks;
}

/* ═══════════════════════════════════════════════════════════════════════
   1. ORIGINAL NORMAL GRID COMPONENTS (Retrieved when in clean mode)
   Authentic wide layout (max-w-[2560px]), 16px luxury gaps, cream cards from c111c47.
═══════════════════════════════════════════════════════════════════════ */

function OriginalTile({ img, width, height }) {
  const onOpen = useContext(ImageClickContext);
  return (
    <div
      onClick={() => onOpen?.(img)}
      className="
        shrink-0
        relative overflow-hidden bg-[#FAF9F6]
        border border-[#c4c7c7]/40 gallery-shadow
        hover:-translate-y-1 transition-all duration-300
        cursor-pointer
      "
      style={{ width, height }}
    >
      <UniversalMediaTile
        media={img}
        className="block w-full h-full object-contain object-center"
        imageClassName="block w-full h-full object-contain object-center"
        videoClassName="block w-full h-full object-contain object-center"
      />
    </div>
  );
}

function OriginalRow({ items, ratios, containerWidth }) {
  const row = layoutRow(items, ratios, containerWidth, GAP_ORIGINAL);
  if (!row) return null;

  return (
    <div className="flex" style={{ gap: GAP_ORIGINAL, height: row.height }}>
      {row.tiles.map(({ img, width }, i) => (
        <OriginalTile
          key={`${img.src}-${i}`}
          img={img}
          width={width}
          height={row.height}
        />
      ))}
    </div>
  );
}

function OriginalMobileBlock({ images, ratios, containerWidth }) {
  const [a, b, c1, c2, d, e] = images;
  const rows = [[a], [b], [c1, c2], [d], [e]].filter((r) => r.some(Boolean));

  return (
    <div className="flex md:hidden flex-col" style={{ gap: GAP_ORIGINAL }}>
      {rows.map((items, i) => (
        <OriginalRow
          key={i}
          items={items}
          ratios={ratios}
          containerWidth={containerWidth}
        />
      ))}
    </div>
  );
}

function OriginalTabletBlock({ images, ratios, containerWidth }) {
  const [a, b, c, d] = images;
  const rows = [[a], [b, c], [d]].filter((r) => r.some(Boolean));

  return (
    <div className="hidden md:flex lg:hidden flex-col" style={{ gap: GAP_ORIGINAL }}>
      {rows.map((items, i) => (
        <OriginalRow
          key={i}
          items={items}
          ratios={ratios}
          containerWidth={containerWidth}
        />
      ))}
    </div>
  );
}

function OriginalDesktopBlock({ images, ratios, containerWidth }) {
  const [a, b, c, d, e, f, g] = images;
  const rows = [
    [a, b],
    [c, d, e],
    [f, g],
  ].filter((r) => r.some(Boolean));

  return (
    <div className="hidden lg:flex flex-col" style={{ gap: GAP_ORIGINAL }}>
      {rows.map((items, i) => (
        <OriginalRow
          key={i}
          items={items}
          ratios={ratios}
          containerWidth={containerWidth}
        />
      ))}
    </div>
  );
}

function OriginalOnBodyGallery({ images }) {
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
        style={{ gap: GAP_ORIGINAL }}
      >
        {mobileChunks.map((c, i) => (
          <OriginalMobileBlock
            key={`om-${i}`}
            images={c}
            ratios={ratios}
            containerWidth={containerWidth}
          />
        ))}
        {tabletChunks.map((c, i) => (
          <OriginalTabletBlock
            key={`ot-${i}`}
            images={c}
            ratios={ratios}
            containerWidth={containerWidth}
          />
        ))}
        {desktopChunks.map((c, i) => (
          <OriginalDesktopBlock
            key={`od-${i}`}
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
   2. GLASSY CONTAINER GRID COMPONENTS
   Modern frosted luxury box with 4px minimal hairline gaps.
   Outer 4 corners have smooth 12px radius matching container's 16px curve;
   all inner seams and joints remain strictly sharp 90° (0px radius).
═══════════════════════════════════════════════════════════════════════ */

function GlassyTile({ img, width, height, cornerClass = "", cornerStyle = {} }) {
  const onOpen = useContext(ImageClickContext);
  return (
    <div
      onClick={() => onOpen?.(img)}
      className={`
        shrink-0
        relative overflow-hidden isolate bg-[#0d0d10]
        gallery-shadow cursor-pointer
        ${cornerClass}
      `}
      style={{
        width,
        height,
        ...cornerStyle,
      }}
    >
      <UniversalMediaTile
        media={img}
        className={`block w-full h-full object-cover object-center ${cornerClass}`}
        imageClassName={`block w-full h-full object-cover object-center ${cornerClass}`}
        videoClassName={`block w-full h-full object-cover object-center ${cornerClass}`}
        style={{
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
          ...cornerStyle,
        }}
      />
    </div>
  );
}

function GlassyRow({
  items,
  ratios,
  containerWidth,
  isFirstRow = false,
  isLastRow = false,
}) {
  const row = layoutRow(items, ratios, containerWidth, GAP_GLASSY);
  if (!row) return null;

  const totalTiles = row.tiles.length;

  return (
    <div className="flex" style={{ gap: GAP_GLASSY, height: row.height }}>
      {row.tiles.map(({ img, width }, i) => {
        const isFirstCol = i === 0;
        const isLastCol = i === totalTiles - 1;

        let cornerClass = "rounded-none";
        const cornerStyle = {
          borderTopLeftRadius: "0px",
          borderTopRightRadius: "0px",
          borderBottomLeftRadius: "0px",
          borderBottomRightRadius: "0px",
        };

        const setRadius = (tl, tr, bl, br) => {
          if (tl) cornerStyle.borderTopLeftRadius = "12px";
          if (tr) cornerStyle.borderTopRightRadius = "12px";
          if (bl) cornerStyle.borderBottomLeftRadius = "12px";
          if (br) cornerStyle.borderBottomRightRadius = "12px";
        };

        if (isFirstRow && isLastRow) {
          // Lone row that is both first and last of container
          if (isFirstCol && isLastCol) {
            cornerClass = "rounded-[12px]";
            setRadius(true, true, true, true);
          } else if (isFirstCol) {
            cornerClass = "rounded-l-[12px] rounded-r-none";
            setRadius(true, false, true, false);
          } else if (isLastCol) {
            cornerClass = "rounded-r-[12px] rounded-l-none";
            setRadius(false, true, false, true);
          }
        } else if (isFirstRow) {
          // Top row of container
          if (isFirstCol && isLastCol) {
            cornerClass = "rounded-t-[12px] rounded-b-none";
            setRadius(true, true, false, false);
          } else if (isFirstCol) {
            cornerClass = "rounded-tl-[12px] rounded-tr-none rounded-b-none";
            setRadius(true, false, false, false);
          } else if (isLastCol) {
            cornerClass = "rounded-tr-[12px] rounded-tl-none rounded-b-none";
            setRadius(false, true, false, false);
          }
        } else if (isLastRow) {
          // Bottom row of container
          if (isFirstCol && isLastCol) {
            cornerClass = "rounded-b-[12px] rounded-t-none";
            setRadius(false, false, true, true);
          } else if (isFirstCol) {
            cornerClass = "rounded-bl-[12px] rounded-br-none rounded-t-none";
            setRadius(false, false, true, false);
          } else if (isLastCol) {
            cornerClass = "rounded-br-[12px] rounded-bl-none rounded-t-none";
            setRadius(false, false, false, true);
          }
        }

        return (
          <GlassyTile
            key={`${img.src}-${i}`}
            img={img}
            width={width}
            height={row.height}
            cornerClass={cornerClass}
            cornerStyle={cornerStyle}
          />
        );
      })}
    </div>
  );
}

function GlassyMobileBlock({
  images,
  ratios,
  containerWidth,
  isFirstBlock = false,
  isLastBlock = false,
}) {
  const [a, b, c1, c2, d, e] = images;
  const rows = [[a], [b], [c1, c2], [d], [e]].filter((r) => r.some(Boolean));
  const totalRows = rows.length;

  return (
    <div className="flex md:hidden flex-col" style={{ gap: GAP_GLASSY }}>
      {rows.map((items, i) => (
        <GlassyRow
          key={i}
          items={items}
          ratios={ratios}
          containerWidth={containerWidth}
          isFirstRow={isFirstBlock && i === 0}
          isLastRow={isLastBlock && i === totalRows - 1}
        />
      ))}
    </div>
  );
}

function GlassyTabletBlock({
  images,
  ratios,
  containerWidth,
  isFirstBlock = false,
  isLastBlock = false,
}) {
  const [a, b, c, d] = images;
  const rows = [[a], [b, c], [d]].filter((r) => r.some(Boolean));
  const totalRows = rows.length;

  return (
    <div className="hidden md:flex lg:hidden flex-col" style={{ gap: GAP_GLASSY }}>
      {rows.map((items, i) => (
        <GlassyRow
          key={i}
          items={items}
          ratios={ratios}
          containerWidth={containerWidth}
          isFirstRow={isFirstBlock && i === 0}
          isLastRow={isLastBlock && i === totalRows - 1}
        />
      ))}
    </div>
  );
}

function GlassyDesktopBlock({
  images,
  ratios,
  containerWidth,
  isFirstBlock = false,
  isLastBlock = false,
}) {
  const [a, b, c, d, e, f, g] = images;
  const rows = [
    [a, b],
    [c, d, e],
    [f, g],
  ].filter((r) => r.some(Boolean));
  const totalRows = rows.length;

  return (
    <div className="hidden lg:flex flex-col" style={{ gap: GAP_GLASSY }}>
      {rows.map((items, i) => (
        <GlassyRow
          key={i}
          items={items}
          ratios={ratios}
          containerWidth={containerWidth}
          isFirstRow={isFirstBlock && i === 0}
          isLastRow={isLastBlock && i === totalRows - 1}
        />
      ))}
    </div>
  );
}

function GlassyOnBodyGallery({ images }) {
  const containerRef = useRef(null);
  const ratios = useAspectRatios(images);
  const containerWidth = useContainerWidth(containerRef);

  const mobileChunks = chunk(images, 6);
  const tabletChunks = chunk(images, 4);
  const desktopChunks = chunk(images, 7);

  return (
    <section className="w-full px-4 sm:px-6 md:px-8 lg:px-10 py-8 md:py-16">
      <div className="w-full max-w-[1920px] 2xl:max-w-[2040px] mx-auto glassy-container">
        <div
          ref={containerRef}
          className="w-full mx-auto flex flex-col"
          style={{ gap: GAP_GLASSY }}
        >
          {mobileChunks.map((c, i) => (
            <GlassyMobileBlock
              key={`gm-${i}`}
              images={c}
              ratios={ratios}
              containerWidth={containerWidth}
              isFirstBlock={i === 0}
              isLastBlock={i === mobileChunks.length - 1}
            />
          ))}
          {tabletChunks.map((c, i) => (
            <GlassyTabletBlock
              key={`gt-${i}`}
              images={c}
              ratios={ratios}
              containerWidth={containerWidth}
              isFirstBlock={i === 0}
              isLastBlock={i === tabletChunks.length - 1}
            />
          ))}
          {desktopChunks.map((c, i) => (
            <GlassyDesktopBlock
              key={`gd-${i}`}
              images={c}
              ratios={ratios}
              containerWidth={containerWidth}
              isFirstBlock={i === 0}
              isLastBlock={i === desktopChunks.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PAGE COMPONENT
═══════════════════════════════════════════════════════════════════════ */

export default function OnBodyVisualizationPage() {
  const { items: dynamicItems, images: dynamicImages, videos: dynamicVideos } = useDriveMedia("On-Body Visualization");
  const mediaPool = (dynamicItems && dynamicItems.length > 0) ? dynamicItems : (dynamicImages || []);
  const basePool = mediaPool.length > 0 ? mediaPool : galleryImages;

  // Resolve media by position (1, 2, 3...)
  const activeImages = useMemo(() => {
    return basePool.map((fallbackItem, i) => {
      const resolved = resolveMediaForPosition(mediaPool, i + 1, fallbackItem);
      return {
        ...resolved,
        alt: cleanJewelryAlt(resolved, "On-Body"),
      };
    });
  }, [basePool, mediaPool]);

  const containerRef = useRef(null);
  const [galleryIndex, setGalleryIndex] = useState(null);

  const allOnBodyMedia = useMemo(() => {
    const list = [...activeImages];
    if (dynamicVideos && dynamicVideos.length > 0) {
      dynamicVideos.forEach((v) => {
        if (v && v.src && !list.some((item) => item.src === v.src)) {
          list.push({ ...v, isVideo: true });
        }
      });
    }
    return list;
  }, [activeImages, dynamicVideos]);

  const handleOpenMedia = (media) => {
    const targetSrc = typeof media === "string" ? media : media?.src;
    const idx = allOnBodyMedia.findIndex((item) => item.src === targetSrc);
    setGalleryIndex(idx !== -1 ? idx : 0);
  };

  return (
    <ServicePageLayout
      title="On-Body Visualization"
      currentPage="/onbody"
      fullBleed
    >
      <HeroSection
        backgroundSrc="/onbody-1.png"
        heading={["On-Body", "Visualization"]}
        paragraph="Photorealistic on-model composites that place your pieces in context — without a single photoshoot. Effortless, scalable, and skin-accurate."
      />

      <div ref={containerRef} className="relative z-10">
        <ImageClickContext.Provider value={handleOpenMedia}>
          <GlassyOnBodyGallery images={activeImages} />
        </ImageClickContext.Provider>
      </div>

      {/* Glassy Gallery Modal */}
      <GlassyGallery
        images={allOnBodyMedia}
        activeIndex={galleryIndex}
        onClose={() => setGalleryIndex(null)}
        onSelect={setGalleryIndex}
      />
    </ServicePageLayout>
  );
}

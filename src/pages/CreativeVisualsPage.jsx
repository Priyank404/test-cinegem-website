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
import { useState } from "react";
import { ServicePageLayout } from "@/components/shared/ServicePageLayout";
import HeroSection from "@/components/sections/HeroSection";
import { LightboxModal } from "@/components/shared/LightboxModal";
import { useLightbox } from "@/hooks/useLightbox";
import { OrbitGallery } from "@/components/shared/OrbitGallery";

/* ═══════════════════════════════════════════════════════════════════════
   DATA — creative jewellery photography + video
═══════════════════════════════════════════════════════════════════════ */

// Just drop in { type, src, alt } for a new photo or video — no shape
// tagging needed. The masonry grid below renders every tile at its own
// real width/height ratio, so the box always matches the file itself.
const mediaItems = [
  { type: "image", src: "/TZERD00061-G8E25CLV6RAYE113D-RSG-V3-WB.png", alt: "Enamel marquise band ring, hero angle" },
  { type: "image", src: "/TZERD00061-G8E25CLV6RAYE113D-RSG-V3-WB.png", alt: "Enamel marquise band ring, hero angle" },
  { type: "image", src: "/TZERD00061-G8E25CLV6RAYE113D-RSG-V3-WB.png", alt: "Enamel marquise band ring, hero angle" },
  { type: "image", src: "/TZERD00061-G8E25CLV6RAYE113D-RSG-V3-WB.png", alt: "Enamel marquise band ring, hero angle" },
  { type: "image", src: "/TZERD00061-G8E25CLV6RAYE113D-RSG-V3-WB.png", alt: "Enamel marquise band ring, hero angle" },
  { type: "image", src: "/TZERD00061-G8E25CLV6RAYE113D-RSG-V3-WB.png", alt: "Enamel marquise band ring, hero angle" },
  { type: "image", src: "/TZERD00061-G8E25CLV6RAYE113D-RSG-V3-WB.png", alt: "Enamel marquise band ring, hero angle" },
  { type: "image", src: "/1.png", alt: "Two-tone gold ring, geometric pavé setting" },
  { type: "image", src: "/G7P25CLACRAW0113D00-TZPDP00005-14Y-V1-WB.png", alt: "Gold pendant, front view" },
  { type: "image", src: "/G7P25CLACRAW0113D00-TZPDP00005-14Y-V1-WB.png", alt: "Gold chain necklace, editorial still" },

  { type: "image", src: "/G7P25CLACRAW0113D00-TZPDP00005-14Y-V1-WB.png", alt: "Pendant detail, front view" },
  { type: "video", src: "/MarquiseSideStone_HiddenHalo_Cushion_533985AX-R.mp4", alt: "Hidden-halo ring, 360° turntable" },
  { type: "image", src: "/G7P25CLACRAW0113D00-TZPDP00005-14Y-V1-WB.png", alt: "Rose gold pendant, macro" },

  { type: "image", src: "/G7P25CLACRAW0113D00-TZPDP00005-14Y-V1-WB.png", alt: "Diamond bracelet, editorial still" },
  { type: "image", src: "/Gemini_Generated_Image_udnfihudnfihudnf.png", alt: "Creative CGI jewellery composition" },

  { type: "video", src: "/MarquiseSideStone_HiddenHalo_Cushion_533985AX-R.mp4", alt: "Ring detail, cinematic loop" },
  { type: "image", src: "/1.png", alt: "Diamond stud earrings, editorial still" },
  { type: "image", src: "/G7P25CLACRAW0113D00-TZPDP00005-14Y-V1-WB.png", alt: "Cinegem signature jewellery still" },

  { type: "image", src: "/4.png", alt: "Two-tone gold ring, front angle" },
  { type: "image", src: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=900&auto=format&fit=cover", alt: "Diamond ring, editorial macro" },
  { type: "image", src: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=900&auto=format&fit=cover", alt: "Diamond drop earrings on dark surface" },
  { type: "image", src: "https://images.unsplash.com/photo-1677466891347-2ff8dad2f993?w=900&auto=format&fit=cover", alt: "Sculptural gold ring, editorial still" },
  { type: "image", src: "/1.png", alt: "Emerald ring on marble" },
  { type: "image", src: "https://images.unsplash.com/photo-1595345705177-ffe090eb0784?w=900&auto=format&fit=cover", alt: "Pearl necklace, editorial still" },

  { type: "image", src: "/G7P25CLACRAW0113D00-TZPDP00005-14Y-V1-WB.png", alt: "Gold necklace and earring set, display still" },
  { type: "image", src: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=900&auto=format&fit=cover", alt: "Gold hoop earrings" },
  { type: "image", src: "/G7P25CLACRAW0113D00-TZPDP00005-14Y-V1-WB.png", alt: "Vintage gold and gemstone ring" },

  { type: "image", src: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=900&auto=format&fit=cover", alt: "Solitaire ring close-up" },
  { type: "image", src: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&auto=format&fit=cover", alt: "Layered gold necklaces" },
  { type: "image", src: "/G7P25CLACRAW0113D00-TZPDP00005-14Y-V1-WB.png", alt: "Gold chain bracelet, editorial still" },

  { type: "image", src: "/Band Ring With Enamel Marquise-Y-V1_2560x3840.jpg", alt: "Two-tone gold ring, side profile" },
  { type: "image", src: "/Band Ring With Enamel Marquise-Y-V1_2560x3840.jpg", alt: "Two-tone gold ring, angled profile" },
  { type: "image", src: "/Band Ring With Enamel Marquise-Y-V1.png", alt: "Round halo diamond ring, front view" },
  { type: "image", src: "/Band Ring With Enamel Marquise-Y-V1_2560x3840.jpg", alt: "Round halo diamond ring, tight macro crop" },
  { type: "image", src: "/G7P25CLACRAW0113D00-TZPDP00005-14Y-V4-WB.png", alt: "Gold pendant with geometric diamond links, full length" },
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
            src={item.src}
            className={`block w-full h-auto transition-all duration-500 group-hover:scale-105 ${loaded ? "opacity-100" : "opacity-0"}`}
            autoPlay
            muted
            loop
            playsInline
            onLoadedData={() => setLoaded(true)}
          />
        ) : (
          <img
            src={item.src}
            alt={item.alt}
            className={`block w-full h-auto transition-all duration-500 group-hover:scale-105 ${loaded ? "opacity-100" : "opacity-0"}`}
            loading="lazy"
            onLoad={() => setLoaded(true)}
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
      <div className="creative-masonry">
        {items.map((item, index) => (
          <Tile key={index} item={item} index={index} onOpen={onOpen} />
        ))}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════ */

export default function CreativeVisualsPage() {
  const { activeIndex, openAt, close, prev, next } = useLightbox(mediaItems);
  const [isOrbitLayout, setIsOrbitLayout] = useState(false);

  return (
    <ServicePageLayout title="Creative Visuals" currentPage="/creative-visuals" fullBleed>
      {/* Nav bar + cinematic hero, same treatment as Classic E-Commerce */}
      <HeroSection
        backgroundSrc="/Gemini_Generated_Image_udnfihudnfihudnf.png"
        heading={["Creative", "Visuals"]}
        paragraph="A cascading edit of jewellery photography and motion — an interlocking mosaic of every piece."
      />

      <div className="relative z-10 px-4 sm:px-6 md:px-10 lg:px-16 pt-20 md:pt-28 pb-40 md:pb-56 max-w-[1800px] mx-auto overflow-x-hidden">
        {/* Layout toggle — same images, switches between masonry grid and OrbitGallery */}
        <div className="flex justify-end mb-8 md:mb-12">
          <button
            type="button"
            onClick={() => setIsOrbitLayout((prev) => !prev)}
            className="font-[Manrope] text-[11px] tracking-[0.15em] font-semibold uppercase px-5 py-2.5 border border-[#121212]/25 text-[#121212] hover:bg-[#121212] hover:text-[#FAF9F6] transition-colors duration-300"
          >
            {isOrbitLayout ? "Grid View" : "Orbit View"}
          </button>
        </div>

        {isOrbitLayout ? (
          <OrbitGallery images={mediaItems} onImageClick={openAt} />
        ) : (
          <MasonryGrid items={mediaItems} onOpen={openAt} />
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

// ClassicEComVisuals.jsx
import { ServicePageLayout } from "@/components/shared/ServicePageLayout";
import { BackToVault } from "@/components/shared/BackToVault";

const images = [
  { src: "/1.png", alt: "Front view", label: "Front" },
  { src: "/2.png", alt: "Side view", label: "Side" },
  { src: "/3.png", alt: "Angle view", label: "Angle" },
  { src: "/4.png", alt: "Detail view", label: "Detail" },
];

export default function ClassicEComVisuals({
  videoSrc = "https://drive.google.com/file/d/1LZSD2xmhrvFbRs4xDnipktbywr3lyHYs/view?usp=sharing",
  title = "Classic E-Commerce Visuals",
  eyebrow = "Product Showcase",
}) {
  return (
    <ServicePageLayout title={title} currentPage="/classic">
      {/* ── Back link ─────────────────────────────────────────────────────── */}
      <div className="mb-10">
        <BackToVault />
      </div>

      {/* ── Header ──────────────────────────────────────────────────────────
           Matches StillImagesPage typography: Playfair_Display h1 + Manrope eyebrow
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="text-center mb-12 md:mb-16">
        <p className="font-[Manrope] text-[11px] tracking-[0.25em] font-semibold uppercase text-[#C5A059] mb-3">
          {eyebrow}
        </p>
        <h1 className="font-[Playfair_Display] text-[36px] md:text-[64px] leading-[42px] md:leading-[70px] tracking-[-0.02em] text-[#121212]">
          {title}
        </h1>
        {/* accent underline — matches StillImages divider palette */}
        <div className="mx-auto mt-5 w-10 h-px bg-[#C5A059]" />
      </div>

      {/* ── Main row: [Video] [2×2 Grid] ────────────────────────────────────
           Layout preserved exactly — only colors/radii updated to match design system
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="flex gap-4 lg:gap-6 items-stretch">
        {/* LEFT — Video player */}
        <div
          className="
            lg:flex-[2]
            w-full
            aspect-[16/10]
            lg:aspect-auto
            relative
            flex items-center justify-center
            bg-[#0d0d0d]
            overflow-hidden
            border border-[#c4c7c7]/20
            min-h-[240px]
            lg:min-h-[420px]
          "
        >
          {videoSrc ? (
            <video
              src={videoSrc}
              className="absolute inset-0 w-full h-full object-cover"
              controls
            />
          ) : (
            <button
              aria-label="Play product video"
              className="
                w-14 h-14
                border border-white/60
                bg-white/10
                flex items-center justify-center
                hover:bg-white/20
                transition
              "
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

        {/* RIGHT — 2×2 image grid */}
        <div
          className="
            lg:flex-1
            w-full
            grid grid-cols-2
            gap-3
            auto-rows-fr
          "
        >
          {images.map((img, i) => (
            <div
              key={i}
              className="
                relative
                aspect-square
                overflow-hidden
                bg-[#FAF9F6]
                border border-[#c4c7c7]/40
                gallery-shadow
                hover:-translate-y-1
                transition-transform duration-300
              "
            >
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover"
              />

              {/* Label pill — Manrope tracking to match site-wide labels */}
              <span
                className="
                  absolute
                  bottom-2 left-2
                  font-[Manrope]
                  text-[9px]
                  tracking-[0.15em]
                  font-semibold
                  uppercase
                  px-2 py-1
                  bg-white/80
                  text-[#444748]
                "
              >
                {img.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </ServicePageLayout>
  );
}

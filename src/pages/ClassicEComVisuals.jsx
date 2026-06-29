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


      {/* ── Main row: [Video 50%] [2×2 Grid 50%] ───────────────────────────
           Stacked on mobile/tablet → equal halves side-by-side on lg+
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-stretch">
        {/* LEFT — Video player (50% on lg+) */}
        <div
          className="
            lg:w-1/2
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

        {/* RIGHT — 2×2 image grid (50% on lg+) */}
        <div
          className="
            lg:w-1/2
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
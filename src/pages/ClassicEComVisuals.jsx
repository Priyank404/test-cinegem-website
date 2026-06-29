// ProductShowcaseLayout.jsx
// Layout: [Video Player] [2x2 Image Grid]
// Video and image grid share equal height. Images are 1:1 (square).


// ProductShowcaseLayout.jsx

const images = [
  { src: "/1.png",  alt: "Front view",  label: "Front"  },
  { src: "/2.png",   alt: "Side view",   label: "Side"   },
  { src: "/3.png",  alt: "Angle view",  label: "Angle"  },
  { src: "/4.png", alt: "Detail view", label: "Detail" },
];

export default function ClassicEComVisuals({
  videoSrc = "https://drive.google.com/file/d/1LZSD2xmhrvFbRs4xDnipktbywr3lyHYs/view?usp=sharing",
  title = "Classic E-Commerce Visuals",
  eyebrow = "Product Showcase",
}) {
  return (
    <section
      className="
        w-full
        py-10
        px-[clamp(1.5rem,6vw,5rem)]
        font-sans
      "
    >
      {/* ── Header ── */}
      <div className="text-center mb-8">
        <p className="text-xs tracking-widest uppercase text-gray-400 mb-1">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-medium tracking-tight text-gray-900">
          {title}
        </h2>
        {/* accent underline */}
        <div className="mx-auto mt-3 w-9 h-0.5 rounded-full bg-blue-500" />
      </div>

      {/* ── Main row ── */}
     {/* ── Main row ── */}
<div
  className="
    flex
    gap-4 lg:gap-5
    items-stretch
  "
>
  {/* LEFT — Video */}
  <div
    className="
      lg:flex-[2]
      w-full
      aspect-[16/10]
      lg:aspect-auto
      relative
      flex items-center justify-center
      bg-[#0d0d0d]
      rounded-2xl
      overflow-hidden
      border border-gray-800
      min-h-[240px]
      lg:min-h-[380px]
    "
  >
    {/* Video */}
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
          rounded-full
          border-2 border-white/80
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

  {/* RIGHT — Images */}
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
          rounded-xl
          bg-gray-50
          border border-gray-100
          shadow
          hover:-translate-y-1
          transition
        "
      >
        <img
          src={img.src}
          alt={img.alt}
          className="w-full h-full object-cover"
        />

        <span
          className="
            absolute
            bottom-2
            left-2
            text-[10px]
            px-2
            py-0.5
            rounded
            bg-blue-50
            text-blue-600
          "
        >
          {img.label}
        </span>
      </div>
    ))}
  </div>
</div>
    </section>
  );
}
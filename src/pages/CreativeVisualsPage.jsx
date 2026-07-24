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
  import { useState, useEffect, useRef } from "react";
  import { gsap } from "gsap";
  import { ServicePageLayout } from "@/components/shared/ServicePageLayout";
  import HeroSection from "@/components/sections/HeroSection";
  import { LightboxModal } from "@/components/shared/LightboxModal";
  import { useLightbox } from "@/hooks/useLightbox";
  import Silk from "@/components/three/Silk";

  // Tracks the true, scrollbar-safe viewport width (document.documentElement
  // .clientWidth excludes the scrollbar; 100vw does not — that mismatch is
  // what causes a full-bleed section to overshoot the visible area on one
  // side, leaving a stray gap of background color showing on the other side
  // once the scrollbar is accounted for). Falls back to 0 during SSR/first
  // paint, before which the full-bleed sections simply render at their
  // natural width until the effect runs.
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
    SCROLL STORY LAYOUT — the full page sequence:
      1. Video (left, 50%) + 4 images in a 2x2 grid (right, 50%), no
          scroll effects — everything just sits in place.
      2. Same as 1, mirrored: large static video (left) + 4 fixed images
          (right).
      3. Full-width static video.
      4. Two long images side by side.
      5. Full-width video that drifts upward as you scroll past it.
  ═══════════════════════════════════════════════════════════════════════ */

  // Section 1 layout: video on the left at 50% width, shown at its own
  // natural aspect ratio (no cropping) — the video's real proportions
  // decide the section's height. The 4 images on the right sit in a true
  // compact 2x2 grid that matches the video's total height exactly (measured
  // off the video element), so the grid reads as a tight square block next
  // to the video rather than sprawling to each image's own tall natural
  // height. Individual images are cropped (object-cover) to their cell —
  // the only way to get a real 2x2 grid rather than ragged rows. The outer
  // wrapper still breaks out to the full browser width edge-to-edge (same
  // full-bleed technique used elsewhere on this page), with the video flush
  // to the true left edge and the images flush to the true right edge.
  // Background is transparent (not a solid white/cream fill) so the page's
  // own background shows through, matching Section 2's look.
  function FullWidthVideoWithImagesBelow({ video, images, onOpen,reverse }) {
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
          {/* Video: natural aspect ratio, nothing cropped. h-auto lets the
              file's own dimensions set the height instead of a fixed vh
              box forcing object-cover/object-contain. */}
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
          {/* Images: true 2x2 grid, height-locked to match the video's
              total height, so it reads as one compact square block rather
              than sprawling downward. Transparent background so the gap
              reads as a seam matching the page, not a solid cream block. */}
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
                className="relative block w-full h-full cursor-pointer focus:outline-none overflow-hidden"
              >
                <img src={img.src} alt={img.alt} className="block w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Static side-by-side layout (Section 2): a full-size video on one side
  // and a fixed 2x2 grid of 4 images on the other. No scroll-driven
  // effects — both the video and the images just sit in place. `reverse`
  // flips which side the video is on.
  //
  // The outer wrapper breaks out of the page's max-width/padding container
  // using the calc(50% - 50vw) full-bleed trick, so the video and image
  // grid together stretch edge-to-edge of the browser window, rather than
  // stopping at the page's normal content width.
  function VideoWithImages({ video, images, onOpen, reverse, imagesWider }) {
    const vw = useViewportWidth();
    const videoWidthClass = imagesWider ? "md:w-[45%]" : "md:w-1/2";
    const imageWidthClass = imagesWider ? "md:w-[55%]" : "md:w-1/2";

    const videoCol = (
      <div className={`w-full ${videoWidthClass}`}>
        <div className="relative w-full overflow-hidden bg-[#EDEAE3]">
          <video
            src={video.src}
            className="block w-full h-[100vh] md:h-[125vh] object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        </div>
      </div>
    );

    const imageCol = (
      <div className={`w-full ${imageWidthClass} grid grid-cols-2 grid-rows-4 gap-4 content-start overflow-y-auto max-h-[100vh] md:max-h-[125vh]`}>
        {images.slice(0, 8).map((img) => (
          <button
            key={img.src}
            type="button"
            onClick={() => onOpen(img.mediaIndex)}
            aria-label={`Zoom in on ${img.alt}`}
            className="block w-full cursor-pointer focus:outline-none overflow-hidden bg-[#EDEAE3]"
          >
            <img src={img.src} alt={img.alt} className="block w-full h-auto" loading="lazy" />
          </button>
        ))}
      </div>
    );

    return (
      <section
        className="relative w-auto"
        style={vw ? { marginLeft: `calc(50% - ${vw / 2}px)`, marginRight: `calc(50% - ${vw / 2}px)` } : undefined}
      >
        <div className="flex flex-col md:flex-row gap-4">
          {reverse ? (
            <>
              {imageCol}
              {videoCol}
            </>
          ) : (
            <>
              {videoCol}
              {imageCol}
            </>
          )}
        </div>
      </section>
    );
  }

  // Full-width video. `driftUp` makes it slowly translate upward as the
  // page scrolls past it (used for the closing section); otherwise it's
  // just a plain static full-width video (used for the section 3 static video).
  function FullWidthVideo({ src, driftUp,  }) {
    const sectionRef = useRef(null);
    const [offset, setOffset] = useState(0);
    const vw = useViewportWidth();

    useEffect(() => {
      if (!driftUp) return;
      const el = sectionRef.current;
      if (!el) return;

      const onScroll = () => {
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const total = rect.height + vh;
        const raw = (vh - rect.top) / total;
        const progress = Math.min(1, Math.max(0, raw));
        // Negative translateY = drifts upward as you scroll through it.
        setOffset(progress * -80);
      };

      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      };
    }, [driftUp]);

    return (
      <div
        ref={sectionRef}
        className="relative w-auto overflow-hidden"
        style={vw ? { marginLeft: `calc(50% - ${vw / 2}px)`, marginRight: `calc(50% - ${vw / 2}px)` } : undefined}
      >
        <video
             src={src}
             className="block w-full h-auto"
             style={driftUp ? { transform: `translateY(${offset}px)` } : undefined}
             autoPlay
             muted
             loop
              playsInline
              preload="auto"
        />

      </div>
    );
  }

  // The two long images side by side (Section 4).
  function LongImagePair({ images }) {
    return (
      <div className="flex flex-col md:flex-row gap-4">
        {images.map((img) => (
          <img
            key={img.src}
            src={img.src}
            alt={img.alt}
            className="block w-full md:w-1/2 h-auto"
          />
        ))}
      </div>
    );
  }

  function ScrollStoryLayout({ onOpen }) {
    const findIndex = (src) => mediaItems.findIndex((m) => m.src === src);

    const section1Video = { src: "/Creative visuals/A6-R3-HQ.mp4" };
    const section1Images = [
      "/Creative visuals/Earring 1 YG BlackBG V0000.png",
      "/Creative visuals/NB-1 LO R.png",
      "/Creative visuals/R1-L2-P1-SB-Y-V4.png",
      "/Creative visuals/Ring 2-Color BG-V1-R6.png",
      "/Creative visuals/Screenshot 2023-08-26 185251.png",
      "/Creative visuals/Earring 1 YG BlackBG V0001.png",
      "/Creative visuals/R4-L2-Y-V4.png",
      "/Creative visuals/RG01_Out2_0000.png",

      
    ].map((src) => ({ src, alt: mediaItems[findIndex(src)]?.alt ?? "", mediaIndex: findIndex(src) }));

    const section2Video = { src: "/Creative visuals/KC-A01-TR1 .mp4" };
    
    const section2Images = [
      "/Creative visuals/RG01-Y-B-V1.png",
      "/Creative visuals/RG01-Y-B-V3.png",
      "/Creative visuals/RG01-Y-B-V4.png",
      "/Creative visuals/Ring 2-Color BG-V1-R3.png",
      "/Creative visuals/ring.png",
      "/Creative visuals/Screenshot 2023-07-15 183627.png",
      "/Creative visuals/NK29909-W-V1.png",
      "/Creative visuals/Screenshot 2023-07-15 182801.png",
    ].map((src) => ({ src, alt: mediaItems[findIndex(src)]?.alt ?? "", mediaIndex: findIndex(src) }));

    const section3Video = { src: "/Creative visuals/M-Video.mp4" };
    const section5Video = { src: "/Creative visuals/360 Turntable black.mp4" };

    const section4Images = [
      "/Creative visuals/Screenshot 2024-06-24 184639.png",
      "/Creative visuals/Screenshot 2023-12-20 080659.png",
    ].map((src) => ({ src, alt: mediaItems[findIndex(src)]?.alt ?? "", mediaIndex: findIndex(src) }));

    return (
      <div className="flex flex-col gap-16 md:gap-24">
        <FullWidthVideoWithImagesBelow video={section1Video} images={section1Images} onOpen={onOpen} />
        <FullWidthVideoWithImagesBelow video={section2Video} images={section2Images} onOpen={onOpen} reverse={true} />
        <FullWidthVideo
        src={section3Video.src}
        naturalHeight
        />
        <LongImagePair images={section4Images} />
        <FullWidthVideo src={section5Video.src} driftUp />
      </div>
    );
  }

  export default function CreativeVisualsPage() {
    const { activeIndex, openAt, close, prev, next } = useLightbox(mediaItems);
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

        <div className="relative z-10 mx-auto overflow-x-hidden px-4 sm:px-6 md:px-10 lg:px-16 pb-40 md:pb-56">
          <ScrollStoryLayout onOpen={openAt} />
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
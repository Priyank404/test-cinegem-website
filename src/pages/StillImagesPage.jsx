import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ServicePageLayout } from '@/components/shared/ServicePageLayout'
import { BackToVault } from '@/components/shared/BackToVault'
import { ParallaxImage } from '@/components/shared/ParallaxImage'
import { LightboxModal } from '@/components/shared/LightboxModal'
import { useLightbox } from '@/hooks/useLightbox'
import { STILL_IMAGES } from '@/constants/gallery'

gsap.registerPlugin(ScrollTrigger)

/* ─────────────────────────────────────────────────────────────────────────
   Gallery images — add items to STILL_IMAGES.gallery in constants/gallery.js
   or append here. Each entry needs: { src, alt, label }
──────────────────────────────────────────────────────────────────────────── */
const GALLERY_ITEMS = [
  { src: '1.png', alt: 'Luxury diamond engagement ring macro' },
  { src: '2.png', alt: 'Gold pendant minimalist profile' },
  { src: '3.png', alt: 'Premium wedding bands collection' },
  { src: '4.png', alt: 'Sapphire luxury drop earrings' },
  { src: '1.png', alt: 'Luxury diamond engagement ring macro' },
  { src: '2.png', alt: 'Gold pendant minimalist profile' },
  { src: '3.png', alt: 'Premium wedding bands collection' },
  { src: '4.png', alt: 'Sapphire luxury drop earrings' },{ src: '1.png', alt: 'Luxury diamond engagement ring macro' },
  { src: '2.png', alt: 'Gold pendant minimalist profile' },
  { src: '3.png', alt: 'Premium wedding bands collection' },
  { src: '4.png', alt: 'Sapphire luxury drop earrings' },
]

/* ─────────────────────────────────────────────────────────────────────────
   Tag pill — matches OnBodyVisualizationPage style exactly
──────────────────────────────────────────────────────────────────────────── */
function TagPill({ label }) {
  return (
    <span className="font-[Manrope] text-[11px] tracking-[0.15em] font-semibold uppercase px-4 py-2 border border-[#c4c7c7] text-[#444748]">
      {label}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Stat card — matches OnBodyVisualizationPage style exactly
──────────────────────────────────────────────────────────────────────────── */
function StatCard({ value, label }) {
  return (
    <div className="flex flex-col gap-2 py-8 px-6 border-t border-[#c4c7c7]/50">
      <span className="font-[Playfair_Display] text-[36px] md:text-[48px] leading-none text-[#121212]">
        {value}
      </span>
      <span className="font-[Manrope] text-[11px] tracking-[0.15em] font-semibold uppercase text-[#444748]">
        {label}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   useNaturalRatio — loads an image URL and returns its natural w/h ratio
   as a CSS string like "1200/1500". Falls back to "1/1" while loading.
──────────────────────────────────────────────────────────────────────────── */
function useNaturalRatio(src) {
  const [ratio, setRatio] = useState(null)

  useEffect(() => {
    if (!src) return
    const img = new Image()
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setRatio(`${img.naturalWidth}/${img.naturalHeight}`)
      }
    }
    img.src = src
  }, [src])

  return ratio // null while loading — ParallaxImage will use its own default until resolved
}

/* ─────────────────────────────────────────────────────────────────────────
   AutoRatioParallaxImage — wraps ParallaxImage, auto-detects image ratio.
   If the data already supplies width+height those take precedence.
   Otherwise the natural dimensions are fetched at runtime.
──────────────────────────────────────────────────────────────────────────── */
function AutoRatioParallaxImage({ img, revealDelay, onClick }) {
  const detectedRatio = useNaturalRatio(
    img.width && img.height ? null : img.src
  )

  const aspectRatio = img.aspectRatio
    ?? (img.width && img.height ? `${img.width}/${img.height}` : null)
    ?? detectedRatio
    ?? '1/1'

  return (
    <ParallaxImage
      src={img.src}
      alt={img.alt}
      label={img.label}
      aspectRatio={aspectRatio}
      grayscale={img.grayscale}
      parallaxAmount={8}
      scrubSpeed={0.9}
      revealDelay={revealDelay}
      onClick={onClick}
    />
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   EvenGrid — 4-column layout, all columns scroll at the same speed.
   Uses ParallaxImage (same component as OnBodyVisualizationPage).
   Every image's aspect ratio is resolved dynamically from its natural
   dimensions — no hardcoded ratio anywhere.
──────────────────────────────────────────────────────────────────────────── */
function EvenGrid({ images = [], className = '', onImageClick }) {
  // Distribute images evenly across 4 columns
  const columns = [[], [], [], []]
  images.forEach((img, i) => columns[i % 4].push({ ...img, originalIndex: i }))

  return (
    <section
      className={`relative grid grid-cols-2 md:grid-cols-4 gap-x-6 md:gap-x-10 gap-y-0 ${className}`}
      style={{ paddingBottom: '80px' }}
    >
      {columns.map((colImages, colIdx) => (
        <div
          key={colIdx}
          className="flex flex-col gap-6 md:gap-10"
        >
          {colImages.map((img, rowIdx) => (
            <AutoRatioParallaxImage
              key={rowIdx}
              img={img}
              revealDelay={rowIdx * 0.08}
              onClick={onImageClick ? () => onImageClick(img.originalIndex) : undefined}
            />
          ))}
        </div>
      ))}
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Page
──────────────────────────────────────────────────────────────────────────── */
export default function StillImagesPage() {
  const heroRef    = useRef(null)
  const headingRef = useRef(null)
  const subtextRef = useRef(null)
  const tagsRef    = useRef(null)
  const heroImgRef = useRef(null)
  const dividerRef = useRef(null)

  const { activeIndex, openAt, close, prev, next } = useLightbox(GALLERY_ITEMS)

  /* Hero entrance animation — identical to OnBodyVisualizationPage */
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    tl.fromTo(headingRef.current,
      { opacity: 0, y: 48, skewY: 1.5 },
      { opacity: 1, y: 0, skewY: 0, duration: 1.1, delay: 0.1 }
    )
    .fromTo(subtextRef.current,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.9 },
      '-=0.6'
    )
    .fromTo(tagsRef.current?.children ?? [],
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 },
      '-=0.5'
    )
    .fromTo(heroImgRef.current,
      { opacity: 0, scale: 1.04, clipPath: 'inset(8% 0% 0% 0%)' },
      { opacity: 1, scale: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power4.out' },
      0.1
    )

    return () => tl.kill()
  }, [])

  /* Divider line draw — identical to OnBodyVisualizationPage */
  useEffect(() => {
    if (!dividerRef.current) return
    gsap.fromTo(
      dividerRef.current,
      { scaleX: 0, transformOrigin: 'left center' },
      {
        scaleX: 1,
        duration: 1.2,
        ease: 'power4.inOut',
        scrollTrigger: { trigger: dividerRef.current, start: 'top 85%', once: true },
      }
    )
  }, [])

  const { hero } = STILL_IMAGES

  return (
    <ServicePageLayout title="Still Images" currentPage="/still">

      {/* ── Split Hero ─────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="mb-28 md:mb-40 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start"
      >
        {/* Left — text */}
        <div className="flex flex-col gap-6 pt-4 md:pt-12">
          <BackToVault />

          <h1
            ref={headingRef}
            className="font-[Playfair_Display] text-[40px] md:text-[80px] leading-[44px] md:leading-[86px] tracking-[-0.03em] text-[#121212]"
            style={{ opacity: 0 }}
          >
            Still
            <br />
            Images.
          </h1>

          <p
            ref={subtextRef}
            className="font-[Manrope] text-[15px] md:text-[18px] leading-[24px] md:leading-[30px] text-[#555] max-w-md"
            style={{ opacity: 0 }}
          >
            Hyper-realistic CGI stills rendered with raytraced precision — every facet,
            reflection, and surface texture crafted to evoke the material truth of your finest pieces.
          </p>

          <div ref={tagsRef} className="flex flex-wrap gap-3 mt-2">
            {['8K Resolution', 'Raytraced', 'Full Post'].map((tag) => (
              <TagPill key={tag} label={tag} />
            ))}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-px mt-10 bg-[#c4c7c7]/20">
            <StatCard value="8K"   label="Output Resolution"  />
            <StatCard value="48h"  label="Avg. Turnaround"    />
            <StatCard value="360°" label="View Angles"        />
            <StatCard value="100%" label="CGI Precision"      />
          </div>
        </div>

        {/* Right — hero image */}
        <div
          ref={heroImgRef}
          className="relative overflow-hidden gallery-shadow"
          style={{ aspectRatio: '3/4', opacity: 0 }}
        >
          <img
            src={hero.src}
            alt={hero.alt}
            className="w-full h-full object-cover"
          />

          {/* Glass chip */}
          {hero.chips && (
            <div
              className="absolute bottom-6 left-6 px-5 py-3 rounded-sm flex items-center gap-3"
              style={{
                background:     'rgba(255,255,255,0.38)',
                backdropFilter: 'blur(20px)',
                border:         '0.5px solid rgba(255,255,255,0.22)',
              }}
            >
              {hero.chips.map((chip, i) => (
                <span key={chip} className="flex items-center gap-3">
                  {i > 0 && <div className="w-1 h-1 bg-[#121212] rounded-full" />}
                  <span className="font-[Manrope] text-[11px] tracking-[0.15em] font-semibold uppercase text-[#121212]">
                    {chip}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Section title ─────────────────────────────────────────────── */}
      <div className="mb-16 md:mb-24 flex items-end justify-between gap-8">
        <h2 className="reveal font-[Playfair_Display] text-[28px] md:text-[52px] leading-[34px] md:leading-[60px] tracking-[-0.02em] text-[#121212] max-w-lg">
          Pieces in Focus
        </h2>
        <p className="reveal hidden md:block font-[Manrope] text-[13px] leading-[20px] text-[#888] max-w-xs text-right">
          Every image below is a CGI composite — no studio, no photoshoot.
          Pure digital craft with surgical precision.
        </p>
      </div>

      {/* ── Thin rule ─────────────────────────────────────────────────── */}
      <div
        ref={dividerRef}
        className="w-full h-px bg-[#c4c7c7]/60 mb-16 md:mb-20"
        style={{ transformOrigin: 'left center' }}
      />

      {/* ── 4-Column Even Grid ────────────────────────────────────────── */}
      {/*
        To add images: push items to STILL_IMAGES.gallery in src/constants/gallery.js
        or to GALLERY_ITEMS at the top of this file.
        Each item needs: { src, alt, label }
        All 4 columns scroll at the same speed — no parallax offset between columns.
      */}
      <EvenGrid images={GALLERY_ITEMS} className="mb-40" onImageClick={openAt} />

      <LightboxModal
        images={GALLERY_ITEMS}
        activeIndex={activeIndex}
        onClose={close}
        onPrev={prev}
        onNext={next}
      />

    </ServicePageLayout>
  )
}
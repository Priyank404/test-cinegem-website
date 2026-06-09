import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ServicePageLayout } from '@/components/shared/ServicePageLayout'
import { BackToVault } from '@/components/shared/BackToVault'
import { ParallaxImage } from '@/components/shared/ParallaxImage'
import { LightboxModal } from '@/components/shared/LightboxModal'
import { useLightbox } from '@/hooks/useLightbox'
import { ANIMATION_360_IMAGES } from '@/constants/gallery'

gsap.registerPlugin(ScrollTrigger)

/* ─────────────────────────────────────────────────────────────────────────
   Tag pill
   ──────────────────────────────────────────────────────────────────────────── */
function TagPill({ label }) {
  return (
    <span className="font-[Manrope] text-[11px] tracking-[0.15em] font-semibold uppercase px-4 py-2 border border-[#c4c7c7] text-[#444748]">
      {label}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Stat card
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
   VideoEvenGrid — 4-column structured video grid
   ──────────────────────────────────────────────────────────────────────────── */
function VideoEvenGrid({ images = [], className = '', onImageClick }) {
  // Distribute images evenly across 4 columns
  const columns = [[], [], [], []]
  images.forEach((img, i) => columns[i % 4].push({ ...img, originalIndex: i }))

  return (
    <section
      className={`relative grid grid-cols-2 md:grid-cols-4 gap-x-4 md:gap-x-10 gap-y-0 ${className}`}
      style={{ paddingBottom: '80px' }}
    >
      {columns.map((colImages, colIdx) => (
        <div
          key={colIdx}
          className="flex flex-col gap-4 md:gap-10"
        >
          {colImages.map((img, rowIdx) => (
            <ParallaxImage
              key={rowIdx}
              src={img.src}
              alt={img.alt}
              label={img.label}
              aspectRatio={img.aspectRatio || '1/1'}
              parallaxAmount={8}
              scrubSpeed={0.9}
              revealDelay={rowIdx * 0.08}
              onClick={onImageClick ? () => onImageClick(img.originalIndex) : undefined}
              isVideo={img.isVideo}
            />
          ))}
        </div>
      ))}
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Page Component
   ──────────────────────────────────────────────────────────────────────────── */
export default function Animation360Page() {
  const heroRef    = useRef(null)
  const headingRef = useRef(null)
  const subtextRef = useRef(null)
  const tagsRef    = useRef(null)
  const heroImgRef = useRef(null)
  const dividerRef = useRef(null)

  const { hero, gallery } = ANIMATION_360_IMAGES
  const { activeIndex, openAt, close, prev, next } = useLightbox(gallery)

  /* Hero entrance entrance */
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

  /* Divider line draw */
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

  return (
    <ServicePageLayout title="360° Animation" currentPage="/360">

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
            360°
            <br />
            Animation.
          </h1>

          <p
            ref={subtextRef}
            className="font-[Manrope] text-[15px] md:text-[18px] leading-[24px] md:leading-[30px] text-[#555] max-w-md"
            style={{ opacity: 0 }}
          >
            Seamlessly looping turntable animations and cinematic fly-throughs that showcase every 
            angle of your craftsmanship in motion — web-optimised for e-commerce and brand.
          </p>

          <div ref={tagsRef} className="flex flex-wrap gap-3 mt-2">
            {['Seamless Loop', 'Web-Optimised', 'HDR Studio Lit'].map((tag) => (
              <TagPill key={tag} label={tag} />
            ))}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-px mt-10 bg-[#c4c7c7]/20">
            <StatCard value="60fps"  label="Frame Rate"  />
            <StatCard value="HDR"    label="Colour Space"    />
            <StatCard value="360°"   label="View Angles"        />
            <StatCard value="100%"   label="CGI Loop Precision"      />
          </div>
        </div>

        {/* Right — hero video */}
        <div
          ref={heroImgRef}
          className="relative overflow-hidden gallery-shadow bg-[#EDE8DE]"
          style={{ aspectRatio: '3/4', opacity: 0 }}
        >
          <video
            src={hero.src}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Glass chip */}
          <div
            className="absolute bottom-6 left-6 px-5 py-3 rounded-sm flex items-center gap-3"
            style={{
              background:     'rgba(255,255,255,0.38)',
              backdropFilter: 'blur(20px)',
              border:         '0.5px solid rgba(255,255,255,0.22)',
            }}
          >
            {['Turntable', '60 FPS'].map((chip, i) => (
              <span key={chip} className="flex items-center gap-3">
                {i > 0 && <div className="w-1 h-1 bg-[#121212] rounded-full" />}
                <span className="font-[Manrope] text-[11px] tracking-[0.15em] font-semibold uppercase text-[#121212]">
                  {chip}
                </span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section title ─────────────────────────────────────────────── */}
      <div className="mb-16 md:mb-24 flex items-end justify-between gap-8">
        <h2 className="reveal font-[Playfair_Display] text-[28px] md:text-[52px] leading-[34px] md:leading-[60px] tracking-[-0.02em] text-[#121212] max-w-lg">
          360° Showroom
        </h2>
        <p className="reveal hidden md:block font-[Manrope] text-[13px] leading-[20px] text-[#888] max-w-xs text-right">
          Every file below is a web-optimised CGI rotate loop — no drops, no delays.
          Engineered for instant 60fps interaction on any platform.
        </p>
      </div>

      {/* ── Thin rule ─────────────────────────────────────────────────── */}
      <div
        ref={dividerRef}
        className="w-full h-px bg-[#c4c7c7]/60 mb-16 md:mb-20"
        style={{ transformOrigin: 'left center' }}
      />

      {/* ── 4-Column Even Video Grid ──────────────────────────────────── */}
      <VideoEvenGrid images={gallery} className="mb-40" onImageClick={openAt} />

      <LightboxModal
        images={gallery}
        activeIndex={activeIndex}
        onClose={close}
        onPrev={prev}
        onNext={next}
      />

    </ServicePageLayout>
  )
}

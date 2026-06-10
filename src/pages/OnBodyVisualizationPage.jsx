import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ServicePageLayout } from '@/components/shared/ServicePageLayout'
import { BackToVault } from '@/components/shared/BackToVault'
import { ScatteredGallery } from '@/components/shared/ScatteredGallery'
import { LightboxModal } from '@/components/shared/LightboxModal'
import { useLightbox } from '@/hooks/useLightbox'
import { ONBODY_IMAGES } from '@/constants/gallery'
import { useDriveImages } from '@/components/shared/GoogleDriveGallery'

gsap.registerPlugin(ScrollTrigger)

function TagPill({ label }) {
  return (
    <span className="font-[Manrope] text-[11px] tracking-[0.15em] font-semibold uppercase px-4 py-2 border border-[#c4c7c7] text-[#444748]">
      {label}
    </span>
  )
}

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

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-40">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="bg-[#f0f0f0] animate-pulse" style={{ aspectRatio: '3/4', borderRadius: 4 }} />
      ))}
    </div>
  )
}

export default function OnBodyVisualizationPage() {
  const headingRef = useRef(null)
  const subtextRef = useRef(null)
  const tagsRef    = useRef(null)
  const heroImgRef = useRef(null)
  const dividerRef = useRef(null)

  const { images: driveImages, loading, error } = useDriveImages('onbody')
  const { activeIndex, openAt, close, prev, next } = useLightbox(driveImages)

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    tl.fromTo(headingRef.current,
      { opacity: 0, y: 48, skewY: 1.5 },
      { opacity: 1, y: 0, skewY: 0, duration: 1.1, delay: 0.1 }
    )
    .fromTo(subtextRef.current,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.9 }, '-=0.6'
    )
    .fromTo(tagsRef.current?.children ?? [],
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 }, '-=0.5'
    )
    .fromTo(heroImgRef.current,
      { opacity: 0, scale: 1.04, clipPath: 'inset(8% 0% 0% 0%)' },
      { opacity: 1, scale: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power4.out' },
      0.1
    )
    return () => tl.kill()
  }, [])

  useEffect(() => {
    if (!dividerRef.current) return
    gsap.fromTo(dividerRef.current,
      { scaleX: 0, transformOrigin: 'left center' },
      { scaleX: 1, duration: 1.2, ease: 'power4.inOut',
        scrollTrigger: { trigger: dividerRef.current, start: 'top 85%', once: true } }
    )
  }, [])

  const { hero } = ONBODY_IMAGES

  return (
    <ServicePageLayout title="On-Body Visualization" currentPage="/onbody">

      <section className="mb-28 md:mb-40 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start">
        <div className="flex flex-col gap-6 pt-4 md:pt-12">
          <BackToVault />
          <h1
            ref={headingRef}
            className="font-[Playfair_Display] text-[40px] md:text-[80px] leading-[44px] md:leading-[86px] tracking-[-0.03em] text-[#121212]"
            style={{ opacity: 0 }}
          >
            On-Body<br />Visualization.
          </h1>
          <p
            ref={subtextRef}
            className="font-[Manrope] text-[15px] md:text-[18px] leading-[24px] md:leading-[30px] text-[#555] max-w-md"
            style={{ opacity: 0 }}
          >
            Photorealistic on-model composites that place your pieces in context —
            without a single photoshoot. Effortless, scalable, and skin-accurate.
          </p>
          <div ref={tagsRef} className="flex flex-wrap gap-3 mt-2">
            {['Model Compositing', 'Skin-accurate', 'Full Post'].map((tag) => (
              <TagPill key={tag} label={tag} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-px mt-10 bg-[#c4c7c7]/20">
            <StatCard value="0"    label="Photoshoots needed" />
            <StatCard value="48h"  label="Avg. Turnaround"    />
            <StatCard value="8K"   label="Output Resolution"  />
            <StatCard value="100%" label="Skin-tone matched"  />
          </div>
        </div>

        <div
          ref={heroImgRef}
          className="relative overflow-hidden gallery-shadow"
          style={{ aspectRatio: '3/4', opacity: 0 }}
        >
          <img src={hero.src} alt={hero.alt} className="w-full h-full object-cover" />
          {hero.chips && (
            <div
              className="absolute bottom-6 left-6 px-5 py-3 rounded-sm flex items-center gap-3"
              style={{ background: 'rgba(255,255,255,0.38)', backdropFilter: 'blur(20px)', border: '0.5px solid rgba(255,255,255,0.22)' }}
            >
              {hero.chips.map((chip, i) => (
                <span key={chip} className="flex items-center gap-3">
                  {i > 0 && <div className="w-1 h-1 bg-[#121212] rounded-full" />}
                  <span className="font-[Manrope] text-[11px] tracking-[0.15em] font-semibold uppercase text-[#121212]">{chip}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mb-16 md:mb-24 flex items-end justify-between gap-8">
        <h2 className="reveal font-[Playfair_Display] text-[28px] md:text-[52px] leading-[34px] md:leading-[60px] tracking-[-0.02em] text-[#121212] max-w-lg">
          Pieces in Context
        </h2>
        <p className="reveal hidden md:block font-[Manrope] text-[13px] leading-[20px] text-[#888] max-w-xs text-right">
          Every image below is a composite — no model, no set.
          Pure digital craft on real skin texture.
        </p>
      </div>

      <div
        ref={dividerRef}
        className="w-full h-px bg-[#c4c7c7]/60 mb-16 md:mb-20"
        style={{ transformOrigin: 'left center' }}
      />

      {loading && <GallerySkeleton />}

      {error && (
        <div className="mb-40 py-16 text-center border border-[#c4c7c7]/40">
          <p className="font-[Manrope] text-[13px] text-[#c0392b] font-semibold mb-2">Could not load images</p>
          <p className="font-[Manrope] text-[12px] text-[#888]">{error}</p>
        </div>
      )}

      {!loading && !error && driveImages.length === 0 && (
        <div className="mb-40 py-16 text-center border border-[#c4c7c7]/40">
          <p className="font-[Manrope] text-[13px] text-[#888]">
            No images yet — upload photos to your Google Drive folder and they'll appear here automatically.
          </p>
        </div>
      )}

      {!loading && !error && driveImages.length > 0 && (
        <>
          <ScatteredGallery images={driveImages} className="mb-40" onImageClick={openAt} />
          <LightboxModal images={driveImages} activeIndex={activeIndex} onClose={close} onPrev={prev} onNext={next} />
        </>
      )}

    </ServicePageLayout>
  )
}

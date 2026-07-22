import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ServicePageLayout } from '@/components/shared/ServicePageLayout'
import { BackToVault } from '@/components/shared/BackToVault'
import { ParallaxImage } from '@/components/shared/ParallaxImage'
import { LightboxModal } from '@/components/shared/LightboxModal'
import { useLightbox } from '@/hooks/useLightbox'
import { useDriveImages } from '@/components/shared/GoogleDriveGallery'

gsap.registerPlugin(ScrollTrigger)

/* ── Tag pill ─────────────────────────────────────────────────────────────── */
function TagPill({ label }) {
  return (
    <span className="font-[Manrope] text-[11px] tracking-[0.15em] font-semibold uppercase px-4 py-2 border border-[#c4c7c7] text-[#444748]">
      {label}
    </span>
  )
}

/* ── Stat card ────────────────────────────────────────────────────────────── */
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

/* ── Orbit Gallery (Drive-aware) ──────────────────────────────────────────── */
function LightboxOrbitGallery({ images, className, onImageClick }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.orbit-row', containerRef.current).forEach((row, i) => {
        const dir = i % 2 === 0 ? -18 : 18
        gsap.fromTo(row, { x: 0 }, {
          x: dir, ease: 'none',
          scrollTrigger: { trigger: row, start: 'top bottom', end: 'bottom top', scrub: 1.8 },
        })
      })
    }, containerRef)
    return () => ctx.revert()
  }, [images])

<<<<<<< HEAD
  // Build rows — 5-pattern cycle
  const rows = []
  let i = 0, rowIndex = 0
  while (i < images.length) {
    const take = [2, 1, 2, 3, 2][rowIndex % 5]
    rows.push({ pattern: rowIndex % 5, imgs: images.slice(i, i + Math.min(take, images.length - i)), startIdx: i })
    i += take
    rowIndex++
=======
  // Build rows — 5-pattern cycle. We cycle through the available images
  // (repeating from the start if needed) so that every row is always fully
  // populated — this is what was previously causing blank gaps in the
  // layout whenever the Drive folder had fewer images than a full cycle
  // needed (2+1+2+3+2 = 10 images per 5-row cycle).
  const rows = []
  if (images.length > 0) {
    let i = 0, rowIndex = 0
    // Total slots across a small number of cycles — enough rows to fill a
    // reasonable scroll length without looping forever.
    const totalSlots = Math.max(images.length, 10)
    while (i < totalSlots) {
      const take = [2, 1, 2, 3, 2][rowIndex % 5]
      const imgs = []
      for (let k = 0; k < take; k++) {
        imgs.push(images[(i + k) % images.length])
      }
      rows.push({ pattern: rowIndex % 5, imgs, startIdx: i % images.length })
      i += take
      rowIndex++
    }
>>>>>>> cfbe75f098b7aaba7e6f069f05833d2d50d13018
  }

  const delay = (idx) => idx * 0.12

  const Img = ({ img, globalIdx, revealDelay, parallaxAmount, scrubSpeed, aspectRatio }) => (
    <ParallaxImage
      src={img.src}
      alt={img.alt}
      label={img.label}
      aspectRatio={aspectRatio ?? '3/4'}
      parallaxAmount={parallaxAmount ?? 8}
      scrubSpeed={scrubSpeed ?? 0.9}
      revealDelay={revealDelay ?? 0}
      onClick={() => onImageClick(globalIdx)}
    />
  )

  return (
    <section ref={containerRef} className={`flex flex-col gap-10 md:gap-20 ${className ?? ''}`}>
      {rows.map((row, ri) => {
        const { pattern, imgs, startIdx } = row
        if (!imgs.length) return null

        if (pattern === 0) return (
          <div key={ri} className="orbit-row flex items-start gap-6 md:gap-10">
            <div className="w-[60%] flex-shrink-0">
              {imgs[0] && <Img img={imgs[0]} globalIdx={startIdx + 0} revealDelay={delay(0)} parallaxAmount={8} aspectRatio="4/5" />}
            </div>
            <div className="flex-1" style={{ marginTop: '80px' }}>
              {imgs[1] && <Img img={imgs[1]} globalIdx={startIdx + 1} revealDelay={delay(1)} parallaxAmount={12} aspectRatio="3/4" />}
            </div>
          </div>
        )

        if (pattern === 1) return (
          <div key={ri} className="orbit-row flex justify-center">
            <div className="w-[68%]">
              {imgs[0] && <Img img={imgs[0]} globalIdx={startIdx + 0} revealDelay={delay(0)} parallaxAmount={7} scrubSpeed={1.2} aspectRatio="16/9" />}
            </div>
          </div>
        )

        if (pattern === 2) return (
          <div key={ri} className="orbit-row flex items-start gap-6 md:gap-10">
            <div className="flex-1" style={{ marginTop: '-40px' }}>
              {imgs[0] && <Img img={imgs[0]} globalIdx={startIdx + 0} revealDelay={delay(0)} parallaxAmount={12} aspectRatio="3/4" />}
            </div>
            <div className="w-[60%] flex-shrink-0">
              {imgs[1] && <Img img={imgs[1]} globalIdx={startIdx + 1} revealDelay={delay(1)} parallaxAmount={8} aspectRatio="4/5" />}
            </div>
          </div>
        )

        if (pattern === 3) return (
          <div key={ri} className="orbit-row grid grid-cols-3 gap-5 md:gap-8">
            {[0, 1, 2].map((idx) => (
              <div key={idx} style={{ marginTop: `${[0, 100, 40][idx]}px` }}>
                {imgs[idx] && <Img img={imgs[idx]} globalIdx={startIdx + idx} revealDelay={delay(idx)} parallaxAmount={10} aspectRatio="1/1" />}
              </div>
            ))}
          </div>
        )

        if (pattern === 4) return (
          <div key={ri} className="orbit-row flex items-start gap-6 md:gap-10">
            <div className="w-[55%] flex-shrink-0">
              {imgs[0] && <Img img={imgs[0]} globalIdx={startIdx + 0} revealDelay={delay(0)} parallaxAmount={9} aspectRatio="3/4" />}
            </div>
            <div className="flex-1" style={{ marginTop: '120px' }}>
              {imgs[1] && <Img img={imgs[1]} globalIdx={startIdx + 1} revealDelay={delay(1)} parallaxAmount={11} aspectRatio="4/5" />}
            </div>
          </div>
        )

        return null
      })}
    </section>
  )
}

/* ── Loading skeleton ─────────────────────────────────────────────────────── */
function GallerySkeleton() {
  return (
    <div className="flex flex-col gap-10 mb-40">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-6 items-start">
          <div className="bg-[#f0f0f0] animate-pulse w-[60%]" style={{ aspectRatio: '4/5', borderRadius: 4 }} />
          <div className="bg-[#f0f0f0] animate-pulse flex-1 mt-20" style={{ aspectRatio: '3/4', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function CreativeImagesPage() {
  const headingRef = useRef(null)
  const subtextRef = useRef(null)
  const tagsRef    = useRef(null)
  const heroImgRef = useRef(null)
  const dividerRef = useRef(null)

  // ── Fetch images from Google Drive ──────────────────────────────────────
  const { images: driveImages, loading, error } = useDriveImages('creative-image')
  const { activeIndex, openAt, close, prev, next } = useLightbox(driveImages)

  /* Hero entrance */
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

  /* Divider draw */
  useEffect(() => {
    if (!dividerRef.current) return
    gsap.fromTo(dividerRef.current,
      { scaleX: 0, transformOrigin: 'left center' },
      {
        scaleX: 1, duration: 1.2, ease: 'power4.inOut',
        scrollTrigger: { trigger: dividerRef.current, start: 'top 85%', once: true },
      }
    )
  }, [])

  return (
    <ServicePageLayout title="Creative Images" currentPage="/creative">

      {/* ── Split Hero ──────────────────────────────────────────────────── */}
      <section className="mb-28 md:mb-40 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start">
        <div className="flex flex-col gap-6 pt-4 md:pt-12">
          <BackToVault />

          <h1
            ref={headingRef}
            className="font-[Playfair_Display] text-[40px] md:text-[80px] leading-[44px] md:leading-[86px] tracking-[-0.03em] text-[#121212]"
            style={{ opacity: 0 }}
          >
            Creative<br />Images.
          </h1>

          <p
            ref={subtextRef}
            className="font-[Manrope] text-[15px] md:text-[18px] leading-[24px] md:leading-[30px] text-[#555] max-w-md"
            style={{ opacity: 0 }}
          >
            Editorial-grade CGI compositions that blur the boundary between craft and art —
            every frame conceived as a visual story, not just a product render.
          </p>

          <div ref={tagsRef} className="flex flex-wrap gap-3 mt-2">
            {['Editorial', 'Campaign-Ready', 'Art Direction'].map((tag) => (
              <TagPill key={tag} label={tag} />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-px mt-10 bg-[#c4c7c7]/20">
            <StatCard value="4K+"  label="Output Resolution" />
            <StatCard value="72h"  label="Avg. Turnaround"   />
            <StatCard value="∞"    label="Creative Concepts" />
            <StatCard value="100%" label="CGI Precision"     />
          </div>
        </div>

        <div
          ref={heroImgRef}
          className="relative overflow-hidden gallery-shadow"
          style={{ aspectRatio: '3/4', opacity: 0 }}
        >
          <img
            src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=900&auto=format&fit=cover"
            alt="Creative editorial jewellery hero"
            className="w-full h-full object-cover"
          />
          <div
            className="absolute bottom-6 left-6 px-5 py-3 rounded-sm flex items-center gap-3"
            style={{
              background:     'rgba(255,255,255,0.38)',
              backdropFilter: 'blur(20px)',
              border:         '0.5px solid rgba(255,255,255,0.22)',
            }}
          >
            {['Editorial', 'CGI'].map((chip, i) => (
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

      {/* ── Section title ───────────────────────────────────────────────── */}
      <div className="mb-16 md:mb-24 flex items-end justify-between gap-8">
        <h2 className="reveal font-[Playfair_Display] text-[28px] md:text-[52px] leading-[34px] md:leading-[60px] tracking-[-0.02em] text-[#121212] max-w-lg">
          The Edit
        </h2>
        <p className="reveal hidden md:block font-[Manrope] text-[13px] leading-[20px] text-[#888] max-w-xs text-right">
          Each image is a fully art-directed CGI composite — no studio,
          no photographer. Pure creative vision rendered at 4K and above.
        </p>
      </div>

      {/* ── Thin rule ───────────────────────────────────────────────────── */}
      <div
        ref={dividerRef}
        className="w-full h-px bg-[#c4c7c7]/60 mb-20 md:mb-28"
        style={{ transformOrigin: 'left center' }}
      />

      {/* ── Gallery — driven by Google Drive ────────────────────────────── */}
      {loading && <GallerySkeleton />}

      {error && (
        <div className="mb-40 py-16 text-center border border-[#c4c7c7]/40">
          <p className="font-[Manrope] text-[13px] text-[#c0392b] font-semibold mb-2">
            Could not load images
          </p>
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
          <LightboxOrbitGallery
            images={driveImages}
            className="mb-40"
            onImageClick={openAt}
          />
          <LightboxModal
            images={driveImages}
            activeIndex={activeIndex}
            onClose={close}
            onPrev={prev}
            onNext={next}
          />
        </>
      )}

    </ServicePageLayout>
  )
}

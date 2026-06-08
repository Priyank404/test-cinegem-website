import { useEffect, useRef }  from 'react'
import { gsap }                from 'gsap'
import { ScrollTrigger }       from 'gsap/ScrollTrigger'
import { ServicePageLayout }   from '@/components/shared/ServicePageLayout'
import { BackToVault }         from '@/components/shared/BackToVault'
import { ScatteredGallery }    from '@/components/shared/ScatteredGallery'
import { LightboxModal }       from '@/components/shared/LightboxModal'
import { useLightbox }         from '@/hooks/useLightbox'
import { ONBODY_IMAGES }       from '@/constants/gallery'

gsap.registerPlugin(ScrollTrigger)

/* ─────────────────────────────────────────────────────────────────────────
   Inline gallery data — add more items here to populate the scattered grid.
   These extend / replace the static ONBODY_IMAGES.gallery constant.
   Each entry needs: { src, alt, label }
──────────────────────────────────────────────────────────────────────────── */
const GALLERY_ITEMS = [
  ...(ONBODY_IMAGES.gallery ?? []),
  // Pad to at least 6 so all three columns fill visually
  {
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDm5EsqKjVjDwNCLkd7zO1jyXeYfYc18Rig2lvwFEoVxs5I5SCqEPsRO9yjYQHBsYVldyjgs6IXDJikSWiUlpNT32JhbeHmdvc8Er1DGDp0ap6vFRfIevcA83WkrqMs83UDHNkb75JxlMqo2E_BRV3LUV3vb5P7C9FCHtYhJ03RuwmAprhoarkzsAFaa1TFCRNsMpN1fGG5j4zsgTAhYp4eksyEvu7W7P2OqGY_9Gqa306lkU43UZZq4xu2bAd7OnAnJWg8Od4hQho',
    alt: 'Ring detail — finger skin texture',
    label: 'Ring Context',
  },
  {
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC0Tc7i2mEJj2Aie7usQQBNK2jiIcwkzB8pgnSa3D9kAIjhaGWVz9homlQmZTh9D6uywm4rUfWVttwZh3Sdn15iOcuTofKXUYBnzd_2Kn7FAAhvuXEC_NzJkyT379MwmRRk8DczOeGnoNu94kGimLDYlBlyau8y3K38SScC_d-6EqgIUbyAcBC5-xR5Q2FjiOVSeOFd1CaCjYzylvTJo-Y_STku8ta51d0Wi6hSLIe-vKbSFoiv59rR79VIDNBIKrWU6oP8yFwJh1o',
    alt: 'Ear and shoulder — earring placement',
    label: 'Earring Placement',
  },
  {
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAQvBe037qoIr0S4wq7SVMxkmX6I2latfPSZoprsdt4M0obhFWC3qHZpXKXnBm1_cih5DNJpZsqxoPN1-YoOnmrpZF3s7xTxzzMfkiqfgLl7DWLgnu7lssS_tbyLwvn9rMW7B2QwCSPdCrOTW71KFlk7EwoyXnnRkfQXF2GEipqAvIvdNYmIhOuMi7VgTpmtXEC0pyLz4lRivTRvEZyRU-7tPBg5vzGrhdMqQhzlEmfxtc1iEi-_yJiiuK8mOH7VmBNd2QhuocaTzc',
    alt: 'Wrist and cuff bracelet editorial',
    label: 'Bracelet Cuff',
  },
  { src: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=cover', alt: 'Luxury diamond engagement ring macro' },
  { src: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&auto=format&fit=cover', alt: 'Gold pendant minimalist profile' },
  { src: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=cover', alt: 'Premium wedding bands collection' },
  { src: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600&auto=format&fit=cover', alt: 'Sapphire luxury drop earrings' },
  { src: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=600&auto=format&fit=cover', alt: 'Platinum layered eternity ring' },
  { src: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&auto=format&fit=cover', alt: 'Ruby vintage pendant macro' },
  { src: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=600&auto=format&fit=cover', alt: 'Emerald emerald-cut statement collection' },
  { src: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=600&auto=format&fit=cover', alt: 'Classic diamond tennis bracelet close-up' },
]

/* ─────────────────────────────────────────────────────────────────────────
   Tag pill component
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
   Page
──────────────────────────────────────────────────────────────────────────── */
export default function OnBodyVisualizationPage() {
  const heroRef     = useRef(null)
  const headingRef  = useRef(null)
  const subtextRef  = useRef(null)
  const tagsRef     = useRef(null)
  const heroImgRef  = useRef(null)
  const dividerRef  = useRef(null)

  const { activeIndex, openAt, close, prev, next } = useLightbox(GALLERY_ITEMS)

  /* Hero entrance animation */
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

  const { hero } = ONBODY_IMAGES

  return (
    <ServicePageLayout title="On-Body Visualization" currentPage="/onbody">

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
            On-Body
            <br />
            Visualization.
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

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-px mt-10 bg-[#c4c7c7]/20">
            <StatCard value="0"    label="Photoshoots needed" />
            <StatCard value="48h"  label="Avg. Turnaround"    />
            <StatCard value="8K"   label="Output Resolution"  />
            <StatCard value="100%" label="Skin-tone matched"  />
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
                background:    'rgba(255,255,255,0.38)',
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
          Pieces in Context
        </h2>
        <p className="reveal hidden md:block font-[Manrope] text-[13px] leading-[20px] text-[#888] max-w-xs text-right">
          Every image below is a composite — no model, no set.
          Pure digital craft on real skin texture.
        </p>
      </div>

      {/* ── Thin rule ─────────────────────────────────────────────────── */}
      <div
        ref={dividerRef}
        className="w-full h-px bg-[#c4c7c7]/60 mb-16 md:mb-20"
        style={{ transformOrigin: 'left center' }}
      />

      {/* ── Scattered Gallery ─────────────────────────────────────────── */}
      {/*
        To add images: push items to GALLERY_ITEMS above (or to
        ONBODY_IMAGES.gallery in src/constants/gallery.js).
        Each item needs: { src, alt, label }
        The component distributes them evenly across the 3 staggered columns.
      */}
      <ScatteredGallery images={GALLERY_ITEMS} className="mb-40" onImageClick={openAt} />

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

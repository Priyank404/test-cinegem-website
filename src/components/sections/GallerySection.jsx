import { useRef, useEffect } from 'react'
import { motion }            from 'framer-motion'
import { gsap }              from 'gsap'
import { ScrollTrigger }     from 'gsap/ScrollTrigger'

import { SectionLabel, GoldDivider, GlassChip } from '@/components/ui'
import { VAULT_PANELS }                          from '@/constants'
import { cn }                                    from '@/lib/utils'

gsap.registerPlugin(ScrollTrigger)

// ─── GalleryItem ──────────────────────────────────────────────────────────────

function GalleryItem({ panel, index }) {
  const isLarge = index % 3 === 0

  return (
    <motion.figure
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative flex-shrink-0 overflow-hidden cursor-pointer',
        isLarge
          ? 'w-[60vw] md:w-[40vw] lg:w-[30vw]'
          : 'w-[50vw] md:w-[32vw] lg:w-[24vw]'
      )}
      style={{ aspectRatio: isLarge ? '3/4' : '4/3' }}
      aria-label={`${panel.label} — ${panel.category}`}
    >
      <img
        src={panel.img}
        alt={`${panel.category}: ${panel.label}`}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover transition-transform duration-700 ease-expo group-hover:scale-105"
      />

      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal-deep/65 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Caption */}
      <figcaption className="absolute bottom-0 left-0 right-0 p-5 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-smooth">
        <p className="font-label text-[10px] tracking-[0.2em] text-cream-soft/60 uppercase mb-1">
          {panel.category}
        </p>
        <p className="font-display text-lg text-cream-soft tracking-[-0.02em]">
          {panel.label}
        </p>
      </figcaption>

      {/* Corner chip */}
      <div
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100"
        aria-hidden="true"
      >
        <GlassChip className="text-[9px] bg-white/20 border-white/20 text-white/80">
          VIEW
        </GlassChip>
      </div>
    </motion.figure>
  )
}

// ─── GallerySection ───────────────────────────────────────────────────────────

export function GallerySection() {
  const trackRef = useRef(null)

  // Horizontal scroll pinned to the viewport on desktop
  useEffect(() => {
    const ctx = gsap.context(() => {
      const track = trackRef.current
      if (!track) return

      const totalWidth = track.scrollWidth - track.clientWidth

      gsap.to(track, {
        x:             -totalWidth,
        ease:          'none',
        scrollTrigger: {
          trigger:   track.parentElement,
          start:     'top top',
          end:       () => `+=${totalWidth}`,
          scrub:     1.5,
          pin:       true,
          anticipatePin: 1,
        },
      })
    })

    return () => ctx.revert()
  }, [])

  return (
    <section
      id="gallery"
      className="bg-surface-container-low overflow-hidden"
      aria-labelledby="gallery-heading"
    >
      {/* Section header — sits above the pinned scroll area */}
      <div className="max-w-container mx-auto px-6 md:px-[--spacing-margin-desktop] pt-24 md:pt-32 pb-10">
        <div className="flex flex-col gap-5 max-w-lg">
          <SectionLabel>The Vault</SectionLabel>
          <GoldDivider />
          <h2
            id="gallery-heading"
            className="font-display text-headline-lg text-charcoal-deep tracking-[-0.02em]"
          >
            A curated archive of digital craft.
          </h2>
        </div>
      </div>

      {/* Pinned horizontal scroll track */}
      <div className="h-screen flex items-center">
        <div
          ref={trackRef}
          className="flex gap-6 pl-6 md:pl-[--spacing-margin-desktop] pr-32"
          role="list"
          aria-label="Gallery panels"
        >
          {VAULT_PANELS.map((panel, i) => (
            <div key={panel.id} role="listitem">
              <GalleryItem panel={panel} index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

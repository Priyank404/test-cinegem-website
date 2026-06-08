import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { SectionLabel, GoldDivider, GhostButton } from '@/components/ui'

// ─── ParallaxImage ────────────────────────────────────────────────────────────

function ParallaxImage({ src, alt }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%'])

  return (
    <div
      ref={ref}
      className="overflow-hidden h-[50vh] md:h-full relative"
      aria-hidden="true"
    >
      <motion.img
        src={src}
        alt={alt}
        style={{ y }}
        loading="lazy"
        decoding="async"
        className="w-full h-[120%] object-cover object-center absolute inset-0"
      />
    </div>
  )
}

// ─── AboutSection ─────────────────────────────────────────────────────────────

export function AboutSection() {
  return (
    <section
      id="about"
      className="bg-charcoal-deep text-cream-soft overflow-hidden"
      aria-labelledby="about-heading"
    >
      <div className="max-w-container mx-auto grid md:grid-cols-2 min-h-[80vh]">

        {/* Image column */}
        <ParallaxImage
          src="https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=900&q=90&auto=format"
          alt="Artisan at work — Cinegem Studio craftsmanship"
        />

        {/* Text column */}
        <div className="flex flex-col justify-center gap-8 px-8 md:px-16 py-20 md:py-28">

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-5"
          >
            <SectionLabel className="text-cream-soft/40">
              About the Studio
            </SectionLabel>
            <GoldDivider />
            <h2
              id="about-heading"
              className="font-display text-headline-lg text-cream-soft tracking-[-0.02em]"
            >
              Rendering is not photography. It's architecture.
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-5"
          >
            <p className="font-body text-body-lg text-cream-soft/70 leading-relaxed">
              Cinegem Studio was founded on a single conviction: that the beauty of fine jewelry deserves a visual medium as precise as the craft itself.
            </p>
            <p className="font-body text-body-md text-cream-soft/50 leading-relaxed">
              Every refraction calculated. Every surface calibrated. We build proprietary HDRI environments tuned to the specific reflectance properties of gold, platinum, and gemstone inclusions — because a diamond's soul lives in its light.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <GhostButton
              href="#contact"
              className="border-cream-soft/30 text-cream-soft hover:bg-cream-soft/10 hover:border-cream-soft"
            >
              Work with Us
            </GhostButton>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

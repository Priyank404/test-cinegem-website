import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TESTIMONIALS }             from '@/constants'
import { SectionLabel, GoldDivider } from '@/components/ui'
import { cn }                        from '@/lib/utils'

// ─── TestimonialSlide ─────────────────────────────────────────────────────────

function TestimonialSlide({ testimonial }) {
  return (
    <motion.blockquote
      key={testimonial.id}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-7"
    >
      {/* Opening quote mark */}
      <span
        className="font-display text-[5rem] leading-none text-champagne-gold/25 select-none"
        aria-hidden="true"
      >
        "
      </span>

      <p className="font-display text-headline-md text-charcoal-deep tracking-[-0.02em] italic leading-snug max-w-2xl">
        {testimonial.quote}
      </p>

      <footer className="flex flex-col gap-1">
        <cite className="font-label text-label-caps text-charcoal-deep not-italic">
          {testimonial.author}
        </cite>
        <span className="font-body text-body-md text-on-surface-variant">
          {testimonial.role}
        </span>
      </footer>
    </motion.blockquote>
  )
}

// ─── TestimonialsSection ──────────────────────────────────────────────────────

export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0)

  const prev = useCallback(() => {
    setActiveIndex((i) => (i === 0 ? TESTIMONIALS.length - 1 : i - 1))
  }, [])

  const next = useCallback(() => {
    setActiveIndex((i) => (i === TESTIMONIALS.length - 1 ? 0 : i + 1))
  }, [])

  return (
    <section
      id="testimonials"
      className="bg-surface py-24 md:py-36"
      aria-labelledby="testimonials-heading"
    >
      <div className="max-w-container mx-auto px-6 md:px-[--spacing-margin-desktop]">

        {/* Header */}
        <div className="flex flex-col gap-5 mb-16">
          <SectionLabel>Client Voices</SectionLabel>
          <GoldDivider />
          <h2
            id="testimonials-heading"
            className="sr-only"
          >
            Testimonials
          </h2>
        </div>

        {/* Slide */}
        <div
          className="relative min-h-[280px] flex items-start"
          aria-live="polite"
          aria-atomic="true"
        >
          <AnimatePresence mode="wait">
            <TestimonialSlide
              key={TESTIMONIALS[activeIndex].id}
              testimonial={TESTIMONIALS[activeIndex]}
            />
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-6 mt-14">
          <button
            onClick={prev}
            className="w-12 h-12 border border-outline-variant/50 flex items-center justify-center hover:border-champagne-gold hover:text-champagne-gold transition-all duration-400 text-on-surface-variant"
            aria-label="Previous testimonial"
          >
            ←
          </button>

          {/* Dot indicators */}
          <div className="flex gap-2" role="tablist" aria-label="Testimonial navigation">
            {TESTIMONIALS.map((t, i) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={`Testimonial by ${t.author}`}
                onClick={() => setActiveIndex(i)}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all duration-400',
                  i === activeIndex
                    ? 'bg-champagne-gold w-6'
                    : 'bg-outline-variant hover:bg-on-surface-variant'
                )}
              />
            ))}
          </div>

          <button
            onClick={next}
            className="w-12 h-12 border border-outline-variant/50 flex items-center justify-center hover:border-champagne-gold hover:text-champagne-gold transition-all duration-400 text-on-surface-variant"
            aria-label="Next testimonial"
          >
            →
          </button>
        </div>
      </div>
    </section>
  )
}

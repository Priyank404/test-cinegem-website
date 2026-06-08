import { motion }             from 'framer-motion'
import { useScrollReveal }    from '@/hooks/useScrollReveal'
import { PROCESS_STEPS, STUDIO_STATS } from '@/constants'
import { GoldDivider, SectionLabel }   from '@/components/ui'

// ─── Step ─────────────────────────────────────────────────────────────────────

function Step({ step, index }) {
  return (
    <motion.div
      className="reveal relative flex flex-col gap-5 group"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, delay: index * 0.13, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Horizontal connector (all except last on desktop) */}
      {index < PROCESS_STEPS.length - 1 && (
        <div
          className="hidden lg:block absolute top-6 left-[calc(100%+1px)] w-full h-px bg-outline-variant/30"
          aria-hidden="true"
        />
      )}

      {/* Step number badge */}
      <div className="w-12 h-12 border border-outline-variant/50 flex items-center justify-center group-hover:border-champagne-gold transition-colors duration-500">
        <span className="font-label text-label-caps text-on-surface-variant group-hover:text-champagne-gold transition-colors duration-500">
          {step.step}
        </span>
      </div>

      <div className="flex flex-col gap-3 pr-8">
        <h3 className="font-display text-headline-md text-charcoal-deep tracking-[-0.02em]">
          {step.title}
        </h3>
        <p className="font-body text-body-md text-on-surface-variant leading-relaxed">
          {step.body}
        </p>
      </div>
    </motion.div>
  )
}

// ─── StatItem ─────────────────────────────────────────────────────────────────

function StatItem({ value, label }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-display text-[clamp(2rem,4vw,3rem)] text-charcoal-deep tracking-tight leading-none">
        {value}
      </p>
      <p className="font-label text-label-caps text-on-surface-variant/60">{label}</p>
    </div>
  )
}

// ─── ProcessSection ───────────────────────────────────────────────────────────

export function ProcessSection() {
  const containerRef = useScrollReveal()

  return (
    <section
      id="process"
      ref={containerRef}
      className="bg-surface-container-low py-24 md:py-36"
      aria-labelledby="process-heading"
    >
      <div className="max-w-container mx-auto px-6 md:px-[--spacing-margin-desktop]">

        {/* Header */}
        <div className="reveal flex flex-col gap-5 max-w-lg mb-20 md:mb-24">
          <SectionLabel>Our Process</SectionLabel>
          <GoldDivider />
          <h2
            id="process-heading"
            className="font-display text-headline-lg text-charcoal-deep tracking-[-0.02em]"
          >
            From blueprint to brilliance — four steps.
          </h2>
        </div>

        {/* Steps grid */}
        <ol
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-14 lg:gap-8 relative"
          aria-label="Our four-step process"
        >
          {PROCESS_STEPS.map((step, i) => (
            <li key={step.step}>
              <Step step={step} index={i} />
            </li>
          ))}
        </ol>

        {/* Stats strip */}
        <div className="reveal mt-24 pt-12 border-t border-outline-variant/30 grid grid-cols-2 md:grid-cols-4 gap-10">
          {STUDIO_STATS.map((stat) => (
            <StatItem key={stat.label} value={stat.value} label={stat.label} />
          ))}
        </div>
      </div>
    </section>
  )
}

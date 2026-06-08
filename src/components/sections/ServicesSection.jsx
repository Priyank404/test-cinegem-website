import { useScrollReveal }                      from '@/hooks/useScrollReveal'
import { SERVICES }                              from '@/constants'
import { GoldDivider, SectionLabel, GhostButton } from '@/components/ui'
import { cn }                                    from '@/lib/utils'

// ─── ServiceCard ──────────────────────────────────────────────────────────────

function ServiceCard({ service }) {
  return (
    <article
      className={cn(
        'reveal group border-t border-outline-variant/40 py-10 md:py-12',
        'grid grid-cols-[auto_1fr] md:grid-cols-[80px_1fr_auto] gap-6 md:gap-10 items-start',
        'hover:border-champagne-gold transition-colors duration-500 cursor-pointer'
      )}
      tabIndex={0}
      aria-label={`Service: ${service.title}`}
    >
      {/* Index */}
      <span className="font-label text-label-caps text-on-surface-variant/50 pt-1 select-none">
        {service.index}
      </span>

      {/* Content */}
      <div className="flex flex-col gap-4">
        <h3 className="font-display text-headline-md text-charcoal-deep group-hover:text-champagne-gold transition-colors duration-500 tracking-[-0.02em]">
          {service.title}
        </h3>
        <p className="font-body text-body-md text-on-surface-variant leading-relaxed max-w-xl">
          {service.description}
        </p>
        <ul className="flex flex-wrap gap-2 mt-2" aria-label={`${service.title} features`}>
          {service.tags.map((tag) => (
            <li
              key={tag}
              className={cn(
                'font-label text-[10px] tracking-[0.18em] uppercase',
                'border border-outline-variant/50 text-on-surface-variant px-3 py-1.5',
                'group-hover:border-champagne-gold/50 group-hover:text-champagne-gold transition-all duration-500'
              )}
            >
              {tag}
            </li>
          ))}
        </ul>
      </div>

      {/* Arrow indicator */}
      <div className="hidden md:flex items-start pt-1" aria-hidden="true">
        <span className="font-label text-label-caps text-on-surface-variant/30 group-hover:text-champagne-gold group-hover:translate-x-1 transition-all duration-500 text-lg">
          →
        </span>
      </div>
    </article>
  )
}

// ─── ServicesSection ──────────────────────────────────────────────────────────

export function ServicesSection() {
  const containerRef = useScrollReveal({ selector: '.reveal', stagger: 0.1 })

  return (
    <section
      id="services"
      ref={containerRef}
      className="bg-surface py-24 md:py-36"
      aria-labelledby="services-heading"
    >
      <div className="max-w-container mx-auto px-6 md:px-[--spacing-margin-desktop]">

        {/* Header */}
        <div className="reveal flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 md:mb-20">
          <div className="flex flex-col gap-5">
            <SectionLabel>Our Services</SectionLabel>
            <GoldDivider />
            <h2
              id="services-heading"
              className="font-display text-headline-lg text-charcoal-deep tracking-[-0.02em] max-w-lg"
            >
              Every angle of luxury, rendered in light.
            </h2>
          </div>
          <p className="font-body text-body-md text-on-surface-variant max-w-xs leading-relaxed">
            From hyper-realistic stills to cinematic 360° animations — we translate craftsmanship into pixels with unwavering fidelity.
          </p>
        </div>

        {/* Service list */}
        <div role="list">
          {SERVICES.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>

        {/* CTA */}
        <div className="reveal mt-16 flex justify-start">
          <GhostButton href="#contact">View Full Capabilities</GhostButton>
        </div>
      </div>
    </section>
  )
}

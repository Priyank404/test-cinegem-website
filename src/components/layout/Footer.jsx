import { FOOTER_LINKS } from '@/constants'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer
      className="relative z-10 border-t border-outline-variant/30 bg-surface"
      role="contentinfo"
    >
      {/* Gold gradient rule */}
      <div
        className="h-px w-full bg-gradient-to-r from-transparent via-champagne-gold/60 to-transparent"
        aria-hidden="true"
      />

      <div className="max-w-container mx-auto px-6 md:px-[--spacing-margin-desktop] py-16 md:py-20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10">

          {/* Brand */}
          <div className="flex flex-col gap-3">
            <span className="font-display text-2xl tracking-[-0.04em] text-charcoal-deep">
              CINEGEM
            </span>
            <p className="font-body text-body-md text-on-surface-variant max-w-xs leading-relaxed">
              The Art of Digital Craft. Luxury rendering for the world's finest maisons.
            </p>
          </div>

          {/* Footer nav */}
          <nav className="flex flex-wrap gap-8" aria-label="Footer navigation">
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-label text-label-caps text-on-surface-variant hover:text-champagne-gold transition-colors duration-300"
                {...(link.external
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {}
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Bottom row */}
        <div className="mt-12 pt-8 border-t border-outline-variant/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p className="font-label text-label-caps text-on-surface-variant/60">
            © {year} Cinegem Studio. All Rights Reserved.
          </p>
          <p className="font-label text-label-caps text-on-surface-variant/40">
            The Sound of Craft™
          </p>
        </div>
      </div>
    </footer>
  )
}

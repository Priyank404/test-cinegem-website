import { useEffect } from 'react'
import { FOOTER_LINKS } from '@/constants'
import { ServiceHeader } from '@/components/layout/ServiceHeader'

/**
 * ServicePageLayout
 * Shared shell for every service page: navigation, back-to-vault button, footer.
 *
 * Props:
 *   children    – page content
 *   title       – <title> tag text
 *   currentPage – route string of the current page (e.g. '/still')
 *                 Used to mark the matching link active in the nav dropdown
 *                 and mobile drawer.
 *   fullBleed   – when true, removes <main>'s default top padding,
 *                 side padding, and max-width cap (pt-20 only, to clear
 *                 the fixed 80px header). Used by pages that need full
 *                 viewport width and exact header-height spacing.
 */
export function ServicePageLayout({ children, title = 'Cinegem Studio', currentPage = '', fullBleed = false }) {
  useEffect(() => {
    document.title = `${title} — Cinegem Studio`
  }, [title])

  return (
    <div
      className="min-h-screen text-[#1b1c17] antialiased selection:bg-[#C5A059] selection:text-white"
      style={{ background: 'radial-gradient(circle at 50% 0%, #FAF9F6 0%, #E5DACE 100%)' }}
    >
      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <ServiceHeader currentPage={currentPage} alwaysVisible={true} />

      {/* ── Page content ───────────────────────────────────────────────── */}
      <main className={fullBleed ? 'pt-20' : 'pt-32 md:pt-48 pb-24 px-4 md:px-20 max-w-[1440px] mx-auto'}>
        {children}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="w-full py-16 bg-gradient-to-t from-[#E5DACE]/20 to-transparent flex flex-col md:flex-row justify-between items-center px-6 md:px-20 gap-8">
        <div className="font-[Playfair_Display] text-[32px] leading-[40px] text-[#121212]">
          CINEGEM
        </div>
        <div className="font-[Manrope] text-[16px] leading-[24px] text-[#444748] text-center md:text-left">
          © 2024 Cinegem Studio. The Art of Digital Craft.
        </div>
        <div className="flex flex-wrap justify-center gap-6 md:gap-8">
          {FOOTER_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-[Manrope] text-[12px] tracking-[0.15em] font-semibold uppercase text-[#444748] hover:text-[#C5A059] transition-colors duration-300"
              {...(link.external
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {}
              )}
            >
              {link.label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  )
}
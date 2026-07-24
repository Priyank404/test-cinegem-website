import { useEffect } from 'react'
import { ServiceHeader } from '@/components/layout/ServiceHeader'
import { Footer } from '@/components/layout/Footer'
import VantaFogBackground from '@/components/effects/VantaFogBackground'

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
      style={{ background: '#FAF9F6' }}
    >
      {/* Vanta Fog Background */}
      <VantaFogBackground zIndex={0} />

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <ServiceHeader currentPage={currentPage} />

      {/* ── Page content ───────────────────────────────────────────────── */}
      <main className={fullBleed ? 'pt-20' : 'pt-32 md:pt-48 pb-24 px-4 md:px-20 max-w-[1440px] mx-auto'}>
        {children}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <Footer />
    </div>
  )
}
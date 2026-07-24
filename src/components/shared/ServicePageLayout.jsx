import { useEffect } from 'react'
import { ServiceHeader } from '@/components/layout/ServiceHeader'
import { Footer } from '@/components/layout/Footer'

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
      <Footer />
    </div>
  )
}
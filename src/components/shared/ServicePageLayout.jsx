import { useEffect } from 'react'
import { ServiceHeader } from '@/components/layout/ServiceHeader'
import { Footer } from '@/components/layout/Footer'
import VantaFogBackground from '@/components/effects/VantaFogBackground'
import { useSeo } from '@/seo/useSeo'

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
export function ServicePageLayout({
  children,
  title = 'Cinegem Studio',
  currentPage = '',
  seoKey = '',
  fullBleed = false,
  theme = 'dark',
  hideFooter = false,
  noScroll = false,
  alwaysVisibleHeader = false,
  mainClassName = '',
}) {
  useSeo(seoKey || currentPage)

  useEffect(() => {
    if (noScroll) {
      const prevBodyOverflow = document.body.style.overflow
      const prevHtmlOverflow = document.documentElement.style.overflow
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prevBodyOverflow
        document.documentElement.style.overflow = prevHtmlOverflow
      }
    }
  }, [noScroll])

  return (
    <div
      className={
        noScroll
          ? 'no-scroll-layout fixed inset-0 w-screen h-screen overflow-hidden text-[#FCFBFA] antialiased selection:bg-[#C5A059] selection:text-white flex flex-col justify-between'
          : 'min-h-screen text-[#FCFBFA] antialiased selection:bg-[#C5A059] selection:text-white'
      }
      style={{ background: '#0a0a0c' }}
    >
      {/* Vanta Fog Background */}
      <VantaFogBackground zIndex={0} />

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <ServiceHeader
        currentPage={currentPage}
        theme={theme}
        alwaysVisible={alwaysVisibleHeader || noScroll}
      />

      {/* ── Page content ───────────────────────────────────────────────── */}
      <main
        className={
          mainClassName
            ? mainClassName
            : noScroll
            ? 'flex-1 w-full min-h-0 overflow-hidden flex flex-col pt-16 sm:pt-20 relative z-10'
            : fullBleed
            ? 'pt-20'
            : 'pt-20 sm:pt-24 md:pt-28 pb-16 md:pb-24 px-4 sm:px-6 md:px-12 lg:px-20 max-w-[1440px] mx-auto'
        }
      >
        {children}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      {!hideFooter && <Footer />}
    </div>
  )
}
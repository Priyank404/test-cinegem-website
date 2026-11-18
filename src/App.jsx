import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'

import HomePage         from '@/pages/HomePage'
import { CustomCursor } from '@/components/ui/CustomCursor'

const OnBodyVisualizationPage = lazy(() => import('@/pages/OnBodyVisualizationPage'))
const InquirePage             = lazy(() => import('@/pages/InquirePage'))
const ClassicEComVisuals      = lazy(() => import('./pages/ClassicEComVisuals'))
const CreativeVisualsPage     = lazy(() => import('@/pages/CreativeVisualsPage'))
const ThreeDViewerPage        = lazy(() => import('@/pages/ThreeDViewerPage'))
const FaqPage                 = lazy(() => import('@/pages/FaqPage'))
const NotFound                = lazy(() => import('@/pages/NotFound'))

const MobileDebugOverlay = import.meta.env.DEV
  ? lazy(() => import('@/components/dev/MobileDebugOverlay'))
  : () => null

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    
    // Save original styles
    const originalHtmlScrollBehavior = html.style.scrollBehavior
    const originalBodyScrollBehavior = body ? body.style.scrollBehavior : ''

    // Force scroll-behavior to auto (instant scroll) to bypass smooth scrolling stylesheet rules
    html.style.setProperty('scroll-behavior', 'auto', 'important')
    if (body) {
      body.style.setProperty('scroll-behavior', 'auto', 'important')
    }

    const resetScroll = () => {
      window.scrollTo(0, 0)
      if (body) {
        body.scrollTop = 0
        body.scrollLeft = 0
      }
      if (html) {
        html.scrollTop = 0
        html.scrollLeft = 0
      }
    }

    // Scroll immediately
    resetScroll()

    // Scroll on next animation frame
    const rafId = requestAnimationFrame(resetScroll)

    // Scroll after a short delay to handle any async rendering/layout updates
    const timeoutId = setTimeout(() => {
      resetScroll()
      
      // Restore original scroll behaviors
      if (html) {
        html.style.scrollBehavior = originalHtmlScrollBehavior
      }
      if (body) {
        body.style.scrollBehavior = originalBodyScrollBehavior
      }
    }, 100)

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(timeoutId)
      
      if (html) {
        html.style.scrollBehavior = originalHtmlScrollBehavior
      }
      if (body) {
        body.style.scrollBehavior = originalBodyScrollBehavior
      }
    }
  }, [pathname])

  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <CustomCursor />
      <Suspense fallback={null}>
        <MobileDebugOverlay />
        <Routes>
          <Route path="/"                 element={<HomePage />} />
          <Route path="/hero2"            element={<Navigate to="/" replace />} />
          <Route path="/onbody"           element={<OnBodyVisualizationPage />} />
          <Route path="/inquire"          element={<InquirePage />} />
          <Route path="/classic"          element={<ClassicEComVisuals />} />
          <Route path="/creative-visuals" element={<CreativeVisualsPage />} />
          <Route path="/faq"              element={<FaqPage />} />
          <Route path="/3d-viewer"        element={<ThreeDViewerPage />} />
          <Route path="/3dviewer"         element={<Navigate to="/3d-viewer" replace />} />
          <Route path="*"                 element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  )
}

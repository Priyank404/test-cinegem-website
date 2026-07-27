import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'

import HomePage                from '@/pages/HomePage'
import OnBodyVisualizationPage from '@/pages/OnBodyVisualizationPage'
import InquirePage             from '@/pages/InquirePage'
import { CustomCursor }        from '@/components/ui/CustomCursor'
import ClassicEComVisuals      from './pages/ClassicEComVisuals'
import CreativeVisualsPage     from '@/pages/CreativeVisualsPage'
import ThreeDViewerPage        from '@/pages/ThreeDViewerPage'

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
      <Routes>
        <Route path="/"                 element={<HomePage />} />
        <Route path="/hero2"            element={<HomePage />} />
        <Route path="/onbody"           element={<OnBodyVisualizationPage />} />
        <Route path="/inquire"          element={<InquirePage />} />
        <Route path="/classic"          element={<ClassicEComVisuals />} />
        <Route path="/creative-visuals" element={<CreativeVisualsPage />} />
        <Route path="/3d-viewer"        element={<ThreeDViewerPage />} />
        <Route path="/3dviewer"         element={<ThreeDViewerPage />} />
      </Routes>
    </>
  )
}
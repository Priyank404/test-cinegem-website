import { useState, useCallback, useEffect } from 'react'

/**
 * useLightbox
 * ─────────────────────────────────────────────────────────────────────────
 * Manages lightbox open/close state and gallery navigation.
 *
 * Usage:
 *   const { activeIndex, openAt, close, prev, next } = useLightbox(images)
 *
 *   <SomeImage onClick={() => openAt(i)} />
 *   <LightboxModal
 *     images={images}
 *     activeIndex={activeIndex}
 *     onClose={close}
 *     onPrev={prev}
 *     onNext={next}
 *   />
 */
export function useLightbox(images = []) {
  const [activeIndex, setActiveIndex] = useState(null)

  const openAt = useCallback((index) => {
    setActiveIndex(index)
  }, [])

  const close = useCallback(() => {
    setActiveIndex(null)
  }, [])

  const prev = useCallback(() => {
    setActiveIndex((i) => (i > 0 ? i - 1 : i))
  }, [])

  const next = useCallback(() => {
    setActiveIndex((i) => (i < images.length - 1 ? i + 1 : i))
  }, [images.length])

  // Listen for thumbnail strip "goto" events from LightboxModal
  useEffect(() => {
    const handler = (e) => {
      const idx = e.detail
      if (typeof idx === 'number' && idx >= 0 && idx < images.length) {
        setActiveIndex(idx)
      }
    }
    window.addEventListener('lightbox:goto', handler)
    return () => window.removeEventListener('lightbox:goto', handler)
  }, [images.length])

  return { activeIndex, openAt, close, prev, next }
}

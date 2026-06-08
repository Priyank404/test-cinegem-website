import { useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * LightboxModal
 * ─────────────────────────────────────────────────────────────────────────
 * Full-screen image lightbox with gallery navigation.
 *
 * Props:
 *   images       – array of { src, alt, label } objects (the full gallery)
 *   activeIndex  – currently displayed index (null = closed)
 *   onClose      – called when user closes the lightbox
 *   onPrev       – called to navigate to previous image
 *   onNext       – called to navigate to next image
 */
export function LightboxModal({ images = [], activeIndex, onClose, onPrev, onNext }) {
  const overlayRef = useRef(null)
  const isOpen = activeIndex !== null && activeIndex >= 0

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape')      onClose()
      if (e.key === 'ArrowLeft')   onPrev()
      if (e.key === 'ArrowRight')  onNext()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose, onPrev, onNext])

  // Lock body scroll while open; lift cursor dots above lightbox
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // Raise custom cursor above lightbox overlay
      document.querySelectorAll('.cursor-dot, .cursor-ring').forEach(el => {
        el.style.zIndex = '10001'
      })
    } else {
      document.body.style.overflow = ''
      document.querySelectorAll('.cursor-dot, .cursor-ring').forEach(el => {
        el.style.zIndex = ''
      })
    }
    return () => {
      document.body.style.overflow = ''
      document.querySelectorAll('.cursor-dot, .cursor-ring').forEach(el => {
        el.style.zIndex = ''
      })
    }
  }, [isOpen])

  // Also swap cursor color to light while lightbox is open (dark bg)
  useEffect(() => {
    if (!isOpen) return
    const style = document.createElement('style')
    style.id = 'lightbox-cursor-override'
    style.textContent = `
      .cursor-dot  { background: rgba(250,249,246,0.9) !important; }
      .cursor-ring { border-color: rgba(250,249,246,0.7) !important; }
      body.cursor-hover .cursor-dot  { background: #C5A059 !important; }
      body.cursor-hover .cursor-ring { border-color: #C5A059 !important; }
    `
    document.head.appendChild(style)
    return () => document.getElementById('lightbox-cursor-override')?.remove()
  }, [isOpen])

  const handleOverlayClick = useCallback((e) => {
    if (e.target === overlayRef.current) onClose()
  }, [onClose])

  if (!isOpen) return null

  const current = images[activeIndex]
  if (!current) return null

  const hasPrev = activeIndex > 0
  const hasNext = activeIndex < images.length - 1

  const THUMB_SIZE = 64
  const THUMB_GAP  = 8
  const STRIP_PAD  = 16
  const STRIP_H    = THUMB_SIZE + STRIP_PAD * 2   // 96px total strip height

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(8, 8, 8, 0.97)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        animation: 'lightboxFadeIn 0.25s ease',
        cursor: 'none', // honour custom cursor
      }}
    >
      {/* ── Top bar: counter + close ───────────────────────────────── */}
      <div style={{
        width: '100%',
        height: '56px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderBottom: '0.5px solid rgba(255,255,255,0.07)',
      }}>
        {/* Counter */}
        <span style={{
          fontFamily: 'Manrope, sans-serif',
          fontSize: '11px',
          letterSpacing: '0.18em',
          fontWeight: 600,
          textTransform: 'uppercase',
          color: 'rgba(250,249,246,0.40)',
        }}>
          {activeIndex + 1} / {images.length}
        </span>

        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close lightbox"
          style={{
            position: 'absolute',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '36px',
            height: '36px',
            background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.14)',
            borderRadius: '50%',
            color: 'rgba(250,249,246,0.75)',
            fontSize: '16px',
            cursor: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s, color 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
            e.currentTarget.style.color = '#FAF9F6'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
            e.currentTarget.style.color = 'rgba(250,249,246,0.75)'
          }}
        >
          ✕
        </button>
      </div>

      {/* ── Main viewport: image + side arrows ────────────────────── */}
      <div
        style={{
          flex: 1,
          width: '100%',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // leave room above for topbar and below for thumbnail strip + its gap
          padding: '24px 80px',
          overflow: 'hidden',
          minHeight: 0,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Prev arrow */}
        {hasPrev && (
          <button
            onClick={onPrev}
            aria-label="Previous image"
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '44px',
              height: '44px',
              background: 'rgba(255,255,255,0.07)',
              border: '0.5px solid rgba(255,255,255,0.14)',
              borderRadius: '50%',
              color: 'rgba(250,249,246,0.80)',
              fontSize: '22px',
              cursor: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              zIndex: 2,
              lineHeight: 1,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
          >
            ‹
          </button>
        )}

        {/* Image / Video */}
        {(current.isVideo || current.src.includes('.mp4') || current.src.includes('.webm') || current.src.includes('profile_id=')) ? (
          <video
            key={activeIndex}
            src={current.src}
            controls
            autoPlay
            loop
            playsInline
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '2px',
              boxShadow: '0 32px 64px -16px rgba(0,0,0,0.85)',
              animation: 'lightboxImgIn 0.28s cubic-bezier(0.22,1,0.36,1)',
              display: 'block',
            }}
          />
        ) : (
          <img
            key={activeIndex}
            src={current.src}
            alt={current.alt || ''}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '2px',
              boxShadow: '0 32px 64px -16px rgba(0,0,0,0.85)',
              animation: 'lightboxImgIn 0.28s cubic-bezier(0.22,1,0.36,1)',
              display: 'block',
            }}
          />
        )}

        {/* Next arrow */}
        {hasNext && (
          <button
            onClick={onNext}
            aria-label="Next image"
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '44px',
              height: '44px',
              background: 'rgba(255,255,255,0.07)',
              border: '0.5px solid rgba(255,255,255,0.14)',
              borderRadius: '50%',
              color: 'rgba(250,249,246,0.80)',
              fontSize: '22px',
              cursor: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              zIndex: 2,
              lineHeight: 1,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
          >
            ›
          </button>
        )}
      </div>

      {/* ── Label ─────────────────────────────────────────────────── */}
      {current.label && (
        <div style={{
          flexShrink: 0,
          paddingBottom: '12px',
          textAlign: 'center',
        }}>
          <span style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: '10px',
            letterSpacing: '0.18em',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: 'rgba(250,249,246,0.38)',
          }}>
            {current.label}
          </span>
        </div>
      )}

      {/* ── Thumbnail strip ────────────────────────────────────────── */}
      {images.length > 1 && (
        <div style={{
          flexShrink: 0,
          width: '100%',
          borderTop: '0.5px solid rgba(255,255,255,0.07)',
          background: 'rgba(0,0,0,0.30)',
          padding: `${STRIP_PAD}px 24px`,
          display: 'flex',
          justifyContent: 'center',
        }}>
          <div style={{
            display: 'flex',
            gap: `${THUMB_GAP}px`,
            overflowX: 'auto',
            maxWidth: '100%',
            /* hide scrollbar but keep functionality */
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingBottom: '2px', // prevent clipping of active border
          }}>
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => window.dispatchEvent(new CustomEvent('lightbox:goto', { detail: i }))}
                aria-label={`View image ${i + 1}`}
                style={{
                  width: `${THUMB_SIZE}px`,
                  height: `${THUMB_SIZE}px`,
                  flexShrink: 0,
                  padding: 0,
                  border: i === activeIndex
                    ? '2px solid rgba(197,160,89,0.9)'     // gold for active
                    : '1.5px solid rgba(255,255,255,0.10)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  cursor: 'none',
                  opacity: i === activeIndex ? 1 : 0.45,
                  transform: i === activeIndex ? 'scale(1.06)' : 'scale(1)',
                  transition: 'opacity 0.2s, border-color 0.2s, transform 0.2s',
                  background: 'transparent',
                  outline: 'none',
                }}
                onMouseEnter={e => { if (i !== activeIndex) e.currentTarget.style.opacity = '0.75' }}
                onMouseLeave={e => { if (i !== activeIndex) e.currentTarget.style.opacity = '0.45' }}
              >
                {img.thumb ? (
                  <img
                    src={img.thumb}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (img.isVideo || img.src.includes('.mp4') || img.src.includes('.webm') || img.src.includes('profile_id=')) ? (
                  <video
                    src={img.src}
                    muted
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <img
                    src={img.src}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes lightboxFadeIn {
          from { opacity: 0 }
          to   { opacity: 1 }
        }
        @keyframes lightboxImgIn {
          from { opacity: 0; transform: scale(0.97) }
          to   { opacity: 1; transform: scale(1) }
        }
        /* hide scrollbar in webkit */
        .lightbox-thumbstrip::-webkit-scrollbar { display: none; }
      `}</style>
    </div>,
    document.body
  )
}

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ParallaxImage } from './ParallaxImage'

gsap.registerPlugin(ScrollTrigger)

/**
 * OrbitGallery
 * ─────────────────────────────────────────────────────────────────────────
 * An asymmetric, freeform editorial gallery layout for Creative Images.
 * NOT the stepped 3-column layout of ScatteredGallery — instead images
 * are arranged in alternating "orbit" rows with varied sizes and offsets
 * that create a dynamic, magazine-editorial feel.
 *
 * Row patterns (cycle repeats for every 5 images):
 *
 *   Row A  [big | small]        — 60% / 38% split, small floats lower
 *   Row B  [solo centered wide] — single image spanning ~70%, centred
 *   Row C  [small | big]        — mirror of A, big on right, small floats higher
 *   Row D  [trio]               — 3 equal ~30% images at staggered y offsets
 *   Row E  [big | small | small]— one dominant, two stacked on right
 *
 * Each row also has a slight horizontal scroll-driven drift so the layout
 * feels alive even when the user isn't hovering.
 *
 * Props:
 *   images    – array of { src, alt, label, width?, height? }
 *               Pass width+height for exact ratio; omit for square default.
 *   className – extra wrapper classes
 */
export function OrbitGallery({ images = [], className = '', onImageClick }) {
  const containerRef = useRef(null)

  // Scroll-driven horizontal drift on alternate rows
  useEffect(() => {
    if (!containerRef.current) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.orbit-row', containerRef.current).forEach((row, i) => {
        const dir = i % 2 === 0 ? -18 : 18
        gsap.fromTo(
          row,
          { x: 0 },
          {
            x: dir,
            ease: 'none',
            scrollTrigger: {
              trigger: row,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.8,
            },
          }
        )
      })
    }, containerRef)
    return () => ctx.revert()
  }, [images])

  // Split images into groups of 5 for the row pattern cycle
  const rows = []
  let i = 0
  let rowIndex = 0
  while (i < images.length) {
    const pattern = rowIndex % 5
    let take = 0
    if (pattern === 0) take = 2      // Row A: big | small
    else if (pattern === 1) take = 1 // Row B: solo wide
    else if (pattern === 2) take = 2 // Row C: small | big
    else if (pattern === 3) take = 3 // Row D: trio
    else if (pattern === 4) take = 2 // Row E: big | small+small (treated as 2+)
    rows.push({ pattern, imgs: images.slice(i, i + Math.min(take, images.length - i)), startIdx: i })
    i += take
    rowIndex++
  }

  return (
    <section
      ref={containerRef}
      className={`flex flex-col gap-10 md:gap-16 ${className}`}
    >
      {rows.map((row, ri) => (
        <OrbitRow key={ri} row={row} rowIndex={ri} onImageClick={onImageClick} />
      ))}
    </section>
  )
}

/* ── Individual row renderer ────────────────────────────────────────────── */
function OrbitRow({ row, rowIndex, onImageClick }) {
  const { pattern, imgs, startIdx = 0 } = row
  if (!imgs.length) return null

  const delay = (idx) => idx * 0.12

  const wrap = (img, idx, extra = {}) => (
    <ParallaxImage
      {...img}
      revealDelay={delay(idx)}
      onClick={onImageClick ? () => onImageClick(startIdx + idx) : undefined}
      {...extra}
    />
  )

  /* ── Row A: big left (60%) | small right (38%), small drops 80px ──── */
  if (pattern === 0) {
    const [a, b] = imgs
    return (
      <div className="orbit-row flex items-start justify-center gap-4 md:gap-8">
        <div className="w-[45%] flex-shrink-0">
          {a && wrap(a, 0, { parallaxAmount: 8 })}
        </div>
        <div className="w-[30%]" style={{ marginTop: 'clamp(6px, 1.5vw, 14px)' }}>
          {b && wrap(b, 1, { parallaxAmount: 12 })}
        </div>
      </div>
    )
  }

  /* ── Row B: single image, centred, 68% width ─────────────────────── */
  if (pattern === 1) {
    const [a] = imgs
    return (
      <div className="orbit-row flex justify-center">
        <div className="w-[65%] md:w-[48%]">
          {a && wrap(a, 0, { parallaxAmount: 7, scrubSpeed: 1.2 })}
        </div>
      </div>
    )
  }

  /* ── Row C: small left (38%), floats UP 60px | big right (60%) ────── */
  if (pattern === 2) {
    const [a, b] = imgs
    return (
      <div className="orbit-row flex items-start justify-center gap-4 md:gap-8">
        <div className="w-[30%]" style={{ marginTop: 'clamp(-8px, -0.8vw, -3px)' }}>
          {a && wrap(a, 0, { parallaxAmount: 12 })}
        </div>
        <div className="w-[45%] flex-shrink-0">
          {b && wrap(b, 1, { parallaxAmount: 8 })}
        </div>
      </div>
    )
  }

  /* ── Row D: trio — 3 equal columns, staggered y offsets ──────────── */
  if (pattern === 3) {
    const [a, b, c] = imgs
    const offsets = [0, 30, 12] // y-offset per column in px
    const items   = [a, b, c]
    return (
      <>
        <style>{`
          @media (max-width: 767px) {
            .orbit-trio-col-0 { margin-top: 0px !important; }
            .orbit-trio-col-1 { margin-top: 12px !important; }
            .orbit-trio-col-2 { margin-top: 6px !important; }
          }
        `}</style>
        <div className="orbit-row grid grid-cols-3 gap-3 md:gap-7">
          {items.map((img, idx) => (
            <div 
              key={idx} 
              className={`orbit-trio-col-${idx}`}
              style={{ marginTop: `${offsets[idx]}px` }}
            >
              {img && wrap(img, idx, { parallaxAmount: 10 })}
            </div>
          ))}
        </div>
      </>
    )
  }

  /* ── Row E: big left (55%) | two stacked right ───────────────────── */
  if (pattern === 4) {
    const [a, b] = imgs
    return (
      <div className="orbit-row flex items-start justify-center gap-4 md:gap-8">
        <div className="w-[40%] flex-shrink-0">
          {a && wrap(a, 0, { parallaxAmount: 9 })}
        </div>
        <div className="w-[28%] flex flex-col gap-4 md:gap-8" style={{ marginTop: 'clamp(6px, 2vw, 16px)' }}>
          {b && wrap(b, 1, { parallaxAmount: 11 })}
        </div>
      </div>
    )
  }

  return null
}

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ParallaxImage } from './ParallaxImage'

gsap.registerPlugin(ScrollTrigger)

/**
 * ScatteredGallery
 * ─────────────────────────────────────────────────────────────────────────
 * Three-column STEPPED layout for On-Body Visualization.
 * Each column starts at a different vertical offset:
 *   col 0 → 0px    (flush)
 *   col 1 → 120px  (mid drop)
 *   col 2 → 220px  (lowest)
 *
 * Each column also drifts at a different speed on scroll (column parallax),
 * and every card uses ParallaxImage for inner-image pan + hover + reveal.
 *
 * Images can be any ratio — pass width + height on each item for exact ratio,
 * or omit for the default portrait (3/4).
 *
 * Props:
 *   images    – array of { src, alt, label, width?, height? }
 *   className – extra wrapper classes
 */
export function ScatteredGallery({ images = [], className = '', onImageClick }) {
  const containerRef = useRef(null)

  // Distribute images across 3 columns
  const columns = [[], [], []]
  images.forEach((img, i) => columns[i % 3].push({ ...img, originalIndex: i }))

  // Column scroll-parallax — each col drifts at a different speed
  useEffect(() => {
    if (!containerRef.current) return
    const speeds = [-60, 40, -90]
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.scattered-col', containerRef.current).forEach((col, i) => {
        gsap.fromTo(
          col,
          { y: 0 },
          {
            y: speeds[i],
            ease: 'none',
            scrollTrigger: {
              trigger: containerRef.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.4,
            },
          }
        )
      })
    }, containerRef)
    return () => ctx.revert()
  }, [images])

  const colOffsets = [0, 120, 220]

  return (
    <section
      ref={containerRef}
      className={`relative grid grid-cols-3 gap-x-6 md:gap-x-10 ${className}`}
      style={{ paddingBottom: '260px' }}
    >
      {columns.map((colImages, colIdx) => (
        <div
          key={colIdx}
          className="scattered-col flex flex-col gap-6 md:gap-10"
          style={{ marginTop: `${colOffsets[colIdx]}px` }}
        >
          {colImages.map((img, rowIdx) => (
            <ParallaxImage
              key={rowIdx}
              src={img.src}
              alt={img.alt}
              label={img.label}
              width={img.width}
              height={img.height}
              aspectRatio={img.aspectRatio ?? '3/4'}
              grayscale={img.grayscale}
              parallaxAmount={8}
              scrubSpeed={0.9}
              revealDelay={rowIdx * 0.08}
              onClick={onImageClick ? () => onImageClick(img.originalIndex) : undefined}
            />
          ))}
        </div>
      ))}
    </section>
  )
}

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ParallaxImage } from './ParallaxImage'

gsap.registerPlugin(ScrollTrigger)

/**
 * StillImagesGrid
 * ─────────────────────────────────────────────────────────────────────────
 * A dedicated, completely static 4-column viewport layout tailored for still images.
 * Keeps structural grid columns uniformly aligned without any vertical scroll drift.
 *
 * Each column systematically maps to its required perspective sequence:
 * Column 1 (Index 0) -> Front View
 * Column 2 (Index 1) -> Upper View
 * Column 3 (Index 2) -> Side View
 * Column 4 (Index 3) -> Cross View
 *
 * Props:
 * images    – Array of exactly 40 curated non-ring items: { src, alt, width?, height? }
 * className – Custom positioning utility classes
 */
export function StillImagesGrid({ images = [], className = '' }) {
  const containerRef = useRef(null)

  // Distribute exactly 40 items across 4 parallel tracks to preserve perspective rows
  const columns = [[], [], [], []]
  images.forEach((img, i) => {
    columns[i % 4].push(img)
  })

  // Explicit array maps for perspective labels across the 4 layout columns
  const perspectiveLabels = [
    { jp: '正面図', en: 'Front View' },
    { jp: '上面図', en: 'Upper View' },
    { jp: '側面図', en: 'Side View' },
    { jp: '斜視図', en: 'Cross View' }
  ]

  return (
    <section
      ref={containerRef}
      className={`relative grid grid-cols-4 gap-x-6 gap-y-10 md:gap-x-10 max-w-[1200px] mx-auto w-full px-6 pt-8 items-start ${className}`}
    >
      {columns.map((colImages, colIdx) => (
        <div
          key={colIdx}
          className="still-grid-col flex flex-col gap-10 w-full"
          style={{ marginTop: '0px' }} // Keeps all columns uniformly aligned at the top
        >
          {colImages.map((img, rowIdx) => {
            // Explicit tracking index matching back to the main array pool
            const globalIdx = images.indexOf(img)
            const currentPerspective = perspectiveLabels[colIdx]

            return (
              <div key={`still-card-${globalIdx}`} className="w-full flex flex-col">
                <ParallaxImage
                  src={img.src}
                  alt={`${img.alt || 'Luxury jewelry still'} - ${currentPerspective.en}`}
                  width={img.width}
                  height={img.height}
                  aspectRatio={img.aspectRatio ?? '1/1'} // Default square aspect ratios for fine details
                  grayscale={img.grayscale ?? false}
                  parallaxAmount={0} // Disables internal image parallax movement entirely
                  scrubSpeed={0}     // Removes GSAP tracking lag configurations
                  revealDelay={rowIdx * 0.05} // Smoothly staggers fading entrances down the grid rows
                />
                
                {/* Clean typographical metadata panel */}
                <p className="font-[Poppins] text-[10px] md:text-[11px] text-[#747878] tracking-[0.1em] uppercase mt-[10px] m-0 font-light">
                  {currentPerspective.jp} / {currentPerspective.en}
                </p>
              </div>
            )
          })}
        </div>
      ))}
    </section>
  )
}
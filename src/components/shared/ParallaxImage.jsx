import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * ParallaxImage
 * ─────────────────────────────────────────────────────────────────────────
 * A ratio-aware image/video card with three motion layers:
 *
 *   1. Scroll parallax  — inner media pans ±parallaxAmount% on scroll
 *   2. Hover zoom       — media scales to hoverScale on mouse enter
 *   3. Reveal           — card fades + clips up on first scroll entry
 *
 * Ratio handling:
 *   Pass `width` and `height` (the actual pixel dimensions of your media,
 *   e.g. width={2000} height={2000} for a square or width={1200} height={1500}
 *   for a portrait). The card will render with that exact aspect ratio.
 *   If you omit both, it falls back to the natural media dimensions detected
 *   at runtime, and then to `aspectRatio` (CSS string like "3/4").
 *
 * Props:
 *   src             – image/video URL / public path
 *   alt             – accessible description
 *   label           – hover caption (optional)
 *   width           – natural width  (for ratio; optional)
 *   height          – natural height (for ratio; optional)
 *   aspectRatio     – fallback CSS aspect-ratio string, default "1/1"
 *   parallaxAmount  – how many % the inner media travels on scroll (default 10)
 *   hoverScale      – scale factor on hover (default 1.07)
 *   scrubSpeed      – GSAP scrub lag (default 1.0)
 *   className       – extra classes on the outer wrapper
 *   grayscale       – start grayscale, reveal colour on hover
 *   revealDelay     – stagger delay in seconds for the entrance animation
 */
export function ParallaxImage({
  src,
  alt = '',
  label,
  width,
  height,
  aspectRatio: aspectRatioProp = '1/1',
  parallaxAmount = 10,
  hoverScale = 1.07,
  scrubSpeed = 1.0,
  className = '',
  grayscale = false,
  revealDelay = 0,
  onClick,
  isVideo = false,
}) {
  const wrapRef = useRef(null)
  const imgRef  = useRef(null)
  const overlayRef = useRef(null)
  const labelRef   = useRef(null)
  const [detectedRatio, setDetectedRatio] = useState(null)

  const isVid = isVideo || (src && (src.includes('.mp4') || src.includes('.webm') || src.includes('profile_id=')))

  // Dynamically resolve ratio from natural media metadata at runtime if width/height are not provided
  useEffect(() => {
    if (width && height) return
    if (!src) return

    if (isVid) {
      const video = document.createElement('video')
      video.src = src
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        if (video.videoWidth && video.videoHeight) {
          setDetectedRatio(`${video.videoWidth}/${video.videoHeight}`)
        }
      }
    } else {
      const img = new Image()
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          setDetectedRatio(`${img.naturalWidth}/${img.naturalHeight}`)
        }
      }
      img.src = src
    }
  }, [src, width, height, isVid])

  // Compute ratio string: explicit width/height takes precedence, then dynamic detection, then fallback prop
  const computedRatio =
    width && height ? `${width}/${height}` : (detectedRatio || aspectRatioProp)

  // Extra image height needed so parallax pan never shows a gap
  const oversize = `${100 + parallaxAmount * 2}%`

  // ── Scroll-reveal entrance ─────────────────────────────────────────
  useEffect(() => {
    if (!wrapRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        wrapRef.current,
        { opacity: 0, y: 48, clipPath: 'inset(6% 0% 0% 0%)' },
        {
          opacity: 1,
          y: 0,
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1.05,
          delay: revealDelay,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: wrapRef.current,
            start: 'top 91%',
            once: true,
          },
        }
      )
    }, wrapRef)
    return () => ctx.revert()
  }, [revealDelay])

  // ── Inner-image/video scroll parallax ──────────────────────────────
  useEffect(() => {
    if (!imgRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        imgRef.current,
        { y: `-${parallaxAmount}%` },
        {
          y: `${parallaxAmount}%`,
          ease: 'none',
          scrollTrigger: {
            trigger: wrapRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: scrubSpeed,
          },
        }
      )
    }, wrapRef)
    return () => ctx.revert()
  }, [parallaxAmount, scrubSpeed])

  // ── Hover handlers ─────────────────────────────────────────────────
  const onEnter = () => {
    gsap.to(imgRef.current, {
      scale: hoverScale,
      duration: 0.85,
      ease: 'power2.out',
      filter: grayscale ? 'grayscale(0%)' : undefined,
    })
    if (overlayRef.current)
      gsap.to(overlayRef.current, { opacity: 1, duration: 0.35, ease: 'power2.out' })
    if (labelRef.current)
      gsap.to(labelRef.current, { y: 0, opacity: 1, duration: 0.42, ease: 'power3.out' })
  }

  const onLeave = () => {
    gsap.to(imgRef.current, {
      scale: 1,
      duration: 1,
      ease: 'power2.inOut',
      filter: grayscale ? 'grayscale(100%)' : undefined,
    })
    if (overlayRef.current)
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.35, ease: 'power2.in' })
    if (labelRef.current)
      gsap.to(labelRef.current, { y: 14, opacity: 0, duration: 0.3, ease: 'power2.in' })
  }


  return (
    <div
      ref={wrapRef}
      className={`parallax-image-card relative bg-[#EDE8DE] gallery-shadow overflow-hidden ${onClick ? 'cursor-pointer' : 'cursor-default'} ${className}`}
      style={{ aspectRatio: computedRatio, opacity: 0 }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      {/* Inner clip — lets image/video oversize without affecting outer shadow */}
      <div className="absolute inset-0 overflow-hidden">
        {isVid ? (
          <video
            ref={imgRef}
            src={src}
            autoPlay
            loop
            muted
            playsInline
            className="absolute left-0 w-full object-cover"
            style={{
              height: oversize,
              top: `-${parallaxAmount}%`,
              transformOrigin: 'center center',
              filter: grayscale ? 'grayscale(100%)' : undefined,
            }}
          />
        ) : (
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            className="absolute left-0 w-full object-cover"
            style={{
              height: oversize,
              top: `-${parallaxAmount}%`,
              transformOrigin: 'center center',
              filter: grayscale ? 'grayscale(100%)' : undefined,
            }}
            loading="lazy"
          />
        )}
      </div>

      {/* Gradient overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0,
          background:
            'linear-gradient(to top, rgba(18,18,18,0.70) 0%, rgba(18,18,18,0.08) 55%, transparent 100%)',
        }}
      />

      {/* Label */}
      {label && (
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
          <span
            ref={labelRef}
            className="font-[Manrope] text-[11px] md:text-[12px] tracking-[0.18em] font-semibold uppercase text-[#FAF9F6]"
            style={{ display: 'block', opacity: 0, transform: 'translateY(14px)' }}
          >
            {label}
          </span>
        </div>
      )}

      {/* Expand icon — shown only when onClick is wired */}
      {onClick && (
        <div
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center pointer-events-none z-10"
          style={{
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(6px)',
            opacity: 0,
            transition: 'opacity 0.3s',
          }}
          ref={el => {
            if (!el) return
            const parent = el.closest('.parallax-image-card')
            if (!parent) return
            parent.addEventListener('mouseenter', () => { el.style.opacity = '1' })
            parent.addEventListener('mouseleave', () => { el.style.opacity = '0' })
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
          </svg>
        </div>
      )}
    </div>
  )
}

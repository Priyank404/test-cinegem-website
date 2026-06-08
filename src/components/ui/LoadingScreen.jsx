import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { gsap } from 'gsap'

/**
 * Full-screen intro loader.
 * Animates a progress line and fades out on complete.
 *
 * @param {{ onComplete: () => void }} props
 */
export function LoadingScreen({ onComplete }) {
  const lineRef = useRef(null)

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete,
      defaults: { ease: 'power3.out' },
    })

    tl.to(lineRef.current, {
      scaleX:   1,
      duration: 1.6,
      ease:     'power2.inOut',
    }).to(
      lineRef.current,
      { opacity: 0, duration: 0.3 },
      '-=0.1'
    )
  }, [onComplete])

  return (
    <motion.div
      key="loader"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-charcoal-deep"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Logo */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="font-display text-2xl tracking-[-0.04em] text-cream-soft mb-10"
      >
        CINEGEM
      </motion.p>

      {/* Progress bar */}
      <div className="w-48 h-px bg-cream-soft/10 overflow-hidden">
        <div ref={lineRef} className="loader-line h-full w-full" />
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="mt-5 font-label text-label-caps text-cream-soft/30 tracking-[0.25em]"
      >
        The Sound of Craft
      </motion.p>
    </motion.div>
  )
}

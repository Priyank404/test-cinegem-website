import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Initialises Lenis smooth scroll and wires it to GSAP's ScrollTrigger.
 * Returns the Lenis instance so callers can scroll programmatically if needed.
 */
export function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      duration:   1.2,
      easing:     (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    // Scroll to the top immediately on initialization
    lenis.scrollTo(0, { immediate: true })

    // Sync Lenis RAF with GSAP's ticker for accurate ScrollTrigger updates
    const onRaf = (time) => {
      lenis.raf(time)
      ScrollTrigger.update()
    }

    gsap.ticker.add(onRaf)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(onRaf)
      lenis.destroy()
    }
  }, [])
}

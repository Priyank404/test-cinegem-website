import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Attaches a GSAP ScrollTrigger fade-up reveal to every `.reveal` child
 * within the returned ref element.
 *
 * @param {{ selector?: string, stagger?: number }} options
 * @returns {React.RefObject}
 */
export function useScrollReveal({ selector = '.reveal', stagger = 0.1 } = {}) {
  const containerRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray(selector, containerRef.current).forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y:       0,
            duration:      0.9,
            ease:          'power3.out',
            scrollTrigger: {
              trigger: el,
              start:   'top 88%',
              once:    true,
            },
          }
        )
      })
    }, containerRef)

    return () => ctx.revert()
  }, [selector, stagger])

  return containerRef
}

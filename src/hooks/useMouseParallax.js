import { useEffect, useRef } from 'react'

/**
 * Tracks normalised mouse position [-1..1] in a ref (no re-renders).
 * The ref is safe to read inside a requestAnimationFrame loop.
 *
 * @returns {{ current: { x: number, y: number } }}
 */
export function useMouseParallax() {
  const mouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouse.current = {
        x: (e.clientX / window.innerWidth)  * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      }
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return mouse
}

import { useEffect, useRef } from 'react'

/**
 * Drives a two-element custom cursor (dot + ring) with RAF-based smoothing.
 * Adds `cursor-hover` class to `<body>` when hovering interactive elements.
 *
 * @returns {{ dotRef: React.RefObject, ringRef: React.RefObject }}
 */
export function useCursor() {
  const dotRef  = useRef(null)
  const ringRef = useRef(null)
  const pos     = useRef({ x: -100, y: -100 })
  const ring    = useRef({ x: -100, y: -100 })

  useEffect(() => {
    const dot    = dotRef.current
    const ringEl = ringRef.current
    if (!dot || !ringEl) return

    let rafId

    const onMouseMove = (e) => {
      pos.current = { x: e.clientX, y: e.clientY }
    }

    const onEnter = () => document.body.classList.add('cursor-hover')
    const onLeave = () => document.body.classList.remove('cursor-hover')

    const interactiveSelector =
      'a, button, [role="button"], [tabindex]:not([tabindex="-1"]), label, select, textarea, input'

    // Delegate hover detection to the document
    const onOver = (e) => {
      if (e.target.closest(interactiveSelector)) onEnter()
    }
    const onOut = (e) => {
      if (e.target.closest(interactiveSelector)) onLeave()
    }

    const tick = () => {
      dot.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px) translate(-50%, -50%)`

      ring.current = {
        x: ring.current.x + (pos.current.x - ring.current.x) * 0.12,
        y: ring.current.y + (pos.current.y - ring.current.y) * 0.12,
      }
      ringEl.style.transform = `translate(${ring.current.x}px, ${ring.current.y}px) translate(-50%, -50%)`

      rafId = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout',  onOut)
    rafId = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout',  onOut)
      cancelAnimationFrame(rafId)
      document.body.classList.remove('cursor-hover')
    }
  }, [])

  return { dotRef, ringRef }
}

import { useCursor } from '@/hooks/useCursor'

/**
 * Renders the two-part custom cursor overlay.
 * Hidden on touch devices via CSS (cursor: none is only set on non-touch).
 */
export function CustomCursor() {
  const { dotRef, ringRef } = useCursor()

  return (
    <>
      <div ref={dotRef}  className="cursor-dot"  aria-hidden="true" />
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
    </>
  )
}

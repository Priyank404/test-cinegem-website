import { useRef } from 'react'

/**
 * useCursor — no-op stub for native OS cursor.
 * Returns dummy refs to preserve backwards compatibility without any listeners or RAF overhead.
 */
export function useCursor() {
  const dotRef  = useRef(null)
  const ringRef = useRef(null)
  return { dotRef, ringRef }
}

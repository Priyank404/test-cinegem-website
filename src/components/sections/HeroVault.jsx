import { useRef, useEffect, useState, useCallback } from 'react'
import { motion }      from 'framer-motion'
import { Link }        from 'react-router-dom'

import { VaultCard }    from '@/components/sections/VaultCard'
import VaultRoom3D      from '@/components/three/VaultRoom3D'
import { useMouseParallax } from '@/hooks/useMouseParallax'
import { VAULT_PANELS } from '@/constants'

/**
 * Resolve which vault card is under the pointer.
 * Prefer the topmost painted card at the pixel (elementsFromPoint), then fall back
 * to nearest-center among overlapping rects so side cards are not blocked by on-body.
 */
function pickPanelAtPoint(clientX, clientY, cardRefs) {
  if (typeof document.elementsFromPoint === 'function') {
    const seen = new Set()
    for (const node of document.elementsFromPoint(clientX, clientY)) {
      const card = node.closest?.('[data-vault-card]')
      if (!card || seen.has(card)) continue
      seen.add(card)

      const panel = VAULT_PANELS.find((p) => cardRefs.current[p.id] === card)
      if (panel?.isService) return panel
    }
  }

  const hits = []
  for (const panel of VAULT_PANELS) {
    const el = cardRefs.current[panel.id]
    if (!el) continue

    const rect = el.getBoundingClientRect()
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      continue
    }

    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    hits.push({
      panel,
      dist: Math.hypot(clientX - cx, clientY - cy),
      z: panel.position?.z ?? 0,
    })
  }

  if (!hits.length) return null
  // Among overlaps, prefer the card the user is aiming at (nearest center),
  // not the front card whose 2D bbox is largest.
  hits.sort((a, b) => a.dist - b.dist || b.z - a.z)
  return hits[0].panel
}

/* ── Scroll cue at bottom ───────────────────────────────────────────────── */
function ScrollCue() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2.6, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none z-20"
      aria-hidden="true"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"
        className="text-charcoal-deep/45" aria-hidden="true">
        <ellipse cx="12" cy="15.5" rx="7.25" ry="5.25" />
        <path d="M8.25 10.75c0-2.35 1.65-4.25 3.75-4.25s3.75 1.9 3.75 4.25" />
        <circle cx="12" cy="9.25" r="1.35" fill="currentColor" stroke="none" />
      </svg>
      <span className="font-label text-[9px] tracking-[0.28em] text-charcoal-deep/50 uppercase">
        Select a service to explore
      </span>
      <div className="w-px h-8 bg-gradient-to-b from-charcoal-deep/25 to-transparent animate-float-subtle" />
    </motion.div>
  )
}

/* ── Main HeroVault ─────────────────────────────────────────────────────── */
export function HeroVault({ onNavigate }) {
  const mouseRef = useMouseParallax()
  const sceneRef = useRef(null)
  const cardRefs = useRef({})
  const [activeCardId, setActiveCardId] = useState(null)
  const smoothPos = useRef({ x: 0, y: 0 })



  const updateActiveCard = useCallback((clientX, clientY) => {
    const panel = pickPanelAtPoint(clientX, clientY, cardRefs)
    setActiveCardId(panel?.id ?? null)
  }, [])

  const handleSceneMouseMove = useCallback((e) => {
    updateActiveCard(e.clientX, e.clientY)
  }, [updateActiveCard])

  const handleSceneMouseLeave = useCallback(() => {
    setActiveCardId(null)
  }, [])

  const handleSceneClick = useCallback((e) => {
    const panel = pickPanelAtPoint(e.clientX, e.clientY, cardRefs)
    if (panel?.isService && panel.route && onNavigate) {
      onNavigate(panel.route)
    }
  }, [onNavigate])

  // Global scene movement — smoothly lerps the entire container
  // Cartier uses a subtle global tilt + shift with mouse movement
  useEffect(() => {
    let animId
    const SCENE_SHIFT_X = 45    // max px the scene moves horizontally
    const SCENE_SHIFT_Y = 20    // max px the scene moves vertically
    const SCENE_ROT_Y   = 2.5   // max degrees global Y rotation
    const SCENE_ROT_X   = 1.2   // max degrees global X rotation
    const LERP = 0.038

    const animate = () => {
      if (sceneRef.current && mouseRef?.current) {
        const mx = mouseRef.current.x || 0  // -1 to 1
        const my = mouseRef.current.y || 0

        const targetX = mx * SCENE_SHIFT_X
        const targetY = my * SCENE_SHIFT_Y

        smoothPos.current.x += (targetX - smoothPos.current.x) * LERP
        smoothPos.current.y += (targetY - smoothPos.current.y) * LERP

        const rotY = mx * SCENE_ROT_Y
        const rotX = -my * SCENE_ROT_X

        // Global scene: translate + subtle 3D rotate for "looking around the room" feel
        sceneRef.current.style.transform = 
          `translate3d(${smoothPos.current.x}px, ${smoothPos.current.y}px, 0) rotateY(${rotY}deg) rotateX(${rotX}deg)`
      }
      animId = requestAnimationFrame(animate)
    }

    animId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animId)
  }, [mouseRef])

  return (
    <section
      id="vault"
      className="relative w-full h-screen overflow-hidden bg-[#ebe1d5]"
      aria-label="Cinegem Studio — Vault Gallery"
    >
      {/* 3D WebGL Room Background (Renders floor, back/left/right walls forming corners, spotlights, and central pedestal) */}
      <VaultRoom3D mouseRef={mouseRef} />

      




      {/* 3D Perspective container — cards float in the showroom */}
      <div
        className="absolute inset-0 z-10"
        style={{ perspective: '920px', perspectiveOrigin: '50% 48%' }}
      >
        {/* Inner scene — physically moves + rotates with mouse */}
        <div
          ref={sceneRef}
          className="vault-scene-container"
          style={{
            position: 'absolute',
            inset: 0,
            willChange: 'transform',
            transformStyle: 'preserve-3d',
            transformOrigin: '50% 50%',
          }}
          onMouseMove={handleSceneMouseMove}
          onMouseLeave={handleSceneMouseLeave}
          onClick={handleSceneClick}
        >
          {VAULT_PANELS.map((panel, i) => (
            <VaultCard
              key={panel.id}
              id={panel.id}
              ref={(el) => {
                if (el) cardRefs.current[panel.id] = el
                else delete cardRefs.current[panel.id]
              }}
              img={panel.img}
              label={panel.label}
              category={panel.category}
              position={panel.position}
              rotation={panel.rotation}
              size={panel.size}
              index={i}
              isService={panel.isService}
              route={panel.route}
              onNavigate={onNavigate}
              mouseRef={mouseRef}
              depthLayer={panel.depthLayer ?? 2}
              isRaised={activeCardId === panel.id}
            />
          ))}
        </div>
      </div>

      <ScrollCue />
    </section>
  )
}


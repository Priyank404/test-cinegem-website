import { memo, useState, useRef, useEffect, forwardRef, useCallback } from 'react'
import { motion } from 'framer-motion'

const PERSPECTIVE = 920
const REF_Z = -100

/** Counter perspective enlargement so every card reads the same size; depth stays on translateZ. */
function depthCompensationScale(z) {
  return (PERSPECTIVE - REF_Z) / (PERSPECTIVE - z)
}

export const VaultCard = memo(forwardRef(function VaultCard({
  id,
  img,
  label,
  category,
  position = { x: 0, y: 0, z: 0 },
  rotation = { x: 0, y: 0, z: 0 },
  size = { width: 260, height: 188 },
  index = 0,
  isService = false,
  route = null,
  onNavigate,
  mouseRef,
  depthLayer = 2,
  isRaised = false,
}, ref) {
  const [hovered, setHovered] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const cardRef = useRef(null)
  const smoothParallax = useRef({ x: 0, y: 0 })
  const HOVER_Z_BOOST = 22
  const baseDepthScale = depthCompensationScale(position.z ?? 0)

  const floatDuration = 5 + (index % 5) * 0.9
  const floatDelay = index * 0.35

  const setCardRef = (el) => {
    cardRef.current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) ref.current = el
  }

  const zPos = position.z ?? 0
  const isHighlighted = hovered || isRaised
  // Parallax multiplier: closer cards move more with mouse
  const depthParallaxMultiplier = 0.4 + ((zPos + 220) / 400) * 1.4

  useEffect(() => {
    let animId
    const LERP = 0.042

    const updateParallax = () => {
      if (cardRef.current && mouseRef?.current) {
        const mx = mouseRef.current.x || 0
        const my = mouseRef.current.y || 0

        const targetX = mx * 12 * depthParallaxMultiplier
        const targetY = my * 6 * depthParallaxMultiplier

        smoothParallax.current.x += (targetX - smoothParallax.current.x) * LERP
        smoothParallax.current.y += (targetY - smoothParallax.current.y) * LERP

        const zBoost = isHighlighted ? HOVER_Z_BOOST : 0

        cardRef.current.style.transform = `
          translate(-50%, -50%)
          translateZ(${zPos + zBoost}px)
          translate3d(${smoothParallax.current.x}px, ${smoothParallax.current.y}px, 0)
          scale(${baseDepthScale})
          rotateX(${rotation.x}deg)
          rotateY(${rotation.y}deg)
          rotateZ(${rotation.z}deg)
        `
      }
      animId = requestAnimationFrame(updateParallax)
    }

    animId = requestAnimationFrame(updateParallax)
    return () => cancelAnimationFrame(animId)
  }, [mouseRef, zPos, rotation.x, rotation.y, rotation.z, depthParallaxMultiplier, isHighlighted, baseDepthScale])

  const handleCardClick = useCallback((e) => {
    if (!isService || !route || !onNavigate) return
    e.stopPropagation()
    onNavigate(route)
  }, [isService, route, onNavigate])

  // Depth-based opacity
  const baseOpacity = 0.6 + (depthLayer / 4) * 0.4

  const cardVariants = {
    hidden:  { opacity: 0, y: 50 + index * 5, scale: 0.82 },
    visible: {
      opacity: baseOpacity,
      y: 0,
      scale: 1,
      transition: { duration: 1.4, delay: 0.5 + index * 0.12, ease: [0.16, 1, 0.3, 1] },
    },
  }

  // z-index purely by visual depth (zPos) — higher zPos = closer = higher stacking
  // All service cards use the same range; no card inflates above its depth
  const baseZIndex = 10 + Math.round((zPos + 220) / 30)
  const hoverZIndex = 100

  return (
    <motion.div
      ref={setCardRef}
      className="vault-card-wrapper"
      data-vault-card
      data-vault-id={id ?? undefined}
      data-vault-route={route ?? undefined}
      data-vault-service={isService ? 'true' : undefined}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      style={{
        position: 'absolute',
        left: `calc(50% + ${position.x}px)`,
        top: `calc(50% + ${position.y}px)`,
        width: size.width,
        height: size.height,
        transform: `
          translate(-50%, -50%)
          translateZ(${zPos}px)
          scale(${baseDepthScale})
          rotateX(${rotation.x}deg)
          rotateY(${rotation.y}deg)
          rotateZ(${rotation.z}deg)
        `,
        zIndex: isHighlighted ? hoverZIndex : baseZIndex,
        cursor: isService ? 'pointer' : 'default',
        pointerEvents: isService ? 'auto' : 'none',
        // Transition for smooth scale on hover (parallax loop handles transform,
        // but we add a transition on the wrapper for the scale pop)
        transition: 'z-index 0s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleCardClick}
      role={isService ? 'link' : undefined}
      tabIndex={isService ? 0 : undefined}
      onKeyDown={(e) => {
        if (isService && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          handleCardClick(e)
        }
      }}
    >
      {/* Float wrapper — pointer-events none so only outer div catches events */}
      <div
        style={{
          animation: `vaultFloat ${floatDuration}s ease-in-out ${floatDelay}s infinite`,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {/* Card frame */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            padding: '0px',
            background: 'transparent',
            borderRadius: '6px',
            border: 'none',
            boxShadow: isHighlighted
              ? '0 30px 60px -10px rgba(18,18,18,0.12), 0 0 45px 5px rgba(255,255,255,0.65), inset 0 0 12px rgba(255,255,255,0.98), inset 0 0 8px rgba(18,18,18,0.03), 0 0 40px -5px rgba(197,160,89,0.18)'
              : '0 20px 45px -12px rgba(18,18,18,0.06), 0 0 25px 2px rgba(255,255,255,0.40), inset 0 0 10px rgba(255,255,255,0.95), inset 0 0 6px rgba(18,18,18,0.02)',
            transition: 'box-shadow 0.4s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {/* Image */}
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            height: '100%', 
            overflow: 'hidden', 
            borderRadius: '3px',
            background: 'linear-gradient(135deg,#e8e0d4 0%,#d4cbbf 100%)' 
          }}>
            <img
              src={img}
              alt={label || 'Vault gallery image'}
              loading="eager"
              onLoad={() => setImageLoaded(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: imageLoaded ? 1 : 0,
                transform: isHighlighted ? 'scale(1.03)' : 'scale(1.0)',
                transition: 'opacity 0.8s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)',
              }}
            />

            {/* Cinematic glass reflection sheen */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, transparent 30%, rgba(255, 255, 255, 0.15) 45%, rgba(255, 255, 255, 0.35) 50%, rgba(255, 255, 255, 0.15) 55%, transparent 70%)',
              backgroundSize: '250% 250%',
              backgroundPosition: isHighlighted ? '100% 100%' : '0% 0%',
              transition: 'background-position 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
              pointerEvents: 'none',
              zIndex: 3,
            }} />

            {/* Subtle dark overlay for premium high-contrast label display */}
            <div style={{
              position: 'absolute',
              inset: 0,
              opacity: isHighlighted ? 0.35 : 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 100%)',
              transition: 'opacity 0.4s ease',
              zIndex: 4,
            }} />
          </div>

          {/* Label chip — bottom-right glass panel; image tints show through blur */}
          {label && isService && (
            <div
              className="vault-card__label"
              style={{
                opacity: isHighlighted ? 1 : 0.88,
                transform: `translateY(${isHighlighted ? '0px' : '2px'})`,
                zIndex: 5,
              }}
            >
              <span className="vault-card__label-text">
                {label.toUpperCase()}
              </span>
            </div>
          )}

          {/* Category — slides in from top on hover */}
          {category && isService && (
            <div style={{
              position: 'absolute',
              top: '18px',
              left: '18px',
              fontFamily: "'Poppins', sans-serif",
              fontSize: '8px',
              fontWeight: 300,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.9)',
              opacity: isHighlighted ? 1 : 0,
              transform: `translateY(${isHighlighted ? '0px' : '-6px'})`,
              transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1) 0.05s',
              textShadow: '0 1px 6px rgba(0,0,0,0.5)',
              zIndex: 5,
            }}>
              {category}
            </div>
          )}

          {/* Gold accent line on hover — bottom edge */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: '10%',
            right: '10%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, rgba(197,160,89,0.8), transparent)',
            opacity: isHighlighted ? 1 : 0,
            transform: `scaleX(${isHighlighted ? 1 : 0.3})`,
            transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
            zIndex: 5,
          }} />
        </div>

        {/* Gold glow behind card on hover */}
        <div style={{
          position: 'absolute',
          inset: '-25%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(197,160,89,0.12) 0%, transparent 70%)',
          opacity: isHighlighted ? 1 : 0,
          transition: 'opacity 0.5s ease',
          pointerEvents: 'none',
          zIndex: -1,
        }} />
      </div>
    </motion.div>
  )
}))

VaultCard.displayName = 'VaultCard'

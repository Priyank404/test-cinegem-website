import { useRef, useEffect } from 'react'

/**
 * 3D vault — stacked curved bands with gaps (film-roll slices),
 * feathered edges, side openings. Cartier cyclorama reference.
 */

/* Each band: [topY at x=0, topY at x=50, topY at x=100, botY at x=0, botY at x=50, botY at x=100] */
const VAULT_BANDS = [
  { z: -170, opacity: 0.18, tone: 'dim',    curve: [18, 26, 18, 28, 32, 28] },
  { z: -130, opacity: 0.32, tone: 'mid',    curve: [34, 40, 34, 38, 42, 38] },
  { z: -90,  opacity: 0.55, tone: 'main',   curve: [46, 50, 46, 48, 52, 48] },
  { z: -115, opacity: 0.28, tone: 'shadow', curve: [56, 58, 56, 58, 60, 58] },
  { z: -150, opacity: 0.22, tone: 'accent', curve: [64, 66, 64, 66, 68, 66] },
  { z: -125, opacity: 0.15, tone: 'dim',    curve: [72, 74, 72, 74, 76, 74] },
]

function bandPath([t0, tc, t1, b0, bc, b1]) {
  return `M 8,${t0} Q 50,${tc} 92,${t1} L 92,${b1} Q 50,${bc} 8,${b0} Z`
}

export function VaultRoomBackground({ mouseRef }) {
  const vaultRef = useRef(null)
  const lightRef = useRef(null)
  const smooth = useRef({ rotX: 0, rotY: 0, lightX: 0, lightY: 0 })

  useEffect(() => {
    let animId
    const MAX_Y = 3.2
    const MAX_X = 1.8
    const LERP = 0.04

    const tick = () => {
      if (mouseRef?.current) {
        const mx = mouseRef.current.x || 0
        const my = mouseRef.current.y || 0
        smooth.current.rotY += (mx * MAX_Y - smooth.current.rotY) * LERP
        smooth.current.rotX += (-my * MAX_X - smooth.current.rotX) * LERP
        smooth.current.lightX += (mx * 14 - smooth.current.lightX) * LERP
        smooth.current.lightY += (my * 10 - smooth.current.lightY) * LERP

        if (vaultRef.current) {
          vaultRef.current.style.transform = `
            rotateX(${smooth.current.rotX}deg)
            rotateY(${smooth.current.rotY}deg)
          `
        }
        if (lightRef.current) {
          lightRef.current.style.transform = `translate(${smooth.current.lightX}px, ${smooth.current.lightY}px)`
        }
      }
      animId = requestAnimationFrame(tick)
    }
    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [mouseRef])

  return (
    <div className="vault-room vault-room--vault3d" aria-hidden="true">
      {/* Seamless infinite backdrop — no floor line */}
      <div className="vault-room__base" />
      <div className="vault-room__haze" />
      <div className="vault-room__grain" />

      <div className="vault-room__stage">
        <div ref={vaultRef} className="vault-room__inner vault-vault3d">
          {VAULT_BANDS.map((band, i) => (
            <div
              key={i}
              className="vault-vault3d__layer"
              style={{
                transform: `translateZ(${band.z}px)`,
                opacity: band.opacity,
              }}
            >
              <svg
                className="vault-vault3d__svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id={`vault-band-fill-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#c8b8a4" stopOpacity="0" />
                    <stop offset="12%" stopColor="#e8ddd0" />
                    <stop offset="50%" stopColor="#f7f2eb" />
                    <stop offset="88%" stopColor="#e8ddd0" />
                    <stop offset="100%" stopColor="#c8b8a4" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id={`vault-band-edge-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#faf6f0" stopOpacity="0" />
                    <stop offset="18%" stopColor="#ebe2d6" stopOpacity="0.9" />
                    <stop offset="50%" stopColor="#e5dbd0" />
                    <stop offset="82%" stopColor="#ebe2d6" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#faf6f0" stopOpacity="0" />
                  </linearGradient>
                  {band.tone === 'shadow' && (
                    <linearGradient id={`vault-band-shadow-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#8a7868" stopOpacity="0" />
                      <stop offset="50%" stopColor="#6e5e50" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#8a7868" stopOpacity="0" />
                    </linearGradient>
                  )}
                </defs>
                <path
                  d={bandPath(band.curve)}
                  fill={`url(#vault-band-fill-${i})`}
                  className="vault-vault3d__band"
                />
                <path
                  d={bandPath(band.curve)}
                  fill={`url(#vault-band-edge-${i})`}
                  className="vault-vault3d__band-feather"
                />
                {band.tone === 'shadow' && (
                  <path
                    d={bandPath(band.curve)}
                    fill={`url(#vault-band-shadow-${i})`}
                    className="vault-vault3d__band-shadow"
                  />
                )}
              </svg>
            </div>
          ))}

          {/* Central depth well — soft void behind cards */}
          <div className="vault-vault3d__well" />
        </div>
      </div>

      {/* Side gaps + full edge melt (red-line boundaries) */}
      <div className="vault-vault3d__gap vault-vault3d__gap--left" />
      <div className="vault-vault3d__gap vault-vault3d__gap--right" />
      <div className="vault-vault3d__melt vault-vault3d__melt--top" />
      <div className="vault-vault3d__melt vault-vault3d__melt--bottom" />
      <div className="vault-vault3d__melt vault-vault3d__melt--sides" />

      <div ref={lightRef} className="vault-room__spotlight-wrap">
        <div className="vault-room__spotlight" />
      </div>
      <div className="vault-room__glow vault-room__glow--warm" />
      <div className="vault-room__vignette" />
    </div>
  )
}

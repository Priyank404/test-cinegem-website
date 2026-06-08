import { Suspense, useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Camera Parallax Rig ─────────────────────────────────────────────────────
function CameraRig({ mouseRef }) {
  const { camera } = useThree()
  const targetPos = useRef(new THREE.Vector3())
  const targetLook = useRef(new THREE.Vector3())

  useFrame(() => {
    const mx = mouseRef?.current?.x ?? 0
    const my = mouseRef?.current?.y ?? 0

    // Smoothly sway camera position: wider X sweep, subtle Y swing
    targetPos.current.set(mx * 1.8, -my * 0.5, 9.5)
    camera.position.lerp(targetPos.current, 0.038)

    // Smoothly tilt camera lookAt: tracks pointer organic sway
    targetLook.current.set(mx * 0.38, -my * 0.15, 0)
    camera.lookAt(targetLook.current)
  })

  return null
}

// ─── Curved Film-Roll Bands ──────────────────────────────────────────────────
function FilmRollBands() {
  // Generate a mathematically perfect 2D feathering map on a Canvas.
  // Stretches fully solid white in the center and feathers to 0 alpha at all boundaries.
  const fadeTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    // 1. Draw horizontal fade linear gradient (fades left & right edges)
    const gradH = ctx.createLinearGradient(0, 0, 512, 0)
    gradH.addColorStop(0, 'rgba(255, 255, 255, 0)')
    gradH.addColorStop(0.15, 'rgba(255, 255, 255, 1)')
    gradH.addColorStop(0.85, 'rgba(255, 255, 255, 1)')
    gradH.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = gradH
    ctx.fillRect(0, 0, 512, 512)

    // 2. Draw vertical fade linear gradient (fades top & bottom edges) on a temp canvas
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = 512
    tempCanvas.height = 512
    const tempCtx = tempCanvas.getContext('2d')
    const gradV = tempCtx.createLinearGradient(0, 0, 0, 512)
    gradV.addColorStop(0, 'rgba(255, 255, 255, 0)')
    gradV.addColorStop(0.20, 'rgba(255, 255, 255, 1)')
    gradV.addColorStop(0.80, 'rgba(255, 255, 255, 1)')
    gradV.addColorStop(1, 'rgba(255, 255, 255, 0)')
    tempCtx.fillStyle = gradV
    tempCtx.fillRect(0, 0, 512, 512)

    // 3. Multiply both linear gradients to make a perfect 2D feathered border mask
    ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(tempCanvas, 0, 0)

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = THREE.ClampToEdgeWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    return tex
  }, [])

  // Generate a beautiful white-to-beige radial glow texture for the central spotlight halo
  const glowTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256)
    // Core is very bright luxury warm off-white, fading gracefully into the beige void
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)')
    grad.addColorStop(0.25, 'rgba(255, 255, 255, 0.95)')
    grad.addColorStop(0.55, 'rgba(242, 235, 226, 0.65)')
    grad.addColorStop(0.80, 'rgba(235, 225, 213, 0.25)')
    grad.addColorStop(1, 'rgba(235, 225, 213, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 512, 512)

    const tex = new THREE.CanvasTexture(canvas)
    return tex
  }, [])

  // Generate a gorgeous undulating luxury satin fabric height, color & opacity texture matching the background shade
  const satinTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    // 1. Fill base warm satin luxury shade (matches background cyclorama #ebe1d5)
    ctx.fillStyle = '#ebe1d5'
    ctx.fillRect(0, 0, 512, 512)

    // 2. Draw luxury undulating drapery folds
    ctx.globalAlpha = 0.48

    // Fold 1: Highlight
    ctx.strokeStyle = '#f4e9dc'
    ctx.lineWidth = 130
    ctx.shadowColor = '#f4e9dc'
    ctx.shadowBlur = 90
    ctx.beginPath()
    ctx.moveTo(-50, 120)
    ctx.bezierCurveTo(150, 60, 320, 440, 560, 360)
    ctx.stroke()

    // Fold 2: Shadow
    ctx.strokeStyle = '#a69480'
    ctx.lineWidth = 110
    ctx.shadowColor = '#a69480'
    ctx.shadowBlur = 80
    ctx.beginPath()
    ctx.moveTo(-50, 240)
    ctx.bezierCurveTo(160, 160, 290, 500, 560, 400)
    ctx.stroke()

    // Fold 3: Highlight
    ctx.strokeStyle = '#f4e9dc'
    ctx.lineWidth = 100
    ctx.shadowColor = '#f4e9dc'
    ctx.shadowBlur = 75
    ctx.beginPath()
    ctx.moveTo(-50, 380)
    ctx.bezierCurveTo(130, 320, 270, 200, 560, 160)
    ctx.stroke()

    // Fold 4: Shadow
    ctx.strokeStyle = '#a69480'
    ctx.lineWidth = 120
    ctx.shadowColor = '#a69480'
    ctx.shadowBlur = 95
    ctx.beginPath()
    ctx.moveTo(-50, 40)
    ctx.bezierCurveTo(120, 180, 380, 120, 560, 220)
    ctx.stroke()

    // Reset globalAlpha to 1.0 so the destination-in mask operation applies fully
    ctx.globalAlpha = 1.0

    // 3. Create a mathematically perfect alpha mask to feather the edges seamlessly
    const maskCanvas = document.createElement('canvas')
    maskCanvas.width = 512
    maskCanvas.height = 512
    const mctx = maskCanvas.getContext('2d')
    mctx.fillStyle = '#ffffff'
    mctx.fillRect(0, 0, 512, 512)

    // Horizontal fade (transparent at left/right edges - extreme soft center-focus bell curve)
    const gradH = mctx.createLinearGradient(0, 0, 512, 0)
    gradH.addColorStop(0, 'rgba(255, 255, 255, 0.0)')
    gradH.addColorStop(0.18, 'rgba(255, 255, 255, 0.30)')
    gradH.addColorStop(0.38, 'rgba(255, 255, 255, 0.88)')
    gradH.addColorStop(0.50, 'rgba(255, 255, 255, 1.0)')
    gradH.addColorStop(0.62, 'rgba(255, 255, 255, 0.88)')
    gradH.addColorStop(0.82, 'rgba(255, 255, 255, 0.30)')
    gradH.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)')
    
    const tempHCanvas = document.createElement('canvas')
    tempHCanvas.width = 512
    tempHCanvas.height = 512
    const tempHCtx = tempHCanvas.getContext('2d')
    tempHCtx.fillStyle = gradH
    tempHCtx.fillRect(0, 0, 512, 512)

    mctx.globalCompositeOperation = 'destination-in'
    mctx.drawImage(tempHCanvas, 0, 0)

    // Vertical fade (transparent at back - vanishes ultra-softly and incredibly deep in the room)
    const gradV = mctx.createLinearGradient(0, 512, 0, 0)
    gradV.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
    gradV.addColorStop(0.20, 'rgba(255, 255, 255, 0.85)')
    gradV.addColorStop(0.45, 'rgba(255, 255, 255, 0.40)')
    gradV.addColorStop(0.70, 'rgba(255, 255, 255, 0.12)')
    gradV.addColorStop(0.92, 'rgba(255, 255, 255, 0.0)')
    gradV.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)')

    const tempVCanvas = document.createElement('canvas')
    tempVCanvas.width = 512
    tempVCanvas.height = 512
    const tempVCtx = tempVCanvas.getContext('2d')
    tempVCtx.fillStyle = gradV
    tempVCtx.fillRect(0, 0, 512, 512)

    mctx.drawImage(tempVCanvas, 0, 0)

    // Radial fade (transparent at outer circle - cloud-like fade starting exactly at the center and meeting cylinder wall)
    const radialGrad = mctx.createRadialGradient(256, 256, 0, 256, 256, 256)
    radialGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
    radialGrad.addColorStop(0.30, 'rgba(255, 255, 255, 0.95)')
    radialGrad.addColorStop(0.50, 'rgba(255, 255, 255, 0.55)')
    radialGrad.addColorStop(0.68, 'rgba(255, 255, 255, 0.12)')
    radialGrad.addColorStop(0.80, 'rgba(255, 255, 255, 0.0)')
    radialGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)')

    const tempCircleCanvas = document.createElement('canvas')
    tempCircleCanvas.width = 512
    tempCircleCanvas.height = 512
    const tempCircleCtx = tempCircleCanvas.getContext('2d')
    tempCircleCtx.fillStyle = radialGrad
    tempCircleCtx.fillRect(0, 0, 512, 512)

    mctx.drawImage(tempCircleCanvas, 0, 0)

    // Apply the combined alpha mask directly into the satinTexture
    ctx.globalCompositeOperation = 'destination-in'
    ctx.drawImage(maskCanvas, 0, 0)

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    tex.generateMipmaps = false
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    return tex
  }, [])

  // Generate a beautiful vertical alpha map for the curved cyclorama wall
  // This blends the vertical wall seamlessly into the floor and ceiling discs at their boundaries
  const cylinderTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    const grad = ctx.createLinearGradient(0, 0, 0, 512)
    // Completely transparent at the top and bottom 20% to hide the sharp vertical wall junctions
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.0)')
    grad.addColorStop(0.20, 'rgba(255, 255, 255, 0.0)')   // Transparent up to 20%
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 1.0)')   // Solid center
    grad.addColorStop(0.65, 'rgba(255, 255, 255, 1.0)')   // Solid center
    grad.addColorStop(0.80, 'rgba(255, 255, 255, 0.0)')   // Transparent from 80% to bottom
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)')

    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 128, 512)

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    return tex
  }, [])

  return (
    <group>
      {/* Central lighting spotlight halo (pure white glowing core fading to beige) */}
      <mesh position={[0, 0, -18]} scale={[45, 33, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={glowTexture} transparent depthWrite={false} />
      </mesh>

      {/* Seamless 3D Cyclorama curved background wall */}
      <mesh position={[0, 0, -4.5]}>
        <cylinderGeometry args={[22, 22, 10.8, 64, 1, true]} />
        <meshStandardMaterial
          color="#ebe1d5"
          side={THREE.BackSide}
          roughness={0.65}
          metalness={0.0}
          transparent
          opacity={0.96}
          alphaMap={cylinderTexture}
          depthWrite={false}
        />
      </mesh>

      {/* Premium Solid Circular Floor Disc (Covers full screen width, touches borders) */}
      <mesh position={[0, -5.4, -4.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[44, 44]} />
        <meshStandardMaterial
          color="#ebe1d5"                  // Rich luxury warm sand-beige floor shade matched to background
          map={satinTexture}
          bumpMap={satinTexture}
          bumpScale={0.20}                 // Extremely soft premium bumps to prevent sharp grazing shadows
          transparent
          opacity={0.48}                  // Extra-whisper-soft opacity for flawless, seamless blending
          roughness={0.42}
          metalness={0.02}
          side={THREE.DoubleSide}
          depthWrite={false}              // CRITICAL: Disable depth writing to completely eradicate WebGL sorting seams
        />
      </mesh>

      {/* Premium Solid Circular Ceiling Disc (Covers full screen width, touches borders) */}
      <mesh position={[0, 5.4, -4.5]} rotation={[Math.PI / 2, 0, Math.PI]}>
        <planeGeometry args={[44, 44]} />
        <meshStandardMaterial
          color="#ebe1d5"                  // Matching sand-beige ceiling shade matched to background
          map={satinTexture}
          bumpMap={satinTexture}
          bumpScale={0.20}                 // Extremely soft premium bumps to prevent sharp grazing shadows
          transparent
          opacity={0.48}                  // Extra-whisper-soft opacity for flawless, seamless blending
          roughness={0.42}
          metalness={0.02}
          side={THREE.DoubleSide}
          depthWrite={false}              // CRITICAL: Disable depth writing to completely eradicate WebGL sorting seams
        />
      </mesh>
    </group>
  )
}
 
// ─── Interactive Room Lights Component ──────────────────────────────────────────
function InteractiveRoomLights({ mouseRef }) {
  const floorLightRef = useRef()

  useFrame(() => {
    const mx = mouseRef?.current?.x ?? 0
    const my = mouseRef?.current?.y ?? 0

    // Constrain sweeps to keep the light puddle inside the opaque, non-feathered parts of the floor disc
    // This prevents the light from disappearing when hovering or clicking on the far edges
    const targetX = THREE.MathUtils.clamp(mx * 9.5, -7.5, 7.5)
    const targetZ = THREE.MathUtils.clamp(1.5 - my * 7.5, -2.5, 5.5)

    // Smoothly lerp light position for premium weight
    if (floorLightRef.current) {
      floorLightRef.current.position.x = THREE.MathUtils.lerp(floorLightRef.current.position.x, targetX, 0.06)
      floorLightRef.current.position.z = THREE.MathUtils.lerp(floorLightRef.current.position.z, targetZ, 0.06)
    }
  })

  return (
    <group>
      {/* Floor PointLight: Close to floor level for grazing shadows and reflections */}
      <pointLight
        ref={floorLightRef}
        position={[0, -4.5, 0]}
        intensity={6.5}
        distance={18}
        decay={1.6}
        color="#ffeed6"
      />
    </group>
  )
}

// ─── Main VaultRoom3D Canvas Wrapper ─────────────────────────────────────────
export default function VaultRoom3D({ mouseRef }) {
  return (
    <div className="absolute inset-0 w-full h-full z-0 select-none pointer-events-none">
      <Canvas
        camera={{ fov: 42, near: 0.1, far: 80, position: [0, 0, 9.5] }}
        gl={{
          antialias: true,
          alpha: false,
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor('#ebe1d5')
          // Volumetric Exp2 fog to feather far bands into the void
          scene.fog = new THREE.FogExp2('#ebe1d5', 0.026)
        }}
        style={{ background: '#ebe1d5' }}
      >
        {/* Soft Ambient Light for room fill */}
        <ambientLight intensity={0.70} color="#fff6eb" />

        {/* Vertically centered key light to illuminate floor and ceiling symmetrically */}
        <directionalLight
          position={[5, 0.2, 6]}
          intensity={1.8}
          color="#fffaee"
        />

        {/* Soft back point light to cast a gorgeous centralized radial highlight on both discs */}
        <pointLight
          position={[0, 0.2, -5]}
          intensity={1.0}
          color="#fff2df"
        />

        {/* Interactive room lights tracking mouse pointer */}
        <InteractiveRoomLights mouseRef={mouseRef} />

        {/* Dynamic camera rig */}
        <CameraRig mouseRef={mouseRef} />

        <Suspense fallback={null}>
          <FilmRollBands />
        </Suspense>
      </Canvas>
    </div>
  )
}

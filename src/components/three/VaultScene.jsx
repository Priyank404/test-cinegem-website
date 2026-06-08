import { Suspense, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Preload, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

import { VAULT_PANELS }  from '@/constants'

function CameraRig({ mouseRef }) {
  const { camera } = useThree()
  const target     = useRef(new THREE.Vector3())

  useFrame(() => {
    const mx = mouseRef?.current?.x ?? 0
    const my = mouseRef?.current?.y ?? 0

    // Wider lateral sweep so far-left / far-right cards stay in frame
    target.current.set(mx * 1.2, -my * 0.5, 9)
    camera.position.lerp(target.current, 0.036)
    camera.lookAt(mx * 0.18, -my * 0.10, 0)
  })

  return null
}

export function VaultScene({ mouseRef, onNavigate }) {
  return (
    <>
      {/* Warm key light from top-right */}
      <directionalLight
        position={[5, 9, 6]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={35}
        color="#fff9f3"
      />
      {/* Cool fill from left-rear */}
      <directionalLight position={[-7, 2, -5]} intensity={0.5} color="#d8cfc4" />
      {/* Warm back-fill behind panels */}
      <pointLight position={[0, 4, -10]} intensity={1.4} color="#f0e0c8" />
      {/* Soft ambient */}
      <ambientLight intensity={0.55} color="#fdf8f2" />

      <Environment preset="studio" />

      <ContactShadows
        position={[0, -3.4, 0]}
        opacity={0.15}
        scale={28}
        blur={3.5}
        far={8}
        color="#7a6858"
      />

      <CameraRig mouseRef={mouseRef} />

      <Suspense fallback={null}>
        {VAULT_PANELS.map((panel, i) => (
          <FloatingPanel
            key={panel.id}
            img={panel.img}
            label={panel.label}
            position={panel.position}
            rotation={panel.rotation}
            scale={panel.scale}
            index={i}
            isService={panel.isService}
            route={panel.route}
            onNavigate={onNavigate}
          />
        ))}
        <Preload all />
      </Suspense>
    </>
  )
}

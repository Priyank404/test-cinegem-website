import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { VAULT_PANELS } from '@/constants'

// Custom Vertex Shader
const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

// Custom Fragment Shader (adapted from Evan Wallace's glfx.js zoom blur)
const FRAGMENT_SHADER = `
  uniform sampler2D map;
  uniform vec2 center;
  uniform float strength;
  uniform vec2 uvOffset;
  uniform vec2 uvScale;
  varying vec2 vUv;

  float random(vec3 scale, float seed) {
    /* use the fragment position for a different seed per-pixel */
    return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
  }
  
  void main() {
    vec2 tUv = vUv * uvScale + uvOffset;
    
    // Clamp uv coordinates to avoid texture wrapping artifacts at the edges
    vec2 clampedUv = clamp(tUv, 0.0, 1.0);
    
    if (abs(strength) > 0.001) {
      vec4 color = vec4(0.0);
      float total = 0.0;
      
      // Calculate vector pointing from center to current fragment UV
      vec2 toCenter = center * uvScale + uvOffset - tUv;
      
      /* randomize the lookup values to hide the fixed number of samples */
      float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);
      
      for (float t = 0.0; t <= 20.0; t++) {
        float percent = (t + offset) / 20.0;
        float weight = 2.0 * (percent - percent * percent);
        
        // Sample texture along vector towards zoom center
        vec2 sampleUv = clamp(tUv + toCenter * percent * strength, 0.0, 1.0);
        vec4 texel = texture2D(map, sampleUv);

        /* switch to pre-multiplied alpha to correctly blur transparent images */
        texel.rgb *= texel.a;

        color += texel * weight;
        total += weight;
      }

      gl_FragColor = color / total;

      /* switch back from pre-multiplied alpha */
      gl_FragColor.rgb /= gl_FragColor.a + 0.00001;
      gl_FragColor.a = 1.0 - abs(strength);
    } else {
      gl_FragColor = texture2D(map, clampedUv);
    }
  }
`

export default function ZoomBlurSlider({ onNavigate }) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  
  // React index state for text/dots
  const [currentIndexState, setCurrentIndexState] = useState(0)
  const [texturesLoaded, setTexturesLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)

  // WebGL references
  const rendererRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  
  const mesh1Ref = useRef(null)
  const mesh2Ref = useRef(null)
  const texturesRef = useRef([])

  // Interaction variables
  const currentIndex = useRef(0)
  const isTransitioning = useRef(false)
  const lastScrollTime = useRef(0)
  const scrollCooldown = 1350 // ms to allow slide change

  // Mouse parallax variables
  const targetMouse = useRef(new THREE.Vector2(0, 0))
  const smoothMouse = useRef(new THREE.Vector2(0, 0))
  
  // Touch variables
  const touchStart = useRef({ x: 0, y: 0 })

  // 1. Texture Loading
  useEffect(() => {
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')

    const loadPromises = VAULT_PANELS.map((panel) => {
      return new Promise((resolve, reject) => {
        loader.load(
          panel.img,
          (texture) => {
            // Apply high quality filtering
            texture.minFilter = THREE.LinearFilter
            texture.magFilter = THREE.LinearFilter
            texture.generateMipmaps = false
            resolve(texture)
          },
          undefined,
          (err) => {
            console.error(`Failed to load texture for ${panel.label}:`, err)
            reject(err)
          }
        )
      })
    })

    Promise.all(loadPromises)
      .then((loadedTextures) => {
        texturesRef.current = loadedTextures
        setTexturesLoaded(true)
      })
      .catch((err) => {
        console.error('Failed to load WebGL slider textures, using fallback images.', err)
        setLoadError(true)
      })
  }, [])

  // 2. WebGL initialization and lifecycle
  useEffect(() => {
    if (!texturesLoaded || loadError) return

    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    // Scene setup
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Camera setup - Orthographic covers screen perfectly in [-1, 1]
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    rendererRef.current = renderer

    // Fullscreen quad geometry
    const geometry = new THREE.PlaneGeometry(2, 2)

    // Material 1 - Current slide
    const mat1 = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        map: { value: texturesRef.current[0] },
        center: { value: new THREE.Vector2(0.5, 0.5) },
        strength: { value: 0 },
        uvOffset: { value: new THREE.Vector2(0, 0) },
        uvScale: { value: new THREE.Vector2(1, 1) },
      },
    })

    // Material 2 - Target slide (overlaid during transition)
    const mat2 = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        map: { value: texturesRef.current[1] },
        center: { value: new THREE.Vector2(0.5, 0.5) },
        strength: { value: -1 },
        uvOffset: { value: new THREE.Vector2(0, 0) },
        uvScale: { value: new THREE.Vector2(1, 1) },
      },
    })

    const mesh1 = new THREE.Mesh(geometry, mat1)
    const mesh2 = new THREE.Mesh(geometry, mat2)
    mesh1.renderOrder = 1
    mesh2.renderOrder = 2

    scene.add(mesh1)
    scene.add(mesh2)

    mesh1Ref.current = mesh1
    mesh2Ref.current = mesh2

    // Apply aspect ratio cover scaling initially
    updateTextureCover(mesh1.material.uniforms, texturesRef.current[0])
    updateTextureCover(mesh2.material.uniforms, texturesRef.current[1])

    // Resize handler
    const handleResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      
      renderer.setSize(w, h)
      
      if (mesh1Ref.current && texturesRef.current[currentIndex.current]) {
        updateTextureCover(mesh1Ref.current.material.uniforms, texturesRef.current[currentIndex.current])
      }
      if (mesh2Ref.current) {
        // Find whichever index is target during transition, or default to j = (i + 1) % 5
        const currentIdx = currentIndex.current
        const nextIdx = (currentIdx + 1) % VAULT_PANELS.length
        updateTextureCover(mesh2Ref.current.material.uniforms, texturesRef.current[nextIdx])
      }
    }

    window.addEventListener('resize', handleResize)

    // Animation frame loop
    let animationFrameId
    const animate = () => {
      // Smoothly lerp mouse pointer tracking
      smoothMouse.current.lerp(targetMouse.current, 0.08)
      
      // Convert [-1, 1] mouse range to [0, 1] UV coordinates
      const uvX = smoothMouse.current.x * 0.5 + 0.5
      const uvY = smoothMouse.current.y * 0.5 + 0.5

      // Pass updated coordinates to shaders
      if (mesh1Ref.current) mesh1Ref.current.material.uniforms.center.value.set(uvX, uvY)
      if (mesh2Ref.current) mesh2Ref.current.material.uniforms.center.value.set(uvX, uvY)

      renderer.render(scene, camera)
      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    // Cleanup WebGL resources
    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      
      geometry.dispose()
      mat1.dispose()
      mat2.dispose()
      renderer.dispose()
    }
  }, [texturesLoaded, loadError])

  // Helper: Emulates css 'object-fit: cover' inside WebGL shader uniforms
  const updateTextureCover = (uniforms, texture) => {
    if (!texture || !texture.image || !rendererRef.current) return
    
    const iWidth = texture.image.width
    const iHeight = texture.image.height
    const iRatio = iWidth / iHeight
    
    const canvasWidth = rendererRef.current.domElement.clientWidth
    const canvasHeight = rendererRef.current.domElement.clientHeight
    const canvasRatio = canvasWidth / canvasHeight
    
    uniforms.uvOffset.value.set(0, 0)
    uniforms.uvScale.value.set(1, 1)
    
    if (iRatio > canvasRatio) {
      // Image is wider than viewport
      uniforms.uvScale.value.x = canvasRatio / iRatio
      uniforms.uvOffset.value.x = (1 - uniforms.uvScale.value.x) / 2
    } else {
      // Viewport is wider than image
      uniforms.uvScale.value.y = iRatio / canvasRatio
      uniforms.uvOffset.value.y = (1 - uniforms.uvScale.value.y) / 2
    }
  }

  // 3. Transition Animation Trigger
  const transitionSlide = (targetIndex) => {
    if (isTransitioning.current || targetIndex === currentIndex.current) return
    isTransitioning.current = true

    const curIndex = currentIndex.current
    const panelsCount = VAULT_PANELS.length

    // Determine direction for zoom shader
    let direction = 1
    if (targetIndex === 0 && curIndex === panelsCount - 1) {
      direction = 1 // wrapping forward
    } else if (targetIndex === panelsCount - 1 && curIndex === 0) {
      direction = -1 // wrapping backward
    } else {
      direction = targetIndex > curIndex ? 1 : -1
    }

    const targetTexture = texturesRef.current[targetIndex]
    
    // Setup target slide (mesh2)
    mesh2Ref.current.material.uniforms.map.value = targetTexture
    updateTextureCover(mesh2Ref.current.material.uniforms, targetTexture)
    
    // Reset starting strengths explicitly for clean slide transitions
    mesh1Ref.current.material.uniforms.strength.value = 0
    mesh2Ref.current.material.uniforms.strength.value = -direction

    const tl = gsap.timeline({
      onComplete: () => {
        if (mesh1Ref.current && mesh2Ref.current) {
          // Commit target texture to mesh1 and reset strength
          mesh1Ref.current.material.uniforms.map.value = targetTexture
          updateTextureCover(mesh1Ref.current.material.uniforms, targetTexture)
          mesh1Ref.current.material.uniforms.strength.value = 0
          
          // Reset mesh2 strength to hidden
          mesh2Ref.current.material.uniforms.strength.value = -direction
        }
        
        currentIndex.current = targetIndex
        setCurrentIndexState(targetIndex)
        isTransitioning.current = false
      }
    })

    // Tween current slide (mesh1) strength to full zoom-blur in direction
    tl.to(mesh1Ref.current.material.uniforms.strength, {
      value: direction,
      duration: 1.15,
      ease: 'power2.out',
    }, 0)

    // Tween target slide (mesh2) strength to clean focus (0)
    tl.to(mesh2Ref.current.material.uniforms.strength, {
      value: 0,
      duration: 1.15,
      ease: 'power2.out',
    }, 0)
  }

  const navigateSlide = (dir) => {
    const nextIndex = (currentIndex.current + dir + VAULT_PANELS.length) % VAULT_PANELS.length
    transitionSlide(nextIndex)
  }

  // 4. Input Listeners
  // Scroll wheel - immediate clean transition step-by-step
  const handleWheel = (e) => {
    if (isTransitioning.current) return

    const now = Date.now()
    // 600ms debounce ensures rapid notches within one finger-flick don't skip multiple slides
    if (now - lastScrollTime.current < 600) return

    const delta = e.deltaY
    if (Math.abs(delta) > 12) {
      lastScrollTime.current = now
      if (delta > 0) {
        navigateSlide(1) // Next slide
      } else {
        navigateSlide(-1) // Previous slide
      }
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      const now = Date.now()
      if (now - lastScrollTime.current < scrollCooldown) return

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        navigateSlide(1)
        lastScrollTime.current = now
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        navigateSlide(-1)
        lastScrollTime.current = now
      } else if (e.key === 'Enter') {
        // Enter goes to page
        onNavigate(VAULT_PANELS[currentIndex.current].route)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNavigate])

  // Mouse hover tracking
  const handleMouseMove = (e) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const my = -((e.clientY - rect.top) / rect.height) * 2 + 1
    targetMouse.current.set(mx, my)
  }

  // Touch swiping
  const handleTouchStart = (e) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    }
  }

  const handleTouchEnd = (e) => {
    const now = Date.now()
    if (now - lastScrollTime.current < scrollCooldown) return

    const deltaX = e.changedTouches[0].clientX - touchStart.current.x
    const deltaY = e.changedTouches[0].clientY - touchStart.current.y

    if (Math.abs(deltaX) > 40 || Math.abs(deltaY) > 40) {
      // Determine dominant swipe axis
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        if (deltaY < 0) navigateSlide(1) // swipe up -> next
        else navigateSlide(-1) // swipe down -> prev
      } else {
        if (deltaX < 0) navigateSlide(1) // swipe left -> next
        else navigateSlide(-1) // swipe right -> prev
      }
      lastScrollTime.current = now
    }
  }

  // Explore Action
  const handleExplore = () => {
    onNavigate(VAULT_PANELS[currentIndexState].route)
  }

  const handleDoubleClick = () => {
    handleExplore()
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
      className="relative w-full h-screen overflow-hidden bg-[#ebe1d5] select-none"
    >
      {/* 1. WebGL Canvas background */}
      {texturesLoaded ? (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
        />
      ) : (
        // Static loading placeholder inside canvas bounds
        <div className="absolute inset-0 flex items-center justify-center bg-[#ebe1d5] z-0">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-charcoal-deep/15 border-t-charcoal-deep animate-spin" />
            <span className="font-label text-[9px] tracking-[0.25em] text-charcoal-deep/40 uppercase">
              Initializing WebGL Canvas
            </span>
          </div>
        </div>
      )}

      {/* 2. Premium luxury vignette shadow overlay */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 35%, rgba(18, 18, 18, 0.1) 70%, rgba(18, 18, 18, 0.35) 100%)',
          mixBlendMode: 'multiply'
        }}
      />
      <div 
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(18,18,18,0.5) 0%, transparent 40%, transparent 70%, rgba(18,18,18,0.3) 100%)'
        }}
      />

      {/* 3. Luxury Typography Overlays (Positioned absolutely for precise responsive control) */}
      
      {/* Top bar metadata - Hidden on mobile/tablet, clean positioning on desktop */}
      <div className="absolute top-20 left-6 right-6 lg:top-36 lg:left-[80px] lg:right-[80px] z-20 hidden lg:flex items-center justify-end font-label text-[10px] tracking-[0.25em] text-cream-soft/60 uppercase pointer-events-none">
        <div>
          <span>{(currentIndexState + 1).toString().padStart(2, '0')}</span>
          <span className="mx-2 text-cream-soft/30">/</span>
          <span>{VAULT_PANELS.length.toString().padStart(2, '0')}</span>
        </div>
      </div>

      {/* Main Content Panel - Bottom-Left on both mobile and desktop */}
      <div className="absolute bottom-20 left-6 lg:bottom-[160px] lg:left-[80px] max-w-[calc(100%-48px)] lg:max-w-2xl z-20 pointer-events-auto flex flex-col items-start">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndexState}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-start"
          >
            {/* Category chip */}
            <span className="text-[#C5A059] font-label text-[9px] lg:text-[10px] tracking-[0.35em] uppercase block mb-2 font-medium">
              {VAULT_PANELS[currentIndexState].category}
            </span>
            
            {/* Slide Title - Scaled down for mobile/tablet screens */}
            <h1 className="font-display text-2.5xl lg:text-6.5xl text-cream-soft tracking-[0.06em] leading-tight select-none">
              {VAULT_PANELS[currentIndexState].label}
            </h1>

            {/* Description paragraph - Scaled for mobile */}
            <p className="mt-3 lg:mt-4 text-cream-soft/75 font-body text-[11px] lg:text-sm max-w-xs lg:max-w-lg leading-relaxed font-light tracking-[0.03em] select-none">
              {currentIndexState === 0 && "Photorealistic representation of exquisite jewellery pieces, showcasing gold reflections and microscopic details."}
              {currentIndexState === 1 && "Conceptual visuals that push the boundaries of luxury design and presentation."}
              {currentIndexState === 2 && "Interactive visualizations showing materials, fittings, and jewelry on models."}
              {currentIndexState === 3 && "Fluid animations highlighting the organic movement of metals and light."}
              {currentIndexState === 4 && "Smooth 360-degree spins and cinematic camera sweeps revealing form and precision."}
            </p>

            {/* Action Button - Compact on mobile */}
            <button
              onClick={handleExplore}
              tabIndex={0}
              className="group flex items-center gap-4 border border-cream-soft/20 bg-cream-soft/5 hover:bg-cream-soft hover:text-charcoal-deep hover:border-cream-soft text-cream-soft font-label text-[8px] lg:text-[10px] tracking-[0.22em] py-3 px-6 lg:py-4 lg:px-8 transition-all duration-500 cursor-pointer mt-6 shadow-lg select-none rounded-[2px]"
              aria-label={`Explore ${VAULT_PANELS[currentIndexState].label}`}
            >
              EXPLORE COLLECTION
              <svg className="transform group-hover:translate-x-1.5 transition-transform duration-500" width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M1 5h12M9 1l4 4-4 4" />
              </svg>
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom bar guidance and slider indicators - Absolute positioned */}
      <div className="absolute bottom-6 left-6 right-6 lg:bottom-[80px] lg:left-[80px] lg:right-[80px] z-20 flex items-end justify-between pointer-events-none">
        

        {/* Quick Nav Indicators - Positioned at bottom right on mobile */}
        <div className="flex items-center gap-3 lg:gap-4 pointer-events-auto ml-auto">
          {VAULT_PANELS.map((panel, idx) => (
            <button
              key={panel.id}
              onClick={() => transitionSlide(idx)}
              className="relative py-2 focus:outline-none cursor-pointer group"
              aria-label={`Go to slide ${idx + 1}`}
            >
              <div 
                className={`h-[2px] transition-all duration-500 ${
                  idx === currentIndexState 
                    ? 'w-8 lg:w-10 bg-[#C5A059]' 
                    : 'w-3 lg:w-4 bg-cream-soft/30 group-hover:w-7 group-hover:bg-cream-soft/75'
                }`} 
              />
            </button>
          ))}
        </div>
      </div>


    </div>
  )
}

import { useState, useCallback } from 'react'
import { AnimatePresence }       from 'framer-motion'
import { useNavigate }           from 'react-router-dom'

import { useLenis }       from '@/hooks/useLenis'
import { CustomCursor }   from '@/components/ui/CustomCursor'
import { LoadingScreen }  from '@/components/ui/LoadingScreen'
import { Navigation }     from '@/components/layout/Navigation'
import { HeroVault }      from '@/components/sections/HeroVault'

export default function HomePage() {
  const [loaded, setLoaded] = useState(false)
  const navigate = useNavigate()

  useLenis()

  const handleLoadComplete = useCallback(() => setLoaded(true), [])
  const handleNavigate = useCallback((route) => navigate(route), [navigate])

  return (
    <>
      <div className="grain-overlay" aria-hidden="true" />
      <CustomCursor />

      <AnimatePresence>
        {!loaded && (
          <LoadingScreen key="loader" onComplete={handleLoadComplete} />
        )}
      </AnimatePresence>

      <div
        className={`transition-opacity duration-700 ${
          loaded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <Navigation />
        <main id="main-content" tabIndex={-1}>
          <HeroVault onNavigate={handleNavigate} />
        </main>
      </div>
    </>
  )
}

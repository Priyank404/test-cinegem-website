import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ServicePageLayout } from '@/components/shared/ServicePageLayout'
import { BackToVault } from '@/components/shared/BackToVault'
import VantaFogBackground from '@/components/effects/VantaFogBackground'

export default function ThreeDViewerPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <ServicePageLayout title="3D Interactive Viewer — Coming Soon" currentPage="/3d-viewer" fullBleed>
      <div className="relative min-h-[90vh] w-full flex flex-col justify-center items-center text-center px-6 py-20 bg-[#0d0d10] text-[#FCFBFA] overflow-hidden">
        {/* Vanta Fog Background */}
        <VantaFogBackground zIndex={0} />
        <div className="grain-overlay" aria-hidden="true" />

        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center gap-6">
          <div className="mb-2">
            <BackToVault light />
          </div>

          <span className="px-4 py-1.5 rounded-full border border-[#C5A059]/40 bg-[#C5A059]/10 text-[#C5A059] font-[Poppins] font-semibold text-[10px] tracking-[0.3em] uppercase">
            COMING SOON
          </span>

          <h1 className="font-[Poppins] font-semibold text-4xl sm:text-6xl md:text-7xl leading-[1.08] tracking-tight text-[#FCFBFA]">
            Interactive 3D Customizer
          </h1>

          <p className="font-[Poppins] font-light text-base md:text-lg text-[#FCFBFA]/80 max-w-xl leading-relaxed">
            We are engineering a real-time WebGL customizer featuring live metal swapping, physically-based diamond refraction, and interactive raycasting controls.
          </p>

          <div className="w-full max-w-md p-8 my-4 border border-white/15 bg-black/40 backdrop-blur-2xl rounded-xl shadow-2xl flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full border border-[#C5A059]/50 bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059] mb-2 animate-pulse">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="font-[Poppins] font-semibold text-xl text-[#FCFBFA]">
              WebGL Engine in Development
            </h2>
            <p className="font-[Poppins] font-light text-xs text-[#FCFBFA]/70 leading-relaxed">
              Our 3D studio engine will allow users to customize carat sizes, metal alloys, and gemstone cuts directly in high definition.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
            <Link
              to="/inquire"
              className="btn-primary py-3.5 px-8 text-xs font-semibold tracking-widest uppercase rounded-md"
            >
              INQUIRE ABOUT 3D ENGINE →
            </Link>
            <Link
              to="/"
              className="px-6 py-3.5 border border-white/20 text-xs font-semibold tracking-widest uppercase text-[#FCFBFA] hover:bg-white/10 transition-colors rounded-md font-[Poppins]"
            >
              RETURN TO THE VAULT
            </Link>
          </div>
        </div>
      </div>
    </ServicePageLayout>
  )
}

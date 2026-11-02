import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ServicePageLayout } from '@/components/shared/ServicePageLayout'
import { BackToVault } from '@/components/shared/BackToVault'

export default function ThreeDViewerPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <ServicePageLayout
      title="3D Interactive Viewer — Coming Soon"
      currentPage="/3d-viewer"
      fullBleed
      noScroll
    >
      <div className="relative w-full h-full flex-1 flex flex-col justify-center items-center text-center px-4 sm:px-6 py-1 sm:py-2 bg-transparent text-[#FCFBFA] overflow-hidden select-none">
        {/* Grain overlay */}
        <div className="grain-overlay pointer-events-none" aria-hidden="true" />

        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center gap-2 sm:gap-3 my-auto">
          <div>
            <BackToVault light />
          </div>

          <span className="px-3 py-0.5 sm:py-1 rounded-full border border-[#C5A059]/40 bg-[#C5A059]/10 text-[#C5A059] font-[Poppins] font-semibold text-[9px] sm:text-[10px] tracking-[0.3em] uppercase">
            COMING SOON
          </span>

          <h1 className="font-[Poppins] font-semibold text-2xl sm:text-4xl md:text-5xl leading-[1.08] tracking-tight text-[#FCFBFA]">
            Interactive 3D Viewer
          </h1>

          <p className="font-[Poppins] font-light text-[11px] sm:text-xs md:text-sm text-[#FCFBFA]/80 max-w-md sm:max-w-lg leading-relaxed">
            We are engineering a real-time interactive 3D configurator featuring live precious metal switching, optical diamond refraction, and 360° tactile controls.
          </p>

          <div className="w-full max-w-md p-3 sm:p-4 my-0.5 sm:my-1 border border-white/15 bg-black/40 backdrop-blur-2xl rounded-xl shadow-2xl flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full border border-[#C5A059]/50 bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059] animate-pulse">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="font-[Poppins] font-semibold text-base sm:text-lg text-[#FCFBFA]">
              Interactive 3D Engine in Development
            </h2>
            <p className="font-[Poppins] font-light text-[10px] sm:text-xs text-[#FCFBFA]/70 leading-relaxed max-w-xs">
              Our 3D studio engine will allow users to customize carat sizes, metal alloys, and gemstone cuts directly in high definition.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-1">
            <Link
              to="/inquire"
              className="btn-primary py-2 sm:py-2.5 px-5 sm:px-7 text-[10px] sm:text-xs font-semibold tracking-widest uppercase rounded-md"
            >
              INQUIRE ABOUT 3D ENGINE →
            </Link>
            <Link
              to="/"
              className="px-4 sm:px-5 py-2 sm:py-2.5 border border-white/20 text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-[#FCFBFA] hover:bg-white/10 transition-colors rounded-md font-[Poppins]"
            >
              BACK TO HOME
            </Link>
          </div>
        </div>
      </div>
    </ServicePageLayout>
  )
}

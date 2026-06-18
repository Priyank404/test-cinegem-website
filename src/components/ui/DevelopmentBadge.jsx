import { motion } from 'framer-motion'

/**
 * DevelopmentBadge Component
 * Displays a premium, large centered banner on the homepage
 * indicating the site is under development without affecting page interactions.
 */
export function DevelopmentBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
      animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
      className="fixed top-1/2 left-1/2 z-40 pointer-events-none select-none text-center min-w-[290px] md:min-w-[480px] px-8 py-8 md:px-16 md:py-12 rounded-lg bg-black/60 backdrop-blur-lg border border-[#C5A059]/20 shadow-float-lg"
    >
      <div className="flex flex-col items-center gap-4 md:gap-5">
        {/* Pulsing indicator dot */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C5A059] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C5A059]"></span>
        </span>
        
        {/* Main "UNDER DEVELOPMENT" heading */}
        <h2 
          style={{ fontFamily: "'Playfair Display', serif" }}
          className="text-xl md:text-3xl font-light tracking-[0.2em] uppercase text-[#FAF9F6] leading-none"
        >
          We Are Under Development
        </h2>

        {/* Sleek divider line */}
        <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent" />

        {/* Cinematic brand subtext */}
        <p 
          style={{ fontFamily: 'Manrope, sans-serif' }}
          className="text-[9px] md:text-[10px] font-medium tracking-[0.25em] uppercase text-[#C5A059]"
        >
          Cinegem Studio 
        </p>
      </div>
    </motion.div>
  )
}

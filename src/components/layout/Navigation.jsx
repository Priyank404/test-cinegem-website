import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { cn } from '@/lib/utils'

const LOGO_VARIANTS = {
  hidden:  { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
}

export function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 40))

  const handleNavClick = useCallback((e, href) => {
    e.preventDefault()
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="fixed top-0 left-0 right-0 z-50 bg-transparent transition-all duration-700"
      role="banner"
    >
      {/* 3-column: spacer | CINEGEM | Inquire */}
      <div className="grid grid-cols-3 items-center px-6 md:px-[--spacing-margin-desktop] h-16 md:h-20 max-w-container mx-auto">

        {/* Left spacer */}
        <div aria-hidden="true" />

        {/* Center — CINEGEM */}
        <div className="flex justify-center">
          <Link
            to="/"
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 600,
              fontSize: '32px',
              lineHeight: '40px',
              letterSpacing: '-0.04em',
            }}
            className="block leading-none whitespace-nowrap text-charcoal-deep hover:text-[#C5A059] transition-colors duration-300 focus:outline-none"
            aria-label="Cinegem Studio — return to top"
          >
            CINEGEM
          </Link>
        </div>

        {/* Right — Inquire */}
        <div className="flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Link
              to="/inquire"
              className="hidden lg:block btn-primary text-xs py-3 px-6"
            >
              Inquire →
            </Link>
          </motion.div>
        </div>

      </div>
    </motion.header>
  )
}

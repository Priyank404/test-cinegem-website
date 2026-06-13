import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FOOTER_LINKS } from '@/constants'

// All service pages — used to build per-page nav links
const ALL_SERVICES = [
  { label: 'Still Images',           route: '/still'         },
  { label: 'Creative Images',        route: '/creative'      },
  { label: 'On-Body Visualization',  route: '/onbody'        },
  { label: 'Creative Animation',     route: '/creative-anim' },
  { label: '360° Animation',         route: '/360'           },
]

/**
 * ServicePageLayout
 * Shared shell for every service page: navigation, back-to-vault button, footer.
 *
 * Props:
 *   children    – page content
 *   title       – <title> tag text
 *   currentPage – route string of the current page (e.g. '/still')
 *                 Used to exclude the current page from the nav links.
 */
export function ServicePageLayout({ children, title = 'Cinegem Studio', currentPage = '' }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    document.title = `${title} — Cinegem Studio`
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [title])

  // Block body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  // Show all service pages except the one we're currently on
  const navLinks = ALL_SERVICES.filter((s) => s.route !== currentPage)

  return (
    <div
      className="min-h-screen text-[#1b1c17] antialiased selection:bg-[#C5A059] selection:text-white"
      style={{ background: 'radial-gradient(circle at 50% 0%, #FAF9F6 0%, #E5DACE 100%)' }}
    >
      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-500 border-b ${
          scrolled
            ? 'backdrop-blur-xl bg-[#fbf9f1]/80 border-white/30 shadow-sm'
            : 'bg-transparent border-white/20'
        }`}
      >
        <div className="flex justify-between items-center px-6 md:px-20 max-w-[1440px] mx-auto h-20">
          {/* Logo → back to vault */}
          <Link
            to="/"
            className="font-[Playfair_Display] text-[32px] leading-[40px] tracking-tighter text-[#121212] hover:text-[#C5A059] transition-colors duration-300"
          >
            CINEGEM
          </Link>

          {/* Desktop links — other service pages */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.route}
                to={link.route}
                className="font-[Manrope] text-[12px] tracking-[0.15em] font-semibold uppercase text-[#444748] hover:text-[#121212] transition-colors duration-300"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <button
            onClick={() => navigate('/inquire')}
            className="hidden lg:block font-[Manrope] text-[12px] tracking-[0.15em] font-semibold uppercase px-6 py-3 bg-[#121212] text-[#FAF9F6] hover:bg-[#C5A059] transition-colors duration-300"
          >
            Inquire →
          </button>

          {/* Mobile hamburger menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-8 h-8 lg:hidden z-50 relative focus:outline-none pointer-events-auto cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            <span
              className={`absolute left-[4px] h-[1.5px] w-6 bg-[#121212] transition-all duration-300 ${
                menuOpen ? 'top-[16px] rotate-45' : 'top-[10px]'
              }`}
            />
            <span
              className={`absolute left-[4px] h-[1.5px] w-6 bg-[#121212] transition-all duration-300 ${
                menuOpen ? 'opacity-0 top-[16px]' : 'top-[16px]'
              }`}
            />
            <span
              className={`absolute left-[4px] h-[1.5px] w-6 bg-[#121212] transition-all duration-300 ${
                menuOpen ? 'top-[16px] -rotate-45' : 'top-[22px]'
              }`}
            />
          </button>
        </div>
      </nav>

      {/* Mobile navigation drawer overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-40 bg-[#fbf9f1]/98 backdrop-blur-xl lg:hidden flex flex-col justify-center px-8"
          >
            <div className="flex flex-col gap-6 max-w-sm mx-auto w-full">
              <span className="text-[#C5A059] font-label text-[9px] tracking-[0.3em] uppercase block mb-1 font-semibold">
                EXPLORE VAULT SERVICES
              </span>
              
              {ALL_SERVICES.map((link, idx) => {
                const isActive = link.route === currentPage
                return (
                  <motion.div
                    key={link.route}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + idx * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link
                      to={link.route}
                      onClick={() => setMenuOpen(false)}
                      className={`font-display text-2xl tracking-wide flex items-center gap-3 transition-colors duration-300 ${
                        isActive ? 'text-[#C5A059] font-medium' : 'text-[#121212] hover:text-[#C5A059]'
                      }`}
                    >
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                      )}
                      {link.label}
                    </Link>
                  </motion.div>
                )
              })}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + ALL_SERVICES.length * 0.06, duration: 0.5 }}
                className="h-px bg-charcoal-deep/10 my-2"
              />

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + ALL_SERVICES.length * 0.06, duration: 0.6 }}
                className="flex flex-col gap-4"
              >
                <Link
                  to="/"
                  onClick={() => setMenuOpen(false)}
                  className="font-label text-[10px] tracking-[0.2em] uppercase text-[#444748] hover:text-[#121212]"
                >
                  ← BACK TO THE VAULT
                </Link>
                <Link
                  to="/inquire"
                  onClick={() => setMenuOpen(false)}
                  className="btn-primary text-center text-xs py-3.5 mt-2 rounded-[2px]"
                >
                  Inquire →
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page content ───────────────────────────────────────────────── */}
      <main className="pt-32 md:pt-48 pb-24 px-4 md:px-20 max-w-[1440px] mx-auto">
        {children}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="w-full py-16 bg-gradient-to-t from-[#E5DACE]/20 to-transparent flex flex-col md:flex-row justify-between items-center px-6 md:px-20 gap-8">
        <div className="font-[Playfair_Display] text-[32px] leading-[40px] text-[#121212]">
          CINEGEM
        </div>
        <div className="font-[Manrope] text-[16px] leading-[24px] text-[#444748] text-center md:text-left">
          © 2024 Cinegem Studio. The Art of Digital Craft.
        </div>
        <div className="flex flex-wrap justify-center gap-6 md:gap-8">
          {FOOTER_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-[Manrope] text-[12px] tracking-[0.15em] font-semibold uppercase text-[#444748] hover:text-[#C5A059] transition-colors duration-300"
              {...(link.external
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {}
              )}
            >
              {link.label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  )
}

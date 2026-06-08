import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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
  const navigate = useNavigate()

  useEffect(() => {
    document.title = `${title} — Cinegem Studio`
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [title])

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
          <div className="hidden md:flex items-center gap-8">
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
            onClick={() => navigate('/')}
            className="hidden md:block font-[Manrope] text-[12px] tracking-[0.15em] font-semibold uppercase px-6 py-3 bg-[#121212] text-[#FAF9F6] hover:bg-[#C5A059] transition-colors duration-300"
          >
            Inquire →
          </button>
        </div>
      </nav>

      {/* ── Page content ───────────────────────────────────────────────── */}
      <main className="pt-32 md:pt-48 pb-24 px-6 md:px-20 max-w-[1440px] mx-auto">
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
          {['Privacy', 'Terms', 'Instagram', 'LinkedIn'].map((label) => (
            <a
              key={label}
              href="#"
              className="font-[Manrope] text-[12px] tracking-[0.15em] font-semibold uppercase text-[#444748] hover:text-[#C5A059] transition-colors duration-300"
            >
              {label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  )
}

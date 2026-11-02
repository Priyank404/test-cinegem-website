import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FOOTER_LINKS } from '@/constants'

export const ALL_SERVICES = [
  { label: 'On-Body Visualization',  route: '/onbody'           },
  { label: 'Classic E-Commerce',     route: '/classic'          },
  { label: 'Creative Visuals',       route: '/creative-visuals' },
  { label: '3D Viewer',              route: '/3d-viewer'        },
]

const SERVICE_GROUP = {
  heading: 'Service',
  items: ALL_SERVICES,
}

const ABOUT_GROUP = {
  heading: 'About',
  items: [
    { label: 'Home', route: '/' },
  ],
}

const CONTACT_GROUP = {
  heading: 'Contact',
  items: [
    { label: 'Inquiries', route: '/inquire' },
    ...FOOTER_LINKS.filter((l) => l.external).map((l) => ({
      label: l.label,
      route: l.href,
      external: true,
    })),
  ],
}

const NAV_MENUS = [
  {
    id: 'menu',
    label: 'Menu',
    groups: [SERVICE_GROUP, ABOUT_GROUP, CONTACT_GROUP],
  },
]

const EASE_SMOOTH = [0.16, 1, 0.3, 1]

const PANEL_VARIANTS = {
  hidden:  { opacity: 0, y: -8, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
}

const COLUMN_VARIANTS = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
}

const ITEM_VARIANTS = {
  hidden:  { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_SMOOTH } },
}

function NavMegaMenu({ menus, currentPage, align = 'left', theme = 'light' }) {
  const [activeId, setActiveId] = useState(null)
  const closeTimer = useRef(null)
  const rootRef = useRef(null)

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const openMenu = (id) => {
    clearCloseTimer()
    setActiveId(id)
  }

  const scheduleClose = () => {
    clearCloseTimer()
    closeTimer.current = setTimeout(() => setActiveId(null), 150)
  }

  // Click-outside + Escape
  useEffect(() => {
    if (!activeId) return
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setActiveId(null)
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setActiveId(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [activeId])

  useEffect(() => () => clearCloseTimer(), [])

  const activeMenu = menus.find((m) => m.id === activeId) ?? null

  return (
    <div ref={rootRef} className="relative flex items-center gap-2" onMouseLeave={scheduleClose}>
      {menus.map((menu) => {
        const isOpen = menu.id === activeId
        return (
          <button
            key={menu.id}
            type="button"
            onMouseEnter={() => openMenu(menu.id)}
            onClick={() => setActiveId((v) => (v === menu.id ? null : menu.id))}
            aria-expanded={isOpen}
            aria-haspopup="true"
            className={`flex items-center gap-1.5 font-[Poppins] text-[12px] tracking-[0.15em] font-light uppercase px-4 py-2 rounded-full transition-all duration-300 ${
              isOpen
                ? theme === 'dark' ? 'bg-white/10 text-[#FCFBFA]' : 'bg-[#121212]/[0.06] text-[#121212]'
                : theme === 'dark' ? 'text-white/80 hover:text-white' : 'text-[#444748] hover:text-[#121212]'
            }`}
          >
            {menu.label}
            <motion.svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="w-3 h-3 opacity-60"
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.25, ease: EASE_SMOOTH }}
            >
              <path
                fillRule="evenodd"
                d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06z"
                clipRule="evenodd"
              />
            </motion.svg>
          </button>
        )
      })}

      {/* Shared Dropdown Panel */}
      <AnimatePresence>
        {activeMenu && (
          <motion.div
            key="mega-menu-panel"
            variants={PANEL_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.25, ease: EASE_SMOOTH }}
            onMouseEnter={clearCloseTimer}
            onMouseLeave={scheduleClose}
            className={`absolute top-full mt-2 z-50 min-w-[320px] max-w-[90vw] p-6 rounded-2xl backdrop-blur-2xl border ${
              theme === 'dark'
                ? 'bg-[#12131a]/95 border-white/15 shadow-2xl shadow-black/60 text-[#FCFBFA]'
                : 'bg-[#fbf9f1]/95 border-white/40 shadow-2xl shadow-[#121212]/10 text-[#121212]'
            } ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeMenu.id}
                variants={COLUMN_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="flex gap-10 md:gap-14 justify-start items-start"
              >
                {activeMenu.groups.map((group) => (
                  <div key={group.heading} className="flex flex-col gap-3 min-w-[120px]">
                    {group.heading && (
                      <span className="text-[#C5A059] font-[Poppins] text-[10px] tracking-[0.25em] uppercase font-light block mb-1">
                        {group.heading}
                      </span>
                    )}
                    <div className="flex flex-col gap-1 -mx-3">
                      {group.items.map((item) => {
                        const isItemActive = item.route === currentPage
                        const itemClassName = `font-[Poppins] text-[13px] font-light flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 -my-0.5 transition-colors duration-200 ${
                          theme === 'dark'
                            ? isItemActive ? 'text-[#C5A059] bg-white/5' : 'text-white/80 hover:text-[#C5A059] hover:bg-white/5'
                            : isItemActive ? 'text-[#C5A059]' : 'text-[#121212]/80 hover:text-[#C5A059] hover:bg-[#121212]/[0.05]'
                        }`
                        return (
                          <motion.div key={item.route} variants={ITEM_VARIANTS}>
                            {item.external ? (
                              <a
                                href={item.route}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setActiveId(null)}
                                className={itemClassName}
                              >
                                {item.label}
                              </a>
                            ) : (
                              <Link
                                to={item.route}
                                onClick={() => setActiveId(null)}
                                className={itemClassName}
                              >
                                {isItemActive && <span className="w-1 h-1 shrink-0 rounded-full bg-[#C5A059]" />}
                                {item.label}
                              </Link>
                            )}
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function ServiceHeader({ currentPage = '', navRef, alwaysVisible = false, theme = 'light' }) {
  const [showHeader, setShowHeader] = useState(alwaysVisible)
  const [menuOpen, setMenuOpen] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    if (alwaysVisible) {
      setShowHeader(true)
      return
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      // Threshold to clear the hero section (roughly viewport height minus header height)
      const heroHeight = window.innerHeight - 100
      
      if (currentScrollY < heroHeight) {
        // Inside the hero section -> always hide the header
        setShowHeader(false)
      } else if (currentScrollY > lastScrollY.current) {
        // Scrolling down -> hide header
        setShowHeader(false)
      } else {
        // Scrolling up -> show header
        setShowHeader(true)
      }
      
      lastScrollY.current = currentScrollY
    }

    // Run initially in case page loaded scrolled down
    handleScroll()

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [alwaysVisible])

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

  return (
    <>
      {/* ── Navigation Header ─────────────────────────────────────────────── */}
      <nav
        ref={navRef}
        className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-500 border-b ${
          showHeader || menuOpen
            ? theme === 'dark'
              ? 'translate-y-0 opacity-100 pointer-events-auto backdrop-blur-xl bg-[#0c0d16]/80 border-white/10 shadow-lg'
              : 'translate-y-0 opacity-100 pointer-events-auto backdrop-blur-xl bg-[#fbf9f1]/80 border-white/30 shadow-sm'
            : '-translate-y-full opacity-0 pointer-events-none bg-transparent border-transparent'
        }`}
      >
        <div className="grid grid-cols-3 items-center px-4 sm:px-6 md:px-20 max-w-[1440px] mx-auto h-16 sm:h-20">
          {/* Left spacer — keeps the logo mathematically centered */}
          <div aria-hidden="true" />

          {/* Logo → back to vault, centered */}
          <div className="flex justify-center items-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center transition-opacity duration-300 hover:opacity-80 focus:outline-none"
              aria-label="Cinegem Studio — Return to Home"
            >
              <img
                src={theme === 'dark' ? '/logo-white.png' : '/logo-dark.png'}
                alt="Cinegem Studio"
                className="h-9 sm:h-11 md:h-12 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Right — single "Menu" trigger (desktop) + hamburger (mobile) */}
          <div className="flex justify-end items-center">
            <div className="hidden lg:block">
              <NavMegaMenu menus={NAV_MENUS} currentPage={currentPage} align="right" theme={theme} />
            </div>

            {/* Mobile hamburger menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 lg:hidden z-50 relative focus:outline-none pointer-events-auto cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              <span
                className={`absolute left-[4px] h-[1.5px] w-6 transition-all duration-300 ${
                  theme === 'dark' ? 'bg-[#FCFBFA]' : 'bg-[#121212]'
                } ${
                  menuOpen ? 'top-[16px] rotate-45' : 'top-[10px]'
                }`}
              />
              <span
                className={`absolute left-[4px] h-[1.5px] w-6 transition-all duration-300 ${
                  theme === 'dark' ? 'bg-[#FCFBFA]' : 'bg-[#121212]'
                } ${
                  menuOpen ? 'opacity-0 top-[16px]' : 'top-[16px]'
                }`}
              />
              <span
                className={`absolute left-[4px] h-[1.5px] w-6 transition-all duration-300 ${
                  theme === 'dark' ? 'bg-[#FCFBFA]' : 'bg-[#121212]'
                } ${
                  menuOpen ? 'top-[16px] -rotate-45' : 'top-[22px]'
                }`}
              />
            </button>
          </div>
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
            className={`fixed inset-0 z-40 lg:hidden flex flex-col justify-center px-8 backdrop-blur-xl ${
              theme === 'dark' ? 'bg-[#0c0d16]/98 text-[#FCFBFA]' : 'bg-[#fbf9f1]/98 text-[#121212]'
            }`}
          >
            <div className="flex flex-col gap-6 max-w-sm mx-auto w-full">
              <span className="text-[#C5A059] font-[Poppins] text-[9px] tracking-[0.3em] uppercase block mb-1 font-light">
                EXPLORE STUDIO SERVICES
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
                      className={`font-[Poppins] font-semibold text-2xl tracking-wide flex items-center gap-3 transition-colors duration-300 ${
                        isActive ? 'text-[#C5A059]' : theme === 'dark' ? 'text-[#FCFBFA] hover:text-[#C5A059]' : 'text-[#121212] hover:text-[#C5A059]'
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
                className={`h-px my-2 ${theme === 'dark' ? 'bg-white/15' : 'bg-[#121212]/10'}`}
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
                  className={`font-[Poppins] text-[10px] tracking-[0.2em] uppercase font-light ${
                    theme === 'dark' ? 'text-white/70 hover:text-white' : 'text-[#444748] hover:text-[#121212]'
                  }`}
                >
                  ← BACK TO HOME
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
    </>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FOOTER_LINKS } from '@/constants'

export const ALL_SERVICES = [
  { label: 'Classic E-Commerce',     route: '/classic'          },
  { label: 'Creative Visuals',       route: '/creative-visuals' },
  { label: 'On-Body Visuals',        route: '/onbody'           },
  { label: '3D Viewer',              route: '/3d-viewer'        },
]

const SERVICE_GROUP = {
  heading: 'Services',
  items: ALL_SERVICES,
}

const ABOUT_GROUP = {
  heading: 'About',
  items: [
    { label: 'FAQ', route: '/faq' },
  ],
}

const CONTACT_GROUP = {
  heading: 'Contact',
  items: [
    { label: 'Inquiry', route: '/inquire' },
    { label: 'info@cinegemstudio.com', route: 'mailto:info@cinegemstudio.com', external: true },
    { label: '+91 98765 43210', route: 'tel:+919876543210', external: true },
  ],
}

const SOCIALS_GROUP = {
  heading: 'Socials',
  items: [
    {
      label: 'Instagram',
      route: 'https://www.instagram.com/cinegemstudio?igsh=MXd5dzQ0OGF2enBjdg==',
      external: true,
    },
    {
      label: 'Behance',
      route: 'https://www.behance.net/cinegem-studio/projects',
      external: true,
    },
  ],
}

const NAV_MENUS = [
  {
    id: 'menu',
    label: 'Menu',
    groups: [SERVICE_GROUP, ABOUT_GROUP, CONTACT_GROUP, SOCIALS_GROUP],
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
                className="flex gap-6 md:gap-8 justify-start items-start"
              >
                {activeMenu.groups.map((group) => (
                  <div key={group.heading} className="flex flex-col gap-2.5 min-w-0">
                    {group.heading && (
                      <span className={`font-[Poppins] text-[10px] tracking-[0.25em] uppercase font-light block mb-1 ${
                        theme === 'dark' ? 'text-white/40' : 'text-[#121212]/40'
                      }`}>
                        {group.heading}
                      </span>
                    )}
                    <div className="flex flex-col gap-1.5 -mx-2.5">
                      {group.items.map((item) => {
                        const isItemActive = item.route === currentPage
                        const isMailOrTel = item.route.startsWith('mailto:') || item.route.startsWith('tel:')
                        const itemClassName = `w-full font-[Poppins] text-[13px] font-light flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 transition-colors duration-150 ${
                          theme === 'dark'
                            ? isItemActive ? 'text-[#C5A059] bg-white/10' : 'text-white/80 hover:text-[#C5A059] hover:bg-white/10'
                            : isItemActive ? 'text-[#C5A059] bg-[#121212]/[0.06]' : 'text-[#121212]/80 hover:text-[#C5A059] hover:bg-[#121212]/[0.06]'
                        }`
                        return (
                          <motion.div key={item.route} variants={ITEM_VARIANTS}>
                            {item.external ? (
                              <a
                                href={item.route}
                                target={isMailOrTel ? undefined : '_blank'}
                                rel={isMailOrTel ? undefined : 'noopener noreferrer'}
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
  const [isHovered, setIsHovered] = useState(false)
  const isHoveredRef = useRef(false)
  const leaveTimerRef = useRef(null)
  const internalNavRef = useRef(null)
  const lastScrollY = useRef(0)

  useEffect(() => {
    isHoveredRef.current = isHovered
  }, [isHovered])

  // Reveal header when mouse hovers within the top header area (top 80px) or over the nav / mega menu dropdown
  useEffect(() => {
    if (alwaysVisible) return

    const handleMouseMove = (e) => {
      const isOverHeaderArea = e.clientY <= 80 || Boolean(internalNavRef.current?.contains(e.target))

      if (isOverHeaderArea) {
        if (leaveTimerRef.current) {
          clearTimeout(leaveTimerRef.current)
          leaveTimerRef.current = null
        }
        if (!isHoveredRef.current) {
          setIsHovered(true)
        }
      } else if (isHoveredRef.current) {
        if (!leaveTimerRef.current) {
          leaveTimerRef.current = setTimeout(() => {
            setIsHovered(false)
            leaveTimerRef.current = null
          }, 150)
        }
      }
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current)
        leaveTimerRef.current = null
      }
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [alwaysVisible])

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
        ref={(node) => {
          internalNavRef.current = node
          if (typeof navRef === 'function') {
            navRef(node)
          } else if (navRef) {
            navRef.current = node
          }
        }}
        onMouseEnter={() => {
          if (leaveTimerRef.current) {
            clearTimeout(leaveTimerRef.current)
            leaveTimerRef.current = null
          }
          setIsHovered(true)
        }}
        onMouseLeave={(e) => {
          if (e.clientY > 80 && !menuOpen) {
            if (!leaveTimerRef.current) {
              leaveTimerRef.current = setTimeout(() => {
                setIsHovered(false)
                leaveTimerRef.current = null
              }, 150)
            }
          }
        }}
        className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-500 border-b ${
          showHeader || menuOpen || isHovered
            ? menuOpen
              ? 'translate-y-0 opacity-100 pointer-events-auto backdrop-blur-xl bg-[#0c0d16]/95 border-white/10 shadow-lg'
              : theme === 'dark'
                ? 'translate-y-0 opacity-100 pointer-events-auto backdrop-blur-xl bg-[#0c0d16]/80 border-white/10 shadow-lg'
                : 'translate-y-0 opacity-100 pointer-events-auto backdrop-blur-xl bg-[#fbf9f1]/80 border-white/30 shadow-sm'
            : '-translate-y-full opacity-0 pointer-events-none bg-transparent border-transparent'
        }`}
      >
        <div className="grid grid-cols-3 items-center px-6 sm:px-8 md:px-12 w-full mx-auto h-16 sm:h-20">
          {/* Left spacer — keeps the logo mathematically centered */}
          <div aria-hidden="true" />

          {/* Logo → back to vault, centered */}
          <div className="flex justify-center items-center pt-1">
            <Link
              to="/"
              className="inline-flex items-center justify-center transition-opacity duration-300 hover:opacity-80 focus:outline-none"
              aria-label="Cinegem Studio — Return to Home"
            >
              <img
                src={menuOpen || theme === 'dark' ? '/logo-white.png' : '/logo-dark.png'}
                alt="Cinegem Studio"
                className="h-10 sm:h-12 md:h-[53px] w-auto object-contain"
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
                  menuOpen
                    ? 'bg-[#FCFBFA] top-[16px] rotate-45'
                    : `${theme === 'dark' ? 'bg-[#FCFBFA]' : 'bg-[#121212]'} top-[10px]`
                }`}
              />
              <span
                className={`absolute left-[4px] h-[1.5px] w-6 transition-all duration-300 ${
                  menuOpen
                    ? 'opacity-0 top-[16px] bg-[#FCFBFA]'
                    : `${theme === 'dark' ? 'bg-[#FCFBFA]' : 'bg-[#121212]'} top-[16px]`
                }`}
              />
              <span
                className={`absolute left-[4px] h-[1.5px] w-6 transition-all duration-300 ${
                  menuOpen
                    ? 'bg-[#FCFBFA] top-[16px] -rotate-45'
                    : `${theme === 'dark' ? 'bg-[#FCFBFA]' : 'bg-[#121212]'} top-[22px]`
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
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 lg:hidden flex flex-col justify-center px-8 bg-[#0c0d16]/95 backdrop-blur-2xl text-[#FCFBFA]"
          >
            <div className="flex flex-col gap-5 max-w-xs mx-auto w-full pt-8">
              <span className="text-white/40 font-[Poppins] text-[10px] tracking-[0.3em] uppercase block font-light">
                STUDIO SERVICES
              </span>

              <div className="flex flex-col gap-2">
                {ALL_SERVICES.map((link, idx) => {
                  const isActive = link.route === currentPage
                  return (
                    <motion.div
                      key={link.route}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 + idx * 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <Link
                        to={link.route}
                        onClick={() => setMenuOpen(false)}
                        className={`font-[Poppins] text-lg tracking-wide flex items-center gap-3 transition-colors duration-200 py-1.5 ${
                          isActive
                            ? 'text-[#C5A059] font-medium'
                            : 'text-white/85 hover:text-[#C5A059] font-light'
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
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="h-px bg-white/10 my-1"
              />

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.45 }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center justify-between text-[11px] tracking-[0.2em] uppercase font-light text-white/50 px-0.5">
                  <Link
                    to="/faq"
                    onClick={() => setMenuOpen(false)}
                    className="hover:text-[#C5A059] transition-colors"
                  >
                    FAQ
                  </Link>
                  <a
                    href="mailto:info@cinegemstudio.com"
                    className="hover:text-[#C5A059] transition-colors normal-case tracking-normal text-xs text-white/40"
                  >
                    info@cinegemstudio.com
                  </a>
                </div>

                <Link
                  to="/inquire"
                  onClick={() => setMenuOpen(false)}
                  className="btn-primary text-center text-xs py-3.5 rounded-[2px] tracking-[0.15em]"
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

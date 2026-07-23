import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FOOTER_LINKS } from '@/constants'

export const ALL_SERVICES = [
  { label: 'On-Body Visualization',  route: '/onbody'           },
  { label: 'Classic E-Commerce',     route: '/classic'          },
  { label: 'Creative Visuals',       route: '/creative-visuals' },
  { label: 'Hero 2',                 route: '/hero2'            },
]

const SERVICE_GROUP = {
  heading: 'Service',
  items: ALL_SERVICES,
}

const ABOUT_GROUP = {
  heading: 'About',
  items: [
    { label: 'The Vault', route: '/' },
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

function NavMegaMenu({ menus, currentPage, align = 'left' }) {
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
            className={`flex items-center gap-1.5 font-[Manrope] text-[12px] tracking-[0.15em] font-semibold uppercase px-4 py-2 rounded-full transition-all duration-300 ${
              isOpen
                ? 'bg-[#121212]/[0.06] text-[#121212]'
                : 'text-[#444748] hover:text-[#121212]'
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
            className={`absolute top-full mt-2 z-50 min-w-[320px] max-w-[90vw] p-6 rounded-2xl bg-[#fbf9f1]/95 backdrop-blur-2xl border border-white/40 shadow-2xl shadow-[#121212]/10 ${
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
                      <span className="text-[#C5A059] font-[Manrope] text-[10px] tracking-[0.25em] uppercase font-bold block mb-1">
                        {group.heading}
                      </span>
                    )}
                    <div className="flex flex-col gap-1 -mx-3">
                      {group.items.map((item) => {
                        const isItemActive = item.route === currentPage
                        const itemClassName = `font-[Manrope] text-[13px] font-medium flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 -my-0.5 transition-colors duration-200 hover:bg-[#121212]/[0.05] ${
                          isItemActive ? 'text-[#C5A059]' : 'text-[#121212]/80 hover:text-[#C5A059]'
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

export function ServiceHeader({ currentPage = '', navRef, alwaysVisible = true }) {
  const [scrolled, setScrolled] = useState(alwaysVisible)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (alwaysVisible) return
    setScrolled(window.scrollY > 50)
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
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
        className={`fixed top-0 w-full z-50 transition-all duration-500 border-b ${
          scrolled || menuOpen || alwaysVisible
            ? 'translate-y-0 opacity-100 pointer-events-auto backdrop-blur-xl bg-[#fbf9f1]/80 border-white/30 shadow-sm'
            : '-translate-y-full opacity-0 pointer-events-none bg-transparent border-white/20'
        }`}
      >
        <div className="grid grid-cols-3 items-center px-6 md:px-20 max-w-[1440px] mx-auto h-20">
          {/* Left spacer — keeps the logo mathematically centered */}
          <div aria-hidden="true" />

          {/* Logo → back to vault, centered */}
          <div className="flex justify-center">
            <Link
              to="/"
              className="font-[Playfair_Display] text-[32px] leading-[40px] tracking-tighter text-[#121212] hover:text-[#C5A059] transition-colors duration-300"
            >
              CINEGEM
            </Link>
          </div>

          {/* Right — single "Menu" trigger (desktop) + hamburger (mobile) */}
          <div className="flex justify-end items-center">
            <div className="hidden lg:block">
              <NavMegaMenu menus={NAV_MENUS} currentPage={currentPage} align="right" />
            </div>

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
              <span className="text-[#C5A059] font-[Manrope] text-[9px] tracking-[0.3em] uppercase block mb-1 font-semibold">
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
                      className={`font-[Playfair_Display] text-2xl tracking-wide flex items-center gap-3 transition-colors duration-300 ${
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
                className="h-px bg-[#121212]/10 my-2"
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
                  className="font-[Manrope] text-[10px] tracking-[0.2em] uppercase text-[#444748] hover:text-[#121212]"
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
    </>
  )
}

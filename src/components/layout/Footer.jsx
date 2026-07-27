import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

export function Footer() {
  const footerRef = useRef(null)
  const [footerHeight, setFooterHeight] = useState(0)

  useEffect(() => {
    if (!footerRef.current) return

    // Update height on mount and resize
    const updateHeight = () => {
      if (footerRef.current) {
        setFooterHeight(footerRef.current.offsetHeight)
      }
    }

    const resizeObserver = new ResizeObserver(updateHeight)
    resizeObserver.observe(footerRef.current)

    // Scroll handler for reveal translation
    const handleScroll = () => {
      if (!footerRef.current) return
      
      const docHeight = document.documentElement.scrollHeight
      const winHeight = window.innerHeight
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const scrollRemaining = docHeight - winHeight - scrollTop

      const height = footerRef.current.offsetHeight || 200
      // On mobile view (< 768px), start the footer reveal animation ONLY after
      // the end of page content (when scrollRemaining is within the footer spacer).
      const isMobile = window.innerWidth < 768
      const triggerRange = isMobile ? height * 0.85 : height * 1.3
      
      // Calculate progress: 0 (footer hidden) to 1 (footer fully revealed)
      const progress = Math.min(1, Math.max(0, 1 - (scrollRemaining / triggerRange)))
      
      footerRef.current.style.transform = `translateY(${(1 - progress) * 100}%)`
      footerRef.current.style.pointerEvents = progress > 0.5 ? 'auto' : 'none'
    }

    // Initial triggers
    updateHeight()
    handleScroll()

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [])

  return (
    <>
      {/* Spacer that pushes the content up by the height of the footer */}
      <div 
        className="hero2-footer-spacer" 
        style={{ 
          height: `${footerHeight}px`,
          width: '100%',
          pointerEvents: 'none'
        }} 
      />

      {/* The actual reveal footer container */}
      <footer 
        ref={footerRef}
        className="hero2-static-footer"
        style={{ 
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
          transform: 'translateY(100%)',
          pointerEvents: 'none',
          transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div className="hero2-footer-inner">
          <div className="hero2-footer-top">
            <div className="hero2-footer-brand">
              <span className="hero2-logo">Cinegem Studio</span>
              <p>
                The Art of Digital Craft. Luxury jewellery rendering, 3D
                visualization, and cinematic animation.
              </p>
              <Link to="/inquire" className="hero2-cta-btn">
                Inquire →
              </Link>
            </div>

            <div className="hero2-footer-col">
              <span className="hero2-footer-col-title">Services</span>
              <Link to="/classic">Classic E-Commerce</Link>
              <Link to="/creative-visuals">Creative Visuals</Link>
              <Link to="/onbody">On-Body Visualization</Link>
              <Link to="/3d-viewer">Interactive 3D Engine</Link>
            </div>

            <div className="hero2-footer-col">
              <span className="hero2-footer-col-title">Connect</span>
              <Link to="/inquire">Inquiries</Link>
              <a
                href="https://www.instagram.com/cinegemstudio?igsh=MXd5dzQ0OGF2enBjdg=="
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram
              </a>
              <a
                href="https://www.behance.net/cinegem-studio/projects"
                target="_blank"
                rel="noopener noreferrer"
              >
                Behance
              </a>
              <a href="mailto:hello@cinegemstudio.com">Email</a>
            </div>
          </div>

          <div className="hero2-footer-bottom">
            <p className="hero2-footer-copyright">
              © {new Date().getFullYear()} Cinegem Studio. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  )
}

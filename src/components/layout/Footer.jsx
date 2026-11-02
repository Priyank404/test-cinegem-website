import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="hero2-static-footer relative z-10 w-full">
      <div className="hero2-footer-inner">
        <div className="hero2-footer-top">
          <div className="hero2-footer-brand">
            <span className="hero2-logo">Cinegem Studio</span>
            <p>
              High jewellery rendering, photorealistic 3D visualization, and
              cinematic animation for the world's finest maisons.
            </p>
            <Link to="/inquire" className="hero2-cta-btn">
              Inquire →
            </Link>
          </div>

          <div className="hero2-footer-links-grid">
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
              <Link to="/faq">FAQ</Link>
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
              <a href="mailto:info@cinegemstudio.com">Email</a>
            </div>
          </div>
        </div>

        <div className="hero2-footer-bottom">
          <p className="hero2-footer-copyright">
            © {new Date().getFullYear()} Cinegem Studio. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

import ZoomBlurSlider from '@/components/three/ZoomBlurSlider'

/**
 * HeroVault Section
 * Renders the fullscreen interactive WebGL Zoom-Blur image slider.
 * Users scroll or use keyboard arrows to transition between gallery collections.
 * Double-clicking or clicking the CTA enters the collection subpages.
 */
export function HeroVault({ onNavigate }) {
  return (
    <section
      id="vault"
      className="relative w-full h-screen overflow-hidden bg-[#ebe1d5]"
      aria-label="Cinegem Studio — Vault Gallery"
    >
      <ZoomBlurSlider onNavigate={onNavigate} />
    </section>
  )
}

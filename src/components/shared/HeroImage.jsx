/**
 * HeroImage
 * Full-width hero image with an optional glass chip overlay.
 *
 * Props:
 *   src    – image URL or import
 *   alt    – accessible description
 *   chips  – array of strings shown in the glass chip (e.g. ['8K Resolution', 'Raytraced'])
 *   title  – optional title overlay (bottom-left, mix-blend-difference)
 *   subtitle – optional subtitle below title
 *   aspectRatio – tailwind class (default "aspect-[21/9]")
 */
export function HeroImage({
  src,
  alt = '',
  chips = [],
  title,
  subtitle,
  aspectRatio = 'aspect-square md:aspect-[21/9]',
}) {
  return (
    <section className="mb-24 md:mb-40">
      <div
        className={`relative w-full ${aspectRatio} overflow-hidden gallery-shadow bg-[#f5f4ec] flex items-center justify-center group`}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105"
        />

        {/* Glass chip — bottom left */}
        {chips.length > 0 && (
          <div className="absolute bottom-8 left-8 glass-panel px-6 py-4 rounded-sm flex items-center gap-4 z-10">
            {chips.map((chip, i) => (
              <span key={chip} className="flex items-center gap-4">
                {i > 0 && <div className="w-1 h-1 bg-[#121212] rounded-full" />}
                <span className="font-[Manrope] text-[12px] tracking-[0.15em] font-semibold uppercase text-[#121212]">
                  {chip}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Title overlay — bottom left, mix-blend */}
        {title && (
          <div className="absolute bottom-8 left-8 z-20 mix-blend-difference text-white">
            {subtitle && (
              <p className="font-[Manrope] text-[12px] tracking-[0.15em] font-semibold uppercase mb-2 opacity-80">
                {subtitle}
              </p>
            )}
            <h2 className="font-[Playfair_Display] text-[32px] leading-[40px]">{title}</h2>
          </div>
        )}
      </div>
    </section>
  )
}

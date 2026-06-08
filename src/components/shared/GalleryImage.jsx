/**
 * GalleryImage
 * A single gallery card. Add new images by passing different src/alt/label props.
 *
 * Props:
 *   src         – image URL or import
 *   alt         – accessible description
 *   label       – hover caption (optional)
 *   className   – extra classes for sizing / layout
 *   grayscale   – start in grayscale and reveal on hover
 *   aspectRatio – tailwind aspect-ratio class e.g. "aspect-square"
 *   onClick     – called when card is clicked (for lightbox integration)
 */
export function GalleryImage({
  src,
  alt = '',
  label,
  className = '',
  grayscale = false,
  aspectRatio = '',
  onClick,
}) {
  return (
    <div
      className={`relative group overflow-hidden bg-[#f5f4ec] gallery-shadow gallery-image-hover transition-all duration-500 ease-out ${aspectRatio} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-105
          ${grayscale ? 'filter grayscale group-hover:grayscale-0 transition-all duration-700' : ''}`}
      />
      {label && (
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-8">
          <span className="font-[Manrope] text-[12px] leading-[16px] tracking-[0.15em] font-semibold uppercase text-[#FAF9F6]">
            {label}
          </span>
        </div>
      )}
      {/* Zoom-in icon hint on hover */}
      {onClick && (
        <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
          </svg>
        </div>
      )}
    </div>
  )
}

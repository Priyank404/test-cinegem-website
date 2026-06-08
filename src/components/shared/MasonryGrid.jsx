import { GalleryImage } from './GalleryImage'

/**
 * MasonryGrid
 * Renders a 2-column masonry grid of GalleryImage cards.
 * To add images: push objects to the `images` array in gallery.js.
 *
 * Props:
 *   images       – array of { src, alt, label }
 *   cols         – number of columns (default 2)
 *   onImageClick – optional (index) => void for lightbox integration
 */
export function MasonryGrid({ images = [], cols = 2, onImageClick }) {
  const colClass = {
    1: 'columns-1',
    2: 'columns-1 md:columns-2',
    3: 'columns-1 md:columns-2 lg:columns-3',
  }[cols] ?? 'columns-1 md:columns-2'

  return (
    <section className={`${colClass} gap-8 space-y-8`}>
      {images.map((img, i) => (
        <div key={i} className="break-inside-avoid">
          <GalleryImage
            src={img.src}
            alt={img.alt}
            label={img.label}
            onClick={onImageClick ? () => onImageClick(i) : undefined}
          />
        </div>
      ))}
    </section>
  )
}

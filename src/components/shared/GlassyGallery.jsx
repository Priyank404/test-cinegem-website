import { useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * GlassyGallery
 * Minimal, full-screen frosted glass lightbox gallery for Cinegem Studio.
 *
 * Full-bleed glassy backdrop over the page without border radius.
 * No inner glassy box around the media.
 * No counter or category labels.
 */
export default function GlassyGallery({
  images = [],
  activeIndex = null,
  onClose,
  onSelect,
}) {
  const overlayRef = useRef(null);
  const isOpen = activeIndex !== null && activeIndex >= 0 && activeIndex < images.length;

  const current = isOpen ? images[activeIndex] : null;
  const currentSrc = typeof current === "string" ? current : current?.src;
  const currentAlt = typeof current === "string" ? "" : current?.alt || "";
  const isVideo =
    typeof current === "object"
      ? Boolean(current?.isVideo || current?.type === "video" || currentSrc?.match(/\.(mp4|webm)($|\?)/i))
      : Boolean(currentSrc?.match(/\.(mp4|webm)($|\?)/i));

  const hasPrev = isOpen && activeIndex > 0;
  const hasNext = isOpen && activeIndex < images.length - 1;

  const handlePrev = useCallback(() => {
    if (onSelect && activeIndex > 0) {
      onSelect(activeIndex - 1);
    }
  }, [onSelect, activeIndex]);

  const handleNext = useCallback(() => {
    if (onSelect && activeIndex < images.length - 1) {
      onSelect(activeIndex + 1);
    }
  }, [onSelect, activeIndex, images.length]);

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || !currentSrc) return null;

  return createPortal(
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose?.();
      }}
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-between p-4 sm:p-6 md:p-8 select-none animate-fadeIn cursor-default rounded-none"
      style={{
        background: "rgba(10, 10, 16, 0.72)",
        backdropFilter: "blur(32px) saturate(190%)",
        WebkitBackdropFilter: "blur(32px) saturate(190%)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Image gallery"
    >
      {/* ── Top-Right Close Button ── */}
      <button
        onClick={onClose}
        type="button"
        aria-label="Close gallery"
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-40 w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all cursor-pointer shadow-lg active:scale-95"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* ── Center Stage: Clean Floating Media & Nav Arrows ── */}
      <div className="relative flex-1 w-full max-w-7xl flex items-center justify-center min-h-0 my-auto">
        {/* Previous Button */}
        {hasPrev && (
          <button
            onClick={handlePrev}
            type="button"
            aria-label="Previous image"
            className="absolute left-2 sm:left-4 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/25 border border-white/20 text-white transition-all cursor-pointer shadow-2xl backdrop-blur-md active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Direct Floating Media (No inner card box) */}
        {isVideo ? (
          <video
            key={currentSrc}
            src={currentSrc}
            controls
            autoPlay
            loop
            playsInline
            className="max-h-[78vh] sm:max-h-[82vh] max-w-[92vw] sm:max-w-[86vw] object-contain select-none shadow-2xl rounded-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <img
            key={currentSrc}
            src={currentSrc}
            alt={currentAlt}
            className="max-h-[78vh] sm:max-h-[82vh] max-w-[92vw] sm:max-w-[86vw] object-contain select-none shadow-2xl rounded-none animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Next Button */}
        {hasNext && (
          <button
            onClick={handleNext}
            type="button"
            aria-label="Next image"
            className="absolute right-2 sm:right-4 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/25 border border-white/20 text-white transition-all cursor-pointer shadow-2xl backdrop-blur-md active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Bottom Bar: Clean Minimal Thumbnails (No pill capsule box) ── */}
      {images.length > 1 && (
        <div className="w-full max-w-5xl flex justify-center py-2 px-2 z-20">
          <div
            className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto max-w-full px-2 py-1 scrollbar-none"
            style={{ scrollbarWidth: "none" }}
          >
            {images.map((img, i) => {
              const src = typeof img === "string" ? img : img.thumb || img.src;
              const isItemVideo =
                typeof img === "object"
                  ? Boolean(img?.isVideo || img?.type === "video" || src?.match(/\.(mp4|webm)($|\?)/i))
                  : Boolean(src?.match(/\.(mp4|webm)($|\?)/i));
              const isActive = i === activeIndex;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelect?.(i)}
                  aria-label={`Jump to item ${i + 1}`}
                  className={`relative shrink-0 w-11 h-11 sm:w-13 sm:h-13 overflow-hidden transition-all cursor-pointer rounded-none ${
                    isActive
                      ? "ring-1.5 ring-white/90 opacity-100"
                      : "opacity-35 hover:opacity-75 border border-white/10"
                  }`}
                >
                  {isItemVideo ? (
                    <div className="w-full h-full relative bg-neutral-900 flex items-center justify-center">
                      <video
                        src={src}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover select-none pointer-events-none"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white/90" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover select-none"
                      loading="lazy"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

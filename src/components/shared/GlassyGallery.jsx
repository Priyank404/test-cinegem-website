import { useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * GlassyGallery
 * High-end frosted glass lightbox gallery modal for Cinegem Studio.
 *
 * Props:
 *   images: Array of { src, alt, label, thumb, isVideo } or strings
 *   activeIndex: number | null (null = closed)
 *   onClose: () => void
 *   onSelect: (index: number) => void
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
  const currentLabel = typeof current === "string" ? "" : current?.label || "";
  const isVideo = typeof current === "object" && Boolean(current?.isVideo || currentSrc?.endsWith(".mp4") || currentSrc?.endsWith(".webm"));

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
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-between p-3 sm:p-6 md:p-8 bg-black/80 backdrop-blur-2xl select-none animate-fadeIn cursor-default"
      role="dialog"
      aria-modal="true"
      aria-label="Image gallery"
    >
      {/* ── Top Bar: Counter & Close Button ── */}
      <div className="w-full max-w-7xl flex items-center justify-between py-2 px-2 sm:px-4 z-20">
        <span className="font-[Poppins] text-xs md:text-sm font-light tracking-[0.2em] uppercase text-white/60">
          <span className="text-[#C5A059] font-medium">{activeIndex + 1}</span> / {images.length}
        </span>

        {currentLabel && (
          <span className="hidden sm:inline-block font-[Poppins] text-xs tracking-[0.18em] uppercase text-white/50">
            {currentLabel}
          </span>
        )}

        <button
          onClick={onClose}
          type="button"
          aria-label="Close gallery"
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all cursor-pointer shadow-lg active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Center Stage: Main Glass Card & Nav Arrows ── */}
      <div className="relative flex-1 w-full max-w-7xl flex items-center justify-center min-h-0 my-2 sm:my-4">
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

        {/* Floating Glass Showcase Container */}
        <div
          className="glassy-container relative flex items-center justify-center p-2 sm:p-4 md:p-6 rounded-2xl max-w-full max-h-full overflow-hidden shadow-2xl"
          style={{
            background: "rgba(14, 14, 18, 0.65)",
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {isVideo ? (
            <video
              key={currentSrc}
              src={currentSrc}
              controls
              autoPlay
              loop
              playsInline
              className="max-h-[65vh] sm:max-h-[70vh] md:max-h-[74vh] max-w-full object-contain rounded-xl select-none"
            />
          ) : (
            <img
              key={currentSrc}
              src={currentSrc}
              alt={currentAlt}
              className="max-h-[65vh] sm:max-h-[70vh] md:max-h-[74vh] max-w-full object-contain rounded-xl select-none animate-fadeIn"
            />
          )}
        </div>

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

      {/* ── Bottom Bar: Glassy Thumbnail Capsule Strip ── */}
      {images.length > 1 && (
        <div className="w-full max-w-5xl flex justify-center py-2 px-2 z-20">
          <div
            className="flex items-center gap-2 sm:gap-3 overflow-x-auto max-w-full px-4 py-2.5 rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/10 scrollbar-none shadow-xl"
            style={{ scrollbarWidth: "none" }}
          >
            {images.map((img, i) => {
              const src = typeof img === "string" ? img : img.thumb || img.src;
              const isActive = i === activeIndex;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelect?.(i)}
                  aria-label={`Jump to image ${i + 1}`}
                  className={`relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden transition-all cursor-pointer ${
                    isActive
                      ? "ring-2 ring-[#C5A059] ring-offset-1 ring-offset-black opacity-100 scale-105"
                      : "opacity-45 hover:opacity-80 border border-white/10"
                  }`}
                >
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover select-none"
                    loading="lazy"
                  />
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

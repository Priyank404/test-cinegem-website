import GlassyGallery from "./GlassyGallery";

export { default as GlassyGallery } from "./GlassyGallery";

export function LightboxModal({ images = [], activeIndex, onClose, onPrev, onNext }) {
  const onSelect = (idx) => {
    if (idx > activeIndex && onNext) onNext();
    else if (idx < activeIndex && onPrev) onPrev();
    else if (onNext) onNext();
  };

  return (
    <GlassyGallery
      images={images}
      activeIndex={activeIndex}
      onClose={onClose}
      onSelect={onSelect}
    />
  );
}

export default LightboxModal;

// src/components/shared/MediaImage.jsx
// High-performance image component with AVIF/WebP picture elements, blur-up placeholder, and zero layout shift

import { useState } from "react";

export function MediaImage({
  item,
  alt,
  sizes = "(max-width: 768px) 100vw, 50vw",
  className = "",
  priority = false,
  style = {},
  ...rest
}) {
  const [loaded, setLoaded] = useState(false);

  if (!item) return null;

  const width = item.width;
  const height = item.height;
  const altText = alt || item.alt || item.name || "";
  const loading = priority ? "eager" : "lazy";
  const decoding = priority ? "sync" : "async";
  const fetchPriority = priority ? "high" : "auto";

  const avifSrcSet = item.srcSet?.avifString || (Array.isArray(item.srcSet?.avif) ? item.srcSet.avif.map(([u, w]) => `${u} ${w}w`).join(", ") : null);
  const webpSrcSet = item.srcSet?.webpString || (Array.isArray(item.srcSet?.webp) ? item.srcSet.webp.map(([u, w]) => `${u} ${w}w`).join(", ") : null);
  const fallbackSrc = item.src || item.full || item.thumb;

  const containerStyle = {
    ...style,
    backgroundImage: !loaded && item.blur ? `url("${item.blur}")` : style.backgroundImage,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  return (
    <picture className={`media-image-picture ${className}`.trim()} style={containerStyle}>
      {avifSrcSet && <source type="image/avif" srcSet={avifSrcSet} sizes={sizes} />}
      {webpSrcSet && <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} />}
      <img
        src={fallbackSrc}
        alt={altText}
        width={width}
        height={height}
        loading={loading}
        decoding={decoding}
        fetchpriority={priority ? "high" : undefined}
        className={className}
        onLoad={() => setLoaded(true)}
        {...rest}
      />
    </picture>
  );
}

export default MediaImage;

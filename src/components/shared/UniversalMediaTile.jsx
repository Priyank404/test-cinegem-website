// src/components/shared/UniversalMediaTile.jsx
// Flexible media tile that automatically renders either an <img /> or a <video />
// depending on the media format assigned to this position, with zero format reservation.
import React, { useRef, useEffect } from 'react';
import { isMediaVideo, normalizeMediaItem } from '@/utils/mediaPositioning';

export function UniversalMediaTile({
  media,
  alt = 'Cinegem Studio Jewellery',
  className = '',
  videoClassName = '',
  imageClassName = '',
  style,
  onClick,
  autoPlay = true,
  muted = true,
  loop = true,
  playsInline = true,
  preload = 'auto',
  videoRef: externalVideoRef,
  onLoadedMetadata,
}) {
  const localVideoRef = useRef(null);
  const activeVideoRef = externalVideoRef || localVideoRef;

  const item = normalizeMediaItem(media, alt);
  if (!item || !item.src) {
    return <div className={`bg-black/20 ${className}`} style={style} />;
  }

  const isVideo = isMediaVideo(item);

  // Auto-play safety for videos
  useEffect(() => {
    if (isVideo && activeVideoRef.current && autoPlay) {
      const playPromise = activeVideoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Ignore browser autoplay restrictions if muted policy triggers
        });
      }
    }
  }, [isVideo, item.src, autoPlay, activeVideoRef]);

  const defaultMediaClass = 'block w-full h-full object-cover';

  return (
    <div
      onClick={onClick ? () => onClick(item) : undefined}
      className={`relative overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={style}
    >
      {isVideo ? (
        <video
          ref={activeVideoRef}
          src={item.src}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          playsInline={playsInline}
          preload={preload}
          onLoadedMetadata={onLoadedMetadata}
          className={`${videoClassName || defaultMediaClass}`}
        />
      ) : (
        <img
          src={item.thumb || item.src}
          alt={item.alt || alt}
          loading="lazy"
          decoding="async"
          className={`${imageClassName || defaultMediaClass}`}
        />
      )}
    </div>
  );
}

export default UniversalMediaTile;

// src/components/shared/UniversalMediaTile.jsx
// Flexible media tile that automatically renders either an optimized <MediaImage /> or a <video />
// depending on the media format assigned to this position, with zero format reservation.
import React, { useRef, useEffect, useState } from 'react';
import { isMediaVideo, normalizeMediaItem } from '@/utils/mediaPositioning';
import MediaImage from '@/components/shared/MediaImage';

export function UniversalMediaTile({
  media,
  alt = 'Cinegem Studio Jewellery',
  className = '',
  videoClassName = '',
  imageClassName = '',
  sizes = '(max-width: 768px) 100vw, 50vw',
  priority = false,
  style,
  onClick,
  autoPlay = true,
  muted = true,
  loop = true,
  playsInline = true,
  preload = 'metadata',
  videoRef: externalVideoRef,
  onLoadedMetadata,
}) {
  const localVideoRef = useRef(null);
  const activeVideoRef = externalVideoRef || localVideoRef;
  const [useLowResVideo, setUseLowResVideo] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isNarrow = window.innerWidth < 768;
      const saveData = navigator.connection?.saveData === true;
      if (isNarrow || saveData) {
        setUseLowResVideo(true);
      }
    }
  }, []);

  const item = normalizeMediaItem(media, alt);
  if (!item || (!item.src && !item.full && !item.thumb)) {
    return <div className={`bg-black/20 ${className}`} style={style} />;
  }

  const isVideo = isMediaVideo(item);
  const videoSrc = (useLowResVideo && item.srcLow) ? item.srcLow : (item.src || item.full);

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
  }, [isVideo, videoSrc, autoPlay, activeVideoRef]);

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
          src={videoSrc}
          poster={item.poster || item.thumb}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          playsInline={playsInline}
          preload={preload}
          onLoadedMetadata={onLoadedMetadata}
          className={`${videoClassName || defaultMediaClass}`}
        />
      ) : (
        <MediaImage
          item={item}
          alt={item.alt || alt}
          sizes={sizes}
          priority={priority}
          className={`${imageClassName || defaultMediaClass}`}
        />
      )}
    </div>
  );
}

export default UniversalMediaTile;

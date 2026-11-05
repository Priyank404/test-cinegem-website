// src/utils/mediaPositioning.js
// Universal media positioning utility for Cinegem Studio.
// Assigns media (images or videos) to exact numbered layout positions (1, 2, 3...)
// based on filename convention (e.g., 1.mp4, 1.png, 02.jpg, 3_ring.mp4)
// while gracefully falling back to default media order when files are unnumbered.

export const VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.webm',
  '.mov',
  '.m4v',
  '.avi',
  '.ogv',
  '.mkv',
  '.mpg',
  '.mpeg',
  '.3gp',
  '.flv',
  '.wmv',
  '.ts',
  '.m2ts',
]);

export const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.gif',
  '.svg',
  '.bmp',
  '.tiff',
  '.tif',
  '.ico',
  '.heic',
  '.heif',
]);

/**
 * Checks whether a given media item or URL string is a video.
 */
export function isMediaVideo(item) {
  if (!item) return false;
  if (item.isVideo === true || item.type === 'video') return true;
  if (typeof item.mimeType === 'string' && item.mimeType.startsWith('video/')) return true;

  const raw = typeof item === 'string' ? item : item.src || item.name || item.filename || '';
  if (!raw) return false;

  // Strip query params and hashes before checking extension
  const cleanPath = raw.split(/[?#]/)[0].toLowerCase();
  for (const ext of VIDEO_EXTENSIONS) {
    if (cleanPath.endsWith(ext)) return true;
  }
  return false;
}

/**
 * Checks whether an item is designated as a full-screen showcase asset.
 * Matches filenames starting with "full-1", "full_1", "full1", "fullscreen-1", etc.
 * Examples:
 *   "full-1.mp4"       -> true
 *   "full-2.png"       -> true
 *   "full_01.webm"     -> true
 *   "fullscreen-1.mp4" -> true
 */
export function isFullScreenMedia(item) {
  if (!item) return false;
  const raw = item.filename || item.name || (typeof item.src === 'string' ? item.src.split('/').pop() : '') || '';
  if (!raw) return false;
  const clean = raw.split(/[?#]/)[0].trim().toLowerCase();
  return /^(?:full|fullscreen)[_\-]?\d+/i.test(clean);
}

/**
 * Extracts the 1-based full-screen slot index from an item's filename.
 * Examples:
 *   "full-1.mp4"       -> 1
 *   "full-01.png"      -> 1
 *   "full_2.webm"      -> 2
 *   "fullscreen-3.mp4" -> 3
 * Returns null if not a full-screen asset.
 */
export function extractFullScreenIndex(item) {
  if (!item) return null;
  const raw = item.filename || item.name || (typeof item.src === 'string' ? item.src.split('/').pop() : '') || '';
  if (!raw) return null;
  const clean = raw.split(/[?#]/)[0].trim().toLowerCase();
  const match = clean.match(/^(?:full|fullscreen)[_\-]?0*(\d+)(?:[.\-_ ]|$)/i);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    return Number.isFinite(num) && num > 0 ? num : null;
  }
  return null;
}

/**
 * Checks whether an item is designated as a page hero or banner asset.
 * Matches filenames starting with "hero", "banner", or "0."
 */
export function isHeroBannerMedia(item) {
  if (!item) return false;
  const raw = item.filename || item.name || (typeof item.src === 'string' ? item.src.split('/').pop() : '') || '';
  if (!raw) return false;
  const clean = raw.split(/[?#]/)[0].trim().toLowerCase();
  return clean.startsWith('hero') || clean.startsWith('banner') || /^0+(?:[.\-_ ]|$)/.test(clean);
}

/**
 * Filters a media list to exclude hero banner and full-screen assets,
 * keeping only standard grid and story items.
 */
export function filterGridMedia(mediaList = []) {
  if (!Array.isArray(mediaList)) return [];
  return mediaList.filter((item) => !isHeroBannerMedia(item) && !isFullScreenMedia(item));
}

/**
 * Resolves full-screen media for a specific index (e.g. 1 -> full-1.*, 2 -> full-2.*).
 * Priority:
 * 1. An item whose filename explicitly matches "full-<slotIndex>"
 * 2. If no explicit match, uses defaultFallback if provided
 */
export function resolveFullScreenMedia(mediaList = [], slotIndex = 1, defaultFallback = null) {
  if (!Array.isArray(mediaList)) {
    return defaultFallback ? normalizeMediaItem(defaultFallback) : null;
  }

  const explicitMatch = mediaList.find((item) => extractFullScreenIndex(item) === slotIndex);
  if (explicitMatch) {
    return normalizeMediaItem(explicitMatch);
  }

  if (defaultFallback) {
    return normalizeMediaItem(defaultFallback);
  }

  return null;
}

/**
 * Extracts a leading position number from an item's filename or name.
 * Examples:
 *   "1.mp4"      -> 1
 *   "01.png"     -> 1
 *   "2-angle.jpg"-> 2
 *   "03_ring.mov"-> 3
 *   "12.webp"    -> 12
 * Returns null if no leading integer is found or if the file is a full-screen/hero asset.
 */
export function extractPositionFromItem(item) {
  if (!item) return null;
  // Exclude full-screen and hero items so they don't collide with numerical positions
  if (isFullScreenMedia(item) || isHeroBannerMedia(item)) return null;

  const raw = item.filename || item.name || (typeof item.src === 'string' ? item.src.split('/').pop() : '') || '';
  if (!raw) return null;

  // Clean out query strings
  const base = raw.split(/[?#]/)[0].trim();
  const match = base.match(/^0*(\d+)(?:[.\-_ ]|$)/);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    return Number.isFinite(num) && num > 0 ? num : null;
  }
  return null;
}

/**
 * Normalizes an item into a standard media object.
 */
export function normalizeMediaItem(item, fallbackAlt = 'Cinegem Studio Jewellery') {
  if (!item) return null;
  const src = typeof item === 'string' ? item : item.src;
  const isVideo = isMediaVideo(item);
  const alt = (typeof item === 'object' && item.alt) ? item.alt : fallbackAlt;
  const thumb = (typeof item === 'object' && item.thumb) ? item.thumb : src;
  const name = (typeof item === 'object' && (item.name || item.filename)) ? (item.name || item.filename) : (src ? src.split('/').pop() : '');

  return {
    ...(typeof item === 'object' ? item : {}),
    src,
    thumb,
    alt,
    name,
    isVideo,
    type: isVideo ? 'video' : 'image',
  };
}

/**
 * Resolves the media item for an exact numerical position (1-based index).
 * Priority:
 * 1. An item in `mediaList` whose filename starts with or matches `position` (e.g. 1.mp4, 1.png).
 * 2. If no item explicitly claims this position, but `defaultFallback` is provided, use `defaultFallback`.
 * 3. Fallback to `mediaList[position - 1]` if available.
 */
export function resolveMediaForPosition(mediaList = [], position = 1, defaultFallback = null) {
  if (!Array.isArray(mediaList)) {
    return defaultFallback ? normalizeMediaItem(defaultFallback) : null;
  }

  // 1. Look for explicit numerical match in filename (e.g. 1.mp4 or 1.png)
  const explicitMatch = mediaList.find((item) => extractPositionFromItem(item) === position);
  if (explicitMatch) {
    return normalizeMediaItem(explicitMatch);
  }

  // 2. If a specific default fallback was provided for this slot, use it
  if (defaultFallback) {
    return normalizeMediaItem(defaultFallback);
  }

  // 3. Sequential index fallback
  const indexItem = mediaList[position - 1];
  if (indexItem) {
    return normalizeMediaItem(indexItem);
  }

  return null;
}


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
 * Extracts a leading position number from an item's filename or name.
 * Examples:
 *   "1.mp4"      -> 1
 *   "01.png"     -> 1
 *   "2-angle.jpg"-> 2
 *   "03_ring.mov"-> 3
 *   "12.webp"    -> 12
 * Returns null if no leading integer is found.
 */
export function extractPositionFromItem(item) {
  if (!item) return null;
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


// src/services/mediaService.js
// Client service for fetching media manifests from Cloudflare R2

import { mediaUrl, resolveFolder } from "@/config/media";

const folderCache = new Map();
const inFlightRequests = new Map();

/**
 * Transforms relative manifest item keys into absolute CDN URLs
 */
function expandItemUrls(item) {
  const expanded = { ...item };

  if (item.src) expanded.src = mediaUrl(item.src);
  if (item.thumb) expanded.thumb = mediaUrl(item.thumb);
  if (item.full) expanded.full = mediaUrl(item.full);
  if (item.srcLow) expanded.srcLow = mediaUrl(item.srcLow);
  if (item.poster) expanded.poster = mediaUrl(item.poster);
  if (item.posterWebp) expanded.posterWebp = mediaUrl(item.posterWebp);

  if (item.srcSet) {
    const avif = (item.srcSet.avif || []).map(([k, w]) => [mediaUrl(k), w]);
    const webp = (item.srcSet.webp || []).map(([k, w]) => [mediaUrl(k), w]);
    expanded.srcSet = {
      avif,
      webp,
      avifString: avif.map(([u, w]) => `${u} ${w}w`).join(", "),
      webpString: webp.map(([u, w]) => `${u} ${w}w`).join(", "),
    };
  }

  return expanded;
}

/**
 * Fetches media for a given folder alias or prefix from Cloudflare R2
 * @param {string} identifier - Folder alias or canonical prefix (e.g. "classic", "home", "creative-visuals")
 * @returns {Promise<{ items: Array, images: Array, videos: Array, total: number, prefix: string }>}
 */
export async function fetchMediaFolder(identifier) {
  const prefix = resolveFolder(identifier);

  if (folderCache.has(prefix)) {
    return folderCache.get(prefix);
  }

  if (inFlightRequests.has(prefix)) {
    return inFlightRequests.get(prefix);
  }

  const fetchPromise = (async () => {
    try {
      const manifestUrl = mediaUrl(`manifests/${prefix}.json`);
      let response;
      try {
        response = await fetch(manifestUrl, { cache: "default" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
      } catch (networkErr) {
        // Fallback to local /manifests/ if remote fetch fails (e.g. CORS on localhost or offline dev)
        console.warn(
          `[mediaService] Remote manifest fetch for "${prefix}" did not succeed (${networkErr.message}). Falling back to local /manifests/${prefix}.json...`
        );
        response = await fetch(`/manifests/${prefix}.json`);
        if (!response.ok) {
          throw networkErr;
        }
      }

      const data = await response.json();
      const rawItems = Array.isArray(data.items) ? data.items : [];

      const items = rawItems.map(expandItemUrls);
      const images = items.filter((i) => i.type === "image");
      const videos = items.filter((i) => i.type === "video");

      const result = {
        prefix,
        items,
        images,
        videos,
        total: items.length,
        updatedAt: data.updatedAt,
      };

      folderCache.set(prefix, result);
      return result;
    } finally {
      inFlightRequests.delete(prefix);
    }
  })();

  inFlightRequests.set(prefix, fetchPromise);
  return fetchPromise;
}

/**
 * Clears the in-memory cache (primarily useful during development/hot reload)
 */
export function clearMediaCache() {
  folderCache.clear();
  inFlightRequests.clear();
}


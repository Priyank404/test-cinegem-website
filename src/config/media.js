// src/config/media.js
// Configuration and folder mapping for Cloudflare R2 media CDN

const DEFAULT_MEDIA_BASE_URL = "https://media.cinegemstudio.com";
const rawBaseUrl = import.meta.env.VITE_MEDIA_BASE_URL || DEFAULT_MEDIA_BASE_URL;

let normalizedBaseUrl = (rawBaseUrl || DEFAULT_MEDIA_BASE_URL).trim();
if (normalizedBaseUrl && !normalizedBaseUrl.startsWith("http://") && !normalizedBaseUrl.startsWith("https://")) {
  normalizedBaseUrl = `https://${normalizedBaseUrl}`;
}

export const MEDIA_BASE_URL = normalizedBaseUrl.replace(/\/+$/, "");

/**
 * Returns an absolute URL pointing to Cloudflare R2 for any media key
 * @param {string} key - e.g. "classic/19.a1b2c3d4/1920.avif" or "manifests/classic.json"
 */
export function mediaUrl(key) {
  if (!key) return "";
  if (key.startsWith("http://") || key.startsWith("https://") || key.startsWith("data:")) {
    return key;
  }
  const cleanKey = key.replace(/^\/+/, "");
  return MEDIA_BASE_URL ? `${MEDIA_BASE_URL}/${cleanKey}` : `/${cleanKey}`;
}

export const FOLDER_ALIASES = {
  // Home Page
  "home": "home",
  "homepage": "home",
  "Home": "home",
  "HomePage": "home",
  "1WJ6W3J4OWBJ4Rp3D914HZYO7hJ-6nejo": "home",

  // Creative Visuals
  "creative-visuals": "creative-visuals",
  "Creative visuals": "creative-visuals",
  "Creative Visuals": "creative-visuals",
  "Creative Image": "creative-visuals",
  "creative-image": "creative-visuals",
  "creative": "creative-visuals",
  "14_ue_LcD2NvX2Scb86CdRit989uouSRR": "creative-visuals",

  // Classic E-Commerce Visuals
  "classic": "classic",
  "E-Com Visuals": "classic",
  "E-com Visuals": "classic",
  "E-Commerce Visuals": "classic",
  "still-image": "classic",
  "ecom": "classic",
  "178a7pQWVMnZhH1Lnsr19rfupV73kFznh": "classic",

  // On-Body Visualization
  "onbody": "onbody",
  "on-body": "onbody",
  "On-Body Visualization": "onbody",
  "1OQNorgckDU0lMfVPpRof9gtsFcRaVzuA": "onbody",

  // Creative Animation (optional)
  "creative-animation": "creative-animation",
  "Creative Animation": "creative-animation",
  "creative-anim": "creative-animation",

  // 360 Turntable / Animation (optional)
  "360": "360",
  "360 Animation": "360",
  "turntable": "360",
};

/**
 * Resolves any alias, page name, or folder ID to the canonical R2 prefix
 */
export function resolveFolder(identifier) {
  if (!identifier) return "home";
  const trimmed = identifier.trim();
  if (FOLDER_ALIASES[trimmed]) {
    return FOLDER_ALIASES[trimmed];
  }
  const norm = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [alias, canonical] of Object.entries(FOLDER_ALIASES)) {
    if (alias.toLowerCase().replace(/[^a-z0-9]/g, "") === norm) {
      return canonical;
    }
  }
  return trimmed.toLowerCase();
}


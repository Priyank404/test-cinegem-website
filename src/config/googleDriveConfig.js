// src/config/googleDriveConfig.js
// Configuration and folder mapping for Google Drive media sync

export const GOOGLE_DRIVE_API_KEY =
  import.meta.env.VITE_GOOGLE_DRIVE_API || "AIzaSyBtAzyvWH3iqfmJ1y0GwbKAoXFxTRw_-Xk";

export const GOOGLE_DRIVE_PARENT_FOLDER_ID =
  import.meta.env.VITE_GOOGLE_DRIVE_PARENT_FOLDER_ID || "";

// Google Drive Folder IDs from .env
export const DRIVE_FOLDER_IDS = {
  // Home Page (/ or /hero2)
  homepage:
    import.meta.env.VITE_HOMEPAGE_FOLDER_ID || "",

  // Creative Visuals (/creative-visuals)
  creativeVisuals:
    import.meta.env.VITE_CREATIVE_VISUALS_FOLDER_ID ||
    import.meta.env.VITE_CREATIVE_IMAGE_URL ||
    "1WJ6W3J4OWBJ4Rp3D914HZYO7hJ-6nejo",

  // Classic E-Commerce Visuals (/classic)
  ecomVisuals:
    import.meta.env.VITE_ECOM_VISUALS_FOLDER_ID ||
    import.meta.env.VITE_STILL_IMAGE_URL ||
    "1cp9ulMv1QZdS6raMSvQOLZdLwHVFa7zf",

  // On-Body Visualization (/onbody)
  onBody:
    import.meta.env.VITE_ON_BODY_FOLDER_ID ||
    import.meta.env.VITE_ON_BODY_URL ||
    "1yU3LwOU5l8ZJkvwKwLkN80lGFMB5esnY",

  // Creative Animation
  creativeAnimation:
    import.meta.env.VITE_CREATIVE_ANIMATION_FOLDER_ID ||
    import.meta.env.VITE_CREATIVE_ANIMATION_URL ||
    "1rqrfSlIpWcvYiAJqfKJYCx09U6TM_RdC",

  // 360 Turntable / Animation
  turntable360:
    import.meta.env.VITE_360_ANIMATION_FOLDER_ID ||
    import.meta.env.VITE_360_ANIMATION_URL ||
    "1czxcFB5BWmYhnOg-bYNEJx1Jubwoil8o",
};

// Named mapping for pages and services
export const DEFAULT_DRIVE_FOLDERS = {
  // Home Page
  "homepage": DRIVE_FOLDER_IDS.homepage,
  "home": DRIVE_FOLDER_IDS.homepage,
  "Home": DRIVE_FOLDER_IDS.homepage,
  "HomePage": DRIVE_FOLDER_IDS.homepage,

  // Creative Visuals
  "Creative visuals": DRIVE_FOLDER_IDS.creativeVisuals,
  "Creative Visuals": DRIVE_FOLDER_IDS.creativeVisuals,
  "Creative Image": DRIVE_FOLDER_IDS.creativeVisuals,
  "creative-visuals": DRIVE_FOLDER_IDS.creativeVisuals,
  "creative-image": DRIVE_FOLDER_IDS.creativeVisuals,
  "creative": DRIVE_FOLDER_IDS.creativeVisuals,

  // Classic E-Commerce Visuals
  "E-Com Visuals": DRIVE_FOLDER_IDS.ecomVisuals,
  "E-com Visuals": DRIVE_FOLDER_IDS.ecomVisuals,
  "E-Commerce Visuals": DRIVE_FOLDER_IDS.ecomVisuals,
  "still-image": DRIVE_FOLDER_IDS.ecomVisuals,
  "classic": DRIVE_FOLDER_IDS.ecomVisuals,
  "ecom": DRIVE_FOLDER_IDS.ecomVisuals,

  // On-Body Visualization
  "On-Body Visualization": DRIVE_FOLDER_IDS.onBody,
  "onbody": DRIVE_FOLDER_IDS.onBody,
  "on-body": DRIVE_FOLDER_IDS.onBody,

  // Creative Animation
  "Creative Animation": DRIVE_FOLDER_IDS.creativeAnimation,
  "creative-anim": DRIVE_FOLDER_IDS.creativeAnimation,
  "creative-animation": DRIVE_FOLDER_IDS.creativeAnimation,

  // 360 Turntable / Animation
  "360 Animation": DRIVE_FOLDER_IDS.turntable360,
  "360": DRIVE_FOLDER_IDS.turntable360,
  "turntable": DRIVE_FOLDER_IDS.turntable360,
};

/**
 * Extracts a Google Drive Folder ID from a page key, raw ID, or full Google Drive URL
 */
export function parseDriveFolderId(input) {
  if (!input) return null;
  const trimmed = input.trim();

  // 1. Direct match in predefined map
  if (DEFAULT_DRIVE_FOLDERS[trimmed]) {
    return DEFAULT_DRIVE_FOLDERS[trimmed];
  }

  // 2. Normalized match in predefined map
  const norm = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [key, id] of Object.entries(DEFAULT_DRIVE_FOLDERS)) {
    if (key.toLowerCase().replace(/[^a-z0-9]/g, "") === norm) {
      return id;
    }
  }

  // 3. Match Google Drive URLs (https://drive.google.com/drive/folders/<ID> or /u/0/folders/<ID>)
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];

  // 4. Match ?id=<ID>
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];

  // 5. Match direct Google Drive alphanumeric ID
  if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

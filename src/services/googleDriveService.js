// src/services/googleDriveService.js
// Client service for fetching media (images & videos) directly from Google Drive API v3
import {
  GOOGLE_DRIVE_API_KEY,
  GOOGLE_DRIVE_PARENT_FOLDER_ID,
  DEFAULT_DRIVE_FOLDERS,
  parseDriveFolderId,
} from "@/config/googleDriveConfig";

const VIDEO_MIMES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/webm",
  "video/mpeg",
]);

/**
 * Checks if local proxy endpoint is available
 */
const hasProxy = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

/**
 * Direct streamable/download URL for Google Drive file
 */
export function getDriveDownloadUrl(id) {
  if (hasProxy) {
    return `/api/drive-media?id=${id}&type=video`;
  }
  return `https://drive.google.com/uc?export=download&id=${id}`;
}

/**
 * Thumbnail URL with custom width/size
 */
export function getDriveThumbnailUrl(id, size = "w800") {
  if (hasProxy) {
    return `/api/drive-media?id=${id}&sz=${size}`;
  }
  return `https://drive.google.com/thumbnail?id=${id}&sz=${size}`;
}

/**
 * High-res image URL served through Google's global CDN or proxy
 */
export function getDriveCdnImageUrl(id, size = "w1600") {
  if (hasProxy) {
    return `/api/drive-media?id=${id}&sz=${size}`;
  }
  return `https://drive.google.com/thumbnail?id=${id}&sz=${size}`;
}

/**
 * Fetches all media files (images & videos) inside a Google Drive folder
 */
export async function fetchDriveFolderMedia(folderIdentifier, apiKey = GOOGLE_DRIVE_API_KEY) {
  const folderId = parseDriveFolderId(folderIdentifier);

  if (!folderId) {
    throw new Error(`Invalid Google Drive folder ID or URL: "${folderIdentifier}"`);
  }

  if (!apiKey) {
    throw new Error("Google Drive API key is missing. Set VITE_GOOGLE_DRIVE_API in .env");
  }

  const q = encodeURIComponent(
    `'${folderId}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed = false`
  );
  const fields = encodeURIComponent(
    "files(id,name,mimeType,size,createdTime,modifiedTime,description)"
  );
  const orderBy = encodeURIComponent("name asc");
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&key=${apiKey}&fields=${fields}&orderBy=${orderBy}&pageSize=100`;

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody.error?.message || `Google Drive API error (${response.status}): ${response.statusText}`
    );
  }

  const data = await response.json();
  const rawFiles = data.files || [];

  // Sort naturally (1, 2, ..., 9, 10, 11) so 1.png and 10.png sort in true numerical sequence
  rawFiles.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
  );

  const items = rawFiles.map((file) => {
    const isVideo = VIDEO_MIMES.has(file.mimeType) || file.mimeType.startsWith("video/");
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const cleanAlt = baseName.replace(/[_-]+/g, " ").trim();

    const src = isVideo
      ? getDriveDownloadUrl(file.id)
      : getDriveCdnImageUrl(file.id, "w1600");

    const thumb = isVideo
      ? getDriveThumbnailUrl(file.id, "w800")
      : getDriveThumbnailUrl(file.id, "w800");

    const full = isVideo
      ? getDriveDownloadUrl(file.id)
      : getDriveCdnImageUrl(file.id, "w2400");

    return {
      id: file.id,
      name: file.name,
      filename: file.name,
      src,
      thumb,
      full,
      type: isVideo ? "video" : "image",
      isVideo,
      mimeType: file.mimeType,
      alt: cleanAlt || file.name,
      driveUrl: `https://drive.google.com/file/d/${file.id}/view`,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
    };
  });

  const images = items.filter((i) => i.type === "image");
  const videos = items.filter((i) => i.type === "video");

  return {
    folderId,
    folderName: folderIdentifier,
    items,
    images,
    videos,
    total: items.length,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Discovers subfolders inside a parent Google Drive folder
 */
export async function fetchDriveSubfolders(parentFolderId = GOOGLE_DRIVE_PARENT_FOLDER_ID, apiKey = GOOGLE_DRIVE_API_KEY) {
  if (!parentFolderId || !apiKey) return [];

  try {
    const q = encodeURIComponent(
      `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );
    const fields = encodeURIComponent("files(id,name)");
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&key=${apiKey}&fields=${fields}&pageSize=50`;

    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.files || []).map((f) => ({
      name: f.name,
      id: f.id,
      isDrive: true,
    }));
  } catch {
    return [];
  }
}

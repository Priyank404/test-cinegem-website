import { useState, useEffect, useCallback, useRef } from "react";
import { fetchDriveFolderMedia } from "@/services/googleDriveService";
import { parseDriveFolderId } from "@/config/googleDriveConfig";

// Embedded static fallback items in case network/offline
const STATIC_FALLBACK_ITEMS = [];

// In-memory cache + persistent sessionStorage cache (prevents fallback image flash on refresh)
const driveCache = new Map();

function getCachedMedia(folderIdentifier) {
  if (driveCache.has(folderIdentifier)) {
    return driveCache.get(folderIdentifier);
  }
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      const raw = window.sessionStorage.getItem(`cinegem_drive_${folderIdentifier}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
          driveCache.set(folderIdentifier, parsed);
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function setCachedMedia(folderIdentifier, data) {
  if (!data || !Array.isArray(data.items)) return;
  driveCache.set(folderIdentifier, data);
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(
        `cinegem_drive_${folderIdentifier}`,
        JSON.stringify({
          items: data.items,
          images: data.images,
          videos: data.videos,
        })
      );
    } catch {
      // ignore
    }
  }
}

/**
 * useDriveMedia hook
 * Automatically fetches images & videos directly from Google Drive using the folder ID configured in .env.
 * Automatically synchronizes on window focus and a 30s background interval so new Drive uploads reflect automatically.
 * Implements instant cache hydration so on page refresh it immediately renders the real media with zero fallback flash.
 */
export function useDriveMedia(folderIdentifier = "Creative visuals") {
  const cached = getCachedMedia(folderIdentifier);

  const [items, setItems] = useState(() => cached?.items || []);
  const [images, setImages] = useState(() => cached?.images || []);
  const [videos, setVideos] = useState(() => cached?.videos || []);
  const [loading, setLoading] = useState(() => !cached);
  const [error, setError] = useState(null);
  const [lastSynced, setLastSynced] = useState(() => (cached ? new Date() : null));
  const [isFallback, setIsFallback] = useState(false);
  const isMounted = useRef(true);

  const loadMedia = useCallback(async () => {
    try {
      const folderId = parseDriveFolderId(folderIdentifier);
      if (!folderId) {
        throw new Error(`No Google Drive folder ID configured for "${folderIdentifier}". Check your .env file.`);
      }

      const driveData = await fetchDriveFolderMedia(folderId);
      if (!isMounted.current) return;

      if (driveData && driveData.items && driveData.items.length > 0) {
        setCachedMedia(folderIdentifier, driveData);
        setItems(driveData.items);
        setImages(driveData.images);
        setVideos(driveData.videos);
        setLastSynced(new Date());
        setIsFallback(false);
        setError(null);
        setLoading(false);
        return;
      }

      // Empty folder fallback
      setIsFallback(true);
      setItems(STATIC_FALLBACK_ITEMS);
      setImages(STATIC_FALLBACK_ITEMS.filter((i) => i.type === "image"));
      setVideos(STATIC_FALLBACK_ITEMS.filter((i) => i.type === "video"));
      setLoading(false);
    } catch (err) {
      if (!isMounted.current) return;
      console.warn(`[useDriveMedia] Google Drive fetch failed for "${folderIdentifier}":`, err.message);
      setError(err.message);
      setIsFallback(true);

      // Local manifest or static fallback
      fetch("/media-manifest.json", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((manifest) => {
          if (!isMounted.current) return;
          const folderData =
            manifest?.folders?.[folderIdentifier] ||
            manifest?.folders?.["Creative visuals"];
          if (folderData && folderData.items?.length > 0) {
            setItems(folderData.items);
            setImages(folderData.images);
            setVideos(folderData.videos);
          } else {
            setItems(STATIC_FALLBACK_ITEMS);
            setImages(STATIC_FALLBACK_ITEMS.filter((i) => i.type === "image"));
            setVideos(STATIC_FALLBACK_ITEMS.filter((i) => i.type === "video"));
          }
          setLastSynced(new Date());
          setLoading(false);
        })
        .catch(() => {
          if (!isMounted.current) return;
          setItems(STATIC_FALLBACK_ITEMS);
          setImages(STATIC_FALLBACK_ITEMS.filter((i) => i.type === "image"));
          setVideos(STATIC_FALLBACK_ITEMS.filter((i) => i.type === "video"));
          setLoading(false);
        });
    }
  }, [folderIdentifier]);

  // Initial fetch on mount & folderIdentifier changes
  useEffect(() => {
    isMounted.current = true;
    setLoading(true);
    loadMedia();
    return () => {
      isMounted.current = false;
    };
  }, [loadMedia]);

  // Auto-refresh when user switches back to the browser tab
  useEffect(() => {
    const handleFocus = () => {
      loadMedia();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadMedia]);

  // Background refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      loadMedia();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadMedia]);

  return {
    items,
    images,
    videos,
    total: items.length,
    loading,
    error,
    isFallback,
    lastSynced,
    refresh: loadMedia,
  };
}


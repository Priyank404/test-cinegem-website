import { useState, useEffect, useCallback, useRef } from "react";
import { fetchDriveFolderMedia } from "@/services/googleDriveService";
import { DRIVE_FOLDER_IDS } from "@/config/googleDriveConfig";

// In-memory cache + persistent sessionStorage cache (prevents fallback image flash on refresh)
const homeCache = { current: null };

function getCachedHomeMedia() {
  if (homeCache.current) return homeCache.current;
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      const raw = window.sessionStorage.getItem("cinegem_home_media_cache");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          homeCache.current = parsed;
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function setCachedHomeMedia(data) {
  if (!data) return;
  homeCache.current = data;
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      window.sessionStorage.setItem("cinegem_home_media_cache", JSON.stringify(data));
    } catch {
      // ignore
    }
  }
}

/**
 * useHomePageMedia hook
 * Loads preview images and videos strictly from Google Drive.
 * Zero static/fallback media - only live synced Google Drive assets.
 */
export function useHomePageMedia() {
  const cached = getCachedHomeMedia();

  const [beat2Images, setBeat2Images] = useState(() => cached?.beat2Images || []);
  const [beat2Video, setBeat2Video] = useState(() => cached?.beat2Video || null);

  const [beat3Images, setBeat3Images] = useState(() => cached?.beat3Images || []);
  const [beat3Video, setBeat3Video] = useState(() => cached?.beat3Video || null);

  const [beat4Image, setBeat4Image] = useState(() => cached?.beat4Image || null);

  const [loading, setLoading] = useState(() => !cached);
  const isMounted = useRef(true);

  const loadMedia = useCallback(async () => {
    try {
      let homeData = null;

      // 1. If dedicated Home Page folder is configured in .env, attempt to fetch from it
      if (DRIVE_FOLDER_IDS.homepage) {
        try {
          homeData = await fetchDriveFolderMedia(DRIVE_FOLDER_IDS.homepage);
        } catch (err) {
          console.warn(
            `[useHomePageMedia] Failed to load Home Page folder "${DRIVE_FOLDER_IDS.homepage}": ${err.message}.`
          );
        }

        if (homeData && homeData.items && homeData.items.length > 0 && isMounted.current) {
          const imgs = homeData.images || [];
          const vids = homeData.videos || [];

          const b2Imgs = imgs.slice(0, 4);
          const b2Vid = vids[0] || null;

          const remainingImgs = imgs.slice(4);
          const b3Imgs = remainingImgs.slice(0, 4);
          const b3Vid = vids[1] || null;
          const b4Img = remainingImgs[4] || imgs[imgs.length - 1] || null;

          setBeat2Images(b2Imgs);
          if (b2Vid) setBeat2Video(b2Vid);

          setBeat3Images(b3Imgs);
          if (b3Vid) setBeat3Video(b3Vid);

          if (b4Img) setBeat4Image(b4Img);

          setCachedHomeMedia({
            beat2Images: b2Imgs,
            beat2Video: b2Vid,
            beat3Images: b3Imgs,
            beat3Video: b3Vid,
            beat4Image: b4Img,
          });

          setLoading(false);
          return;
        }
      }

      // 2. Fetch from individual service folders concurrently for missing / remaining beats
      const [ecomRes, creativeRes, onBodyRes] = await Promise.allSettled([
        !homeData ? fetchDriveFolderMedia(DRIVE_FOLDER_IDS.ecomVisuals) : Promise.resolve(null),
        fetchDriveFolderMedia(DRIVE_FOLDER_IDS.creativeVisuals),
        fetchDriveFolderMedia(DRIVE_FOLDER_IDS.onBody),
      ]);

      if (!isMounted.current) return;

      let newB2Imgs = [];
      let newB2Vid = null;
      let newB3Imgs = [];
      let newB3Vid = null;
      let newB4Img = null;

      // Set Beat 2 from E-Com Visuals folder
      if (!homeData && ecomRes.status === "fulfilled" && ecomRes.value?.images?.length > 0) {
        newB2Imgs = ecomRes.value.images.slice(0, 4);
        setBeat2Images(newB2Imgs);
        if (ecomRes.value.videos?.length > 0) {
          newB2Vid = ecomRes.value.videos[0];
          setBeat2Video(newB2Vid);
        }
      }

      // Populate Beat 3 (Creative) from Creative Visuals folder
      if (creativeRes.status === "fulfilled" && creativeRes.value?.images?.length > 0) {
        newB3Imgs = creativeRes.value.images.slice(0, 4);
        setBeat3Images(newB3Imgs);
        if (creativeRes.value.videos?.length > 0) {
          newB3Vid = creativeRes.value.videos[0];
          setBeat3Video(newB3Vid);
        }
      }

      // Populate Beat 4 (On-Body) from On-Body folder
      if (onBodyRes.status === "fulfilled" && onBodyRes.value?.images?.length > 0) {
        newB4Img = onBodyRes.value.images[0] || null;
        if (newB4Img) setBeat4Image(newB4Img);
      }

      setCachedHomeMedia({
        beat2Images: newB2Imgs.length > 0 ? newB2Imgs : beat2Images,
        beat2Video: newB2Vid || beat2Video,
        beat3Images: newB3Imgs.length > 0 ? newB3Imgs : beat3Images,
        beat3Video: newB3Vid || beat3Video,
        beat4Image: newB4Img || beat4Image,
      });

      setLoading(false);
    } catch (err) {
      if (!isMounted.current) return;
      console.warn("[useHomePageMedia] Auto-fetch error:", err);
      setLoading(false);
    }
  }, [beat2Images, beat2Video, beat3Images, beat3Video, beat4Image]);

  useEffect(() => {
    isMounted.current = true;
    loadMedia();
    return () => {
      isMounted.current = false;
    };
  }, [loadMedia]);

  // Refresh on window focus
  useEffect(() => {
    const handleFocus = () => loadMedia();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadMedia]);

  // Periodic poll every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      loadMedia();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadMedia]);

  return {
    beat2Images,
    beat2Video,
    beat3Images,
    beat3Video,
    beat4Image,
    loading,
    refreshMedia: loadMedia,
  };
}

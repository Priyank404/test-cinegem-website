import { useState, useEffect, useCallback, useRef } from "react";
import { fetchDriveFolderMedia } from "@/services/googleDriveService";
import { DRIVE_FOLDER_IDS } from "@/config/googleDriveConfig";

const DEFAULT_BEAT2 = {
  images: [
    { src: "/E-com%20Visuals/solitaire-high-polish-yellow-marquise-angle-1.png", alt: "Solitaire Marquise Ring - Angle 1" },
    { src: "/E-com%20Visuals/solitaire-high-polish-yellow-marquise-angle-2.png", alt: "Solitaire Marquise Ring - Angle 2" },
    { src: "/E-com%20Visuals/solitaire-high-polish-yellow-marquise-angle-3.png", alt: "Solitaire Marquise Ring - Angle 3" },
    { src: "/E-com%20Visuals/solitaire-high-polish-yellow-marquise-angle-4.png", alt: "Solitaire Marquise Ring - Angle 4" },
  ],
  video: { src: "/E-com%20Visuals/solitaire-high-polish-yellow-marquise-video.mp4" },
};

const DEFAULT_BEAT3 = {
  images: [
    { src: "/Creative%20visuals/Beauty.png", alt: "High Fashion Jewellery Beauty Shot" },
    { src: "/Creative%20visuals/Ring%202-Color%20BG-V1-R3.png", alt: "Two-Tone Diamond Ring" },
    { src: "/Creative%20visuals/Figaro-BR-CH-Y-V1.png", alt: "Figaro Bracelet Chain" },
    { src: "/Creative%20visuals/NP-1-YG-LS2-V2.png", alt: "Yellow Gold Diamond Pendant" },
  ],
  video: { src: "/Creative%20visuals/A6-R3-HQ.mp4" },
};

const DEFAULT_BEAT4 = {
  image: { src: "/Gemini_Generated_Image_udnfihudnfihudnf.png", alt: "On-Body Visualization Showcase" },
};

/**
 * useHomePageMedia hook
 * Automatically loads preview images and videos for Home Page Beats (Beat 2: E-Com, Beat 3: Creative, Beat 4: On-Body).
 * Supports:
 *  1. Dedicated VITE_HOMEPAGE_FOLDER_ID if set.
 *  2. Or automatic dynamic sync with VITE_ECOM_VISUALS_FOLDER_ID, VITE_CREATIVE_VISUALS_FOLDER_ID, and VITE_ON_BODY_FOLDER_ID.
 *  3. Graceful fallback to section folders / static assets.
 */
export function useHomePageMedia() {
  const [beat2Images, setBeat2Images] = useState(DEFAULT_BEAT2.images);
  const [beat2Video, setBeat2Video] = useState(DEFAULT_BEAT2.video);

  const [beat3Images, setBeat3Images] = useState(DEFAULT_BEAT3.images);
  const [beat3Video, setBeat3Video] = useState(DEFAULT_BEAT3.video);

  const [beat4Image, setBeat4Image] = useState(DEFAULT_BEAT4.image);

  const [loading, setLoading] = useState(true);
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
            `[useHomePageMedia] Failed to load Home Page folder "${DRIVE_FOLDER_IDS.homepage}": ${err.message}.\n` +
            `👉 Make sure the folder's General Access is set to "Anyone with the link" (Viewer) in Google Drive!`
          );
        }

        if (homeData && homeData.items && homeData.items.length > 0 && isMounted.current) {
          const imgs = homeData.images || [];
          const vids = homeData.videos || [];

          // Beat 2
          if (imgs.length >= 4) {
            setBeat2Images(imgs.slice(0, 4));
          } else if (imgs.length > 0) {
            setBeat2Images(imgs.slice(0, 4).concat(DEFAULT_BEAT2.images).slice(0, 4));
          }
          if (vids[0]) setBeat2Video(vids[0]);

          // If Home Page folder has 8+ images, use them for Beat 3 & Beat 4
          const remainingImgs = imgs.slice(4);
          if (remainingImgs.length >= 4) {
            setBeat3Images(remainingImgs.slice(0, 4));
            if (vids[1]) setBeat3Video(vids[1]);
            const b4Img = remainingImgs[4] || imgs[imgs.length - 1];
            if (b4Img) setBeat4Image(b4Img);
            setLoading(false);
            return;
          }
        }
      }

      // 2. Fetch from individual service folders concurrently for missing / remaining beats
      const [ecomRes, creativeRes, onBodyRes] = await Promise.allSettled([
        !homeData ? fetchDriveFolderMedia(DRIVE_FOLDER_IDS.ecomVisuals) : Promise.resolve(null),
        fetchDriveFolderMedia(DRIVE_FOLDER_IDS.creativeVisuals),
        fetchDriveFolderMedia(DRIVE_FOLDER_IDS.onBody),
      ]);

      if (!isMounted.current) return;

      // If no dedicated homeData was loaded, set Beat 2 from E-Com Visuals folder
      if (!homeData && ecomRes.status === "fulfilled" && ecomRes.value?.images?.length > 0) {
        const imgs = ecomRes.value.images;
        setBeat2Images(imgs.length >= 4 ? imgs.slice(0, 4) : imgs.concat(DEFAULT_BEAT2.images).slice(0, 4));
        if (ecomRes.value.videos?.length > 0) {
          setBeat2Video(ecomRes.value.videos[0]);
        }
      }

      // Populate Beat 3 (Creative) from Creative Visuals folder
      if (creativeRes.status === "fulfilled" && creativeRes.value?.images?.length > 0) {
        const imgs = creativeRes.value.images;
        setBeat3Images(imgs.length >= 4 ? imgs.slice(0, 4) : imgs.concat(DEFAULT_BEAT3.images).slice(0, 4));
        if (creativeRes.value.videos?.length > 0) {
          setBeat3Video(creativeRes.value.videos[0]);
        }
      }

      // Populate Beat 4 (On-Body) from On-Body folder
      if (onBodyRes.status === "fulfilled" && onBodyRes.value?.images?.length > 0) {
        setBeat4Image(onBodyRes.value.images[0]);
      }

      setLoading(false);
    } catch (err) {
      if (!isMounted.current) return;
      console.warn("[useHomePageMedia] Auto-fetch error, falling back to static assets:", err);
      setLoading(false);
    }
  }, []);

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

  // Periodic 30s background sync
  useEffect(() => {
    const interval = setInterval(() => loadMedia(), 30000);
    return () => clearInterval(interval);
  }, [loadMedia]);

  return {
    beat2Images,
    beat2Video,
    beat3Images,
    beat3Video,
    beat4Image,
    loading,
    refresh: loadMedia,
  };
}

// src/hooks/useHomePageMedia.js
// Optimized hook for home page media slot assignment via Cloudflare R2 manifests

import { useState, useEffect, useRef } from "react";
import { fetchMediaFolder } from "@/services/mediaService";

let homeCache = null;

export function useHomePageMedia() {
  const [beat2Images, setBeat2Images] = useState(() => homeCache?.beat2Images || []);
  const [beat2Video, setBeat2Video] = useState(() => homeCache?.beat2Video || null);

  const [beat3Images, setBeat3Images] = useState(() => homeCache?.beat3Images || []);
  const [beat3Video, setBeat3Video] = useState(() => homeCache?.beat3Video || null);

  const [beat4Image, setBeat4Image] = useState(() => homeCache?.beat4Image || null);

  const [loading, setLoading] = useState(() => !homeCache);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    let active = true;

    async function loadMedia() {
      try {
        let homeData = null;

        // 1. Attempt to fetch from canonical 'home' folder
        try {
          homeData = await fetchMediaFolder("home");
        } catch (err) {
          console.warn(`[useHomePageMedia] Failed to load 'home' manifest: ${err.message}`);
        }

        if (homeData && homeData.items && homeData.items.length > 0 && active && isMounted.current) {
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

          homeCache = {
            beat2Images: b2Imgs,
            beat2Video: b2Vid,
            beat3Images: b3Imgs,
            beat3Video: b3Vid,
            beat4Image: b4Img,
          };

          setLoading(false);
          return;
        }

        // 2. Fallback to individual service folders when 'home' is empty
        const [ecomRes, creativeRes, onBodyRes] = await Promise.allSettled([
          !homeData ? fetchMediaFolder("classic") : Promise.resolve(null),
          fetchMediaFolder("creative-visuals"),
          fetchMediaFolder("onbody"),
        ]);

        if (!active || !isMounted.current) return;

        let newB2Imgs = [];
        let newB2Vid = null;
        let newB3Imgs = [];
        let newB3Vid = null;
        let newB4Img = null;

        // Set Beat 2 from classic (E-Com Visuals)
        if (!homeData && ecomRes.status === "fulfilled" && ecomRes.value?.images?.length > 0) {
          newB2Imgs = ecomRes.value.images.slice(0, 4);
          setBeat2Images(newB2Imgs);
          if (ecomRes.value.videos?.length > 0) {
            newB2Vid = ecomRes.value.videos[0];
            setBeat2Video(newB2Vid);
          }
        }

        // Set Beat 3 from creative-visuals
        if (creativeRes.status === "fulfilled" && creativeRes.value?.images?.length > 0) {
          newB3Imgs = creativeRes.value.images.slice(0, 4);
          setBeat3Images(newB3Imgs);
          if (creativeRes.value.videos?.length > 0) {
            newB3Vid = creativeRes.value.videos[0];
            setBeat3Video(newB3Vid);
          }
        }

        // Set Beat 4 from onbody
        if (onBodyRes.status === "fulfilled" && onBodyRes.value?.images?.length > 0) {
          newB4Img = onBodyRes.value.images[0] || null;
          if (newB4Img) setBeat4Image(newB4Img);
        }

        homeCache = {
          beat2Images: newB2Imgs.length > 0 ? newB2Imgs : beat2Images,
          beat2Video: newB2Vid || beat2Video,
          beat3Images: newB3Imgs.length > 0 ? newB3Imgs : beat3Images,
          beat3Video: newB3Vid || beat3Video,
          beat4Image: newB4Img || beat4Image,
        };

        setLoading(false);
      } catch (err) {
        if (!active || !isMounted.current) return;
        console.warn("[useHomePageMedia] Auto-fetch error:", err);
        setLoading(false);
      }
    }

    loadMedia();

    return () => {
      active = false;
      isMounted.current = false;
    };
  }, []);

  return {
    beat2Images,
    beat2Video,
    beat3Images,
    beat3Video,
    beat4Image,
    loading,
    refreshMedia: () => {},
  };
}

export default useHomePageMedia;

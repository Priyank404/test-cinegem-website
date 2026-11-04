// src/hooks/useMediaFolder.js
// Hook for fetching optimized media folders from Cloudflare R2 manifests

import { useState, useEffect, useRef } from "react";
import { fetchMediaFolder } from "@/services/mediaService";

/**
 * Hook for consuming media assets from an R2 folder/prefix
 * @param {string} folderIdentifier - Alias or folder name (e.g. "classic", "creative-visuals", "onbody", "home")
 * @returns {{ items: Array, images: Array, videos: Array, total: number, loading: boolean, error: string|null }}
 */
export function useMediaFolder(folderIdentifier = "home") {
  const [items, setItems] = useState([]);
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    let active = true;

    setLoading(true);
    fetchMediaFolder(folderIdentifier)
      .then((data) => {
        if (!active || !isMounted.current) return;
        setItems(data.items || []);
        setImages(data.images || []);
        setVideos(data.videos || []);
        setTotal(data.total || (data.items ? data.items.length : 0));
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (!active || !isMounted.current) return;
        console.error(`[useMediaFolder] Failed to fetch folder "${folderIdentifier}":`, err.message);
        setError(err.message);
        setLoading(false);
      });

    return () => {
      active = false;
      isMounted.current = false;
    };
  }, [folderIdentifier]);

  return {
    items,
    images,
    videos,
    total,
    loading,
    error,
  };
}

export default useMediaFolder;

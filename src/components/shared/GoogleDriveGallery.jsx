// ============================================================
// GoogleDriveGallery.jsx  —  src/components/shared/
// ============================================================
import { useState, useEffect } from 'react'

// ─── CONFIGURATION — fill in your folder IDs here ────────────────────────
const API_KEY = 'AIzaSyDHKGn32bEnAixAW4vvzcenwyv0j2h7vWk'

export const DRIVE_FOLDERS = {
  'still-image':    '189ojwhpp08ugXI4XJ5bMgK-3g5UjiiNy',
  'creative-image': 'YOUR_CREATIVE_IMAGE_FOLDER_ID',
  'onbody':         'YOUR_ONBODY_FOLDER_ID',
  'creative-anim':  'YOUR_CREATIVE_ANIM_FOLDER_ID',
  '360':            'YOUR_360_FOLDER_ID',
}
// ─────────────────────────────────────────────────────────────────────────

// Video MIME types served by Drive
const VIDEO_MIMES = new Set([
  'video/mp4', 'video/quicktime', 'video/x-msvideo',
  'video/x-matroska', 'video/webm', 'video/mpeg',
])

// Direct streamable URL for a Drive file
function driveStreamUrl(id) {
  return `https://drive.google.com/uc?export=download&id=${id}`
}

// Thumbnail: videos get a Drive-generated poster; images get a resized thumb
function driveThumbnail(id, mimeType) {
  if (VIDEO_MIMES.has(mimeType)) {
    // Drive generates a video thumbnail at this URL
    return `https://drive.google.com/thumbnail?id=${id}&sz=w600`
  }
  return `https://drive.google.com/thumbnail?id=${id}&sz=w600`
}

/**
 * useDriveImages(pageKey)
 *
 * Fetches images AND videos from the configured Drive folder.
 * Returns items shaped as:
 *   { id, src, thumb, full, alt, label, driveUrl, isVideo, mimeType }
 *
 * `src`   — for images: thumbnail URL usable in <img>
 *            for videos: direct-download/stream URL for <video>
 * `thumb` — poster/thumbnail for both (used in gallery cards)
 * `full`  — highest-res version (used in lightbox)
 */
export function useDriveImages(pageKey) {
  const [images,  setImages]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const folderId = DRIVE_FOLDERS[pageKey]

  useEffect(() => {
    if (!folderId || folderId.startsWith('YOUR_')) {
      setError(`Folder ID not configured for "${pageKey}". Add it to DRIVE_FOLDERS in GoogleDriveGallery.jsx.`)
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchFiles = async () => {
      setLoading(true)
      setError(null)
      try {
        // Fetch both images and videos
        const q = encodeURIComponent(
          `'${folderId}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed = false`
        )
        const fields  = encodeURIComponent('files(id,name,mimeType,createdTime)')
        const orderBy = encodeURIComponent('createdTime desc')
        const url = `https://www.googleapis.com/drive/v3/files?q=${q}&key=${API_KEY}&fields=${fields}&orderBy=${orderBy}&pageSize=100`

        const res  = await fetch(url)
        if (!res.ok) throw new Error(`Drive API ${res.status}: ${res.statusText}`)
        const data = await res.json()
        if (data.error) throw new Error(data.error.message)
        if (cancelled) return

        const mapped = (data.files || []).map((file) => {
          const isVideo = VIDEO_MIMES.has(file.mimeType)
          const thumb   = driveThumbnail(file.id, file.mimeType)
          const name    = file.name.replace(/\.[^/.]+$/, '')

          return {
            id:       file.id,
            mimeType: file.mimeType,
            isVideo,
            // `src` is what ParallaxImage / <video> receives
            src:      isVideo
                        ? driveStreamUrl(file.id)
                        : `https://drive.google.com/thumbnail?id=${file.id}&sz=w1200`,
            thumb,
            // `full` shown in lightbox
            full:     isVideo
                        ? driveStreamUrl(file.id)
                        : `https://drive.google.com/thumbnail?id=${file.id}&sz=w1600`,
            alt:      name,
            label:    name,
            driveUrl: `https://drive.google.com/file/d/${file.id}/view`,
          }
        })

        setImages(mapped)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchFiles()
    return () => { cancelled = true }
  }, [folderId, pageKey])

  return { images, loading, error }
}

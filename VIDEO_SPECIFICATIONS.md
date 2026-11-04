# Cinegem Studio — Video Technical Specifications & CDN Manifest

Comprehensive `ffprobe` verification and technical breakdown for all video assets in the Cinegem Studio pipeline, comparing Google Drive sources against production streaming renditions on Cloudflare R2.

---

## 1. Master Video Specifications Table

| Video Asset & Rendition | Resolution | Aspect Ratio | FPS | Codec, Profile & Level | Avg Bitrate | File Size | Duration | Audio | Live Cloudflare R2 URL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Home 5 / Classic 1** | | | | | | | | | |
| ↳ *Original Source* | `1440 × 1440` | 1:1 (Square) | 30 | VP9 Profile 0 | **3,911 kbps** | 7.02 MB | 15.05 s | Yes | *(media-originals/home/5.webm)* |
| ↳ **1080p (Desktop)** | `1080 × 1080` | 1:1 (Square) | 30 | H.264 High @ L4.1 | **2,612 kbps** | 4.68 MB | 15.03 s | Stripped | [1080.mp4](https://media.cinegemstudio.com/home/5.9836ea1b/1080.mp4) |
| ↳ **720p (Mobile/Data)** | `720 × 720` | 1:1 (Square) | 30 | H.264 High @ L4.1 | **942 kbps** | 1.69 MB | 15.03 s | Stripped | [720.mp4](https://media.cinegemstudio.com/home/5.9836ea1b/720.mp4) |
| | | | | | | | | | |
| **Home 10 / Creative 2** | | | | | | | | | |
| ↳ *Original Source* | `1920 × 1080` | 16:9 (Landscape) | 30 | VP9 Profile 0 | **5,322 kbps** | 10.82 MB | 17.05 s | Yes | *(media-originals/home/10.webm)* |
| ↳ **1080p (Desktop)** | `1920 × 1080` | 16:9 (Landscape) | 30 | H.264 High @ L4.1 | **8,335 kbps** | 16.92 MB | 17.03 s | Stripped | [1080.mp4](https://media.cinegemstudio.com/home/10.b170e1e8/1080.mp4) |
| ↳ **720p (Mobile/Data)** | `1280 × 720` | 16:9 (Landscape) | 30 | H.264 High @ L4.1 | **3,017 kbps** | 6.13 MB | 17.03 s | Stripped | [720.mp4](https://media.cinegemstudio.com/home/10.b170e1e8/720.mp4) |
| | | | | | | | | | |
| **Creative Visuals 1** | | | | | | | | | |
| ↳ *Original Source* | `720 × 1280` | 9:16 (Portrait) | 30 | VP9 Profile 0 | **3,580 kbps** | 19.29 MB | 45.21 s | Yes | *(media-originals/creative-visuals/1.webm)* |
| ↳ **1080p (Desktop)** | `720 × 1280`* | 9:16 (Portrait) | 30 | H.264 High @ L4.1 | **5,436 kbps** | 29.29 MB | 45.20 s | Stripped | [1080.mp4](https://media.cinegemstudio.com/creative-visuals/1.4101f996/1080.mp4) |
| ↳ **720p (Mobile/Data)** | `720 × 1280`* | 9:16 (Portrait) | 30 | H.264 High @ L4.1 | **3,114 kbps** | 16.78 MB | 45.20 s | Stripped | [720.mp4](https://media.cinegemstudio.com/creative-visuals/1.4101f996/720.mp4) |

*\*Note: `Creative Visuals 1` source is 720×1280 portrait. In accordance with the "never upscale" rule, it was preserved at full native resolution with high-fidelity encoding rather than stretched.*

---

## 2. Encoding Profile & Compression Settings

Each video was processed through `ffmpeg` using a two-tier adaptive encoding recipe tailored for high-frequency jewellery reflection details:

### 1080p Tier (Desktop High-Fidelity)
* **Target Container:** MPEG-4 Part 14 (`.mp4`)
* **Codec:** `libx264` (H.264 / AVC)
* **Preset:** `slow` (multi-pass motion estimation, optimal CABAC entropy coding)
* **Rate Control:** Constant Rate Factor `-crf 18`
* **Bitrate Cap & Buffer:** `-maxrate 10M -bufsize 20M`
* **Color Primaries & Transfer:** `-pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709`
* **Audio Track:** Stripped (`-an`) to save bandwidth and GPU audio decoding cycles

### 720p Tier (Mobile & Low-Bandwidth / Save-Data)
* **Target Container:** MPEG-4 Part 14 (`.mp4`)
* **Codec:** `libx264` (H.264 / AVC)
* **Preset:** `slow`
* **Rate Control:** Constant Rate Factor `-crf 21`
* **Bitrate Cap & Buffer:** `-maxrate 4M -bufsize 8M`
* **Color Primaries & Transfer:** `-pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709`
* **Audio Track:** Stripped (`-an`)

### Universal Streaming Optimization
* **Fast Start Atom:** `-movflags +faststart` shifts the `moov` atom header to the beginning of the file, allowing instant streaming and scrubbing before the entire file is downloaded.
* **Closed GOP Structure:** `-g 48 -keyint_min 48 -sc_threshold 0` ensures deterministic 1.6-second keyframe cadences for exact byte-range seeking (HTTP 206 partial content).

---

## 3. Cache & Delivery Architecture

* **CDN Edge:** Cloudflare R2 backed by Custom Domain `media.cinegemstudio.com`
* **Immutable Caching:** All media files are hashed (`<name>.<hash8>/...`) with `Cache-Control: public, max-age=31536000, immutable`
* **CORS Support:** Verified live `access-control-allow-origin: http://localhost:5173`
* **Range Requests:** Full HTTP 206 support with `Accept-Ranges: bytes`

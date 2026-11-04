# Cinegem Studio — Cloudflare R2 Media Mapping Guide

This guide outlines the folder structure, naming conventions, and visual placement sequences for all media assets served from **Cloudflare R2** via our custom media CDN domain (`VITE_MEDIA_BASE_URL`).

> [!NOTE]
> **Optimized Multi-Format CDN Pipeline:**
> - Media is pre-encoded into responsive **AVIF** (modern) and **WebP** (fallback) images across multiple widths (`640, 1200, 1920, 2560, 3840`), plus tiny blurred WebP placeholders.
> - Videos are pre-encoded into high-efficiency **H.264 MP4** (`1080p` and `720p`) with fast-start range-request streaming and video posters.
> - Filenames are sorted using **natural numerical order** (`1.png, 2.png, ..., 9.png, 10.png, 11.png`).
> - Keys are content-hashed (`<prefix>/<basename>.<hash8>/...`) for 1-year immutable caching (`max-age=31536000, immutable`).

---

## 1. Quick Workflow: Adding or Updating Media

To add or update assets at any time:
1. Drop your original 4K assets into `MEDIA_SOURCE_DIR/<folder>/` (e.g. `media-originals/home/`, `media-originals/classic/`).
2. Run the sync command:
   ```powershell
   npm run media:sync
   ```
   *(This builds all optimized variants, generates manifest JSON files, and uploads new assets to Cloudflare R2).*
3. Run verification:
   ```powershell
   npm run media:verify
   ```

---

## 2. Folder Prefixes & Page Mappings

| Page / Section | Source Directory Subfolder | R2 Prefix | Manifest Key | Contents |
| :--- | :--- | :--- | :--- | :--- |
| **Home Page** (`/` or `/hero2`) | `media-originals/home/` | `home/` | `manifests/home.json` | 9 Images (`1–4, 6–9, 11`) + 2 Videos (`5, 10`) |
| **Creative Visuals** (`/creative-visuals`) | `media-originals/creative-visuals/` | `creative-visuals/` | `manifests/creative-visuals.json` | Editorial visuals & loops (`1.webm`, `2.webm`, ...) |
| **Classic E-Com Visuals** (`/classic`) | `media-originals/classic/` | `classic/` | `manifests/classic.json` | Product visuals (`hero.png`, `1.webm`, `2–5.png`) |
| **On-Body Visualization** (`/onbody`) | `media-originals/onbody/` | `onbody/` | `manifests/onbody.json` | Editorial on-body captures (`hero.png`, `1.png`, `2.png`) |

---

## 3. Creative Visuals (`/creative-visuals`)

* **R2 Prefix:** `creative-visuals/`
* **Dynamic Cycle Size:** **18 Images + 4 Videos** per full story block.
  * *18 images* = 1 story cycle (Sections 1–5)
  * *36 images* = 2 story cycles (Sections 1–5 repeat with images 19–36 and videos 5–8)
  * *54 images* = 3 story cycles, etc.

### Story Cycle Structure (18 Images + 4 Videos):

#### Top Hero Section (Page Top):
* `banner.jpg` (or `hero.png`): Wide cinematic background image placed behind the page title. If omitted, uses `1.png`.

#### Section 1: Video Left + 8-Image Grid Right
The image grid is **2 columns × 4 rows** and renders **Row-by-Row (Left-to-Right, Top-to-Bottom)**:
```
┌──────────────────────────┬──────────────────────────┐
│                          │  [ 1.png ]    [ 2.png ]  │  ← Row 1
│                          ├──────────────────────────┤
│                          │  [ 3.png ]    [ 4.png ]  │  ← Row 2
│       1.mp4 (Video)      ├──────────────────────────┤
│       (50% Width)        │  [ 5.png ]    [ 6.png ]  │  ← Row 3
│                          ├──────────────────────────┤
│                          │  [ 7.png ]    [ 8.png ]  │  ← Row 4
└──────────────────────────┴──────────────────────────┘
```

#### Section 2: Inverted Layout (8-Image Grid Left + Video Right)
The image grid is on the left and also renders **Row-by-Row (Left-to-Right, Top-to-Bottom)**:
```
┌──────────────────────────┬──────────────────────────┐
│  [ 9.png  ]   [ 10.png ] │                          │  ← Row 1
├──────────────────────────┤                          │
│  [ 11.png ]   [ 12.png ] │                          │  ← Row 2
├──────────────────────────┤      2.mp4 (Video)       │
│  [ 13.png ]   [ 14.png ] │       (50% Width)        │  ← Row 3
├──────────────────────────┤                          │
│  [ 15.png ]   [ 16.png ] │                          │  ← Row 4
└──────────────────────────┴──────────────────────────┘
```

#### Section 3: Full-Screen Showcase Video
* Single full-screen video with dynamic edge-matching background:
```
┌─────────────────────────────────────────────────────┐
│                    3.mp4 (Video)                    │
│             (Full-Screen Dynamic Video)             │
└─────────────────────────────────────────────────────┘
```

#### Section 4: Dual Images (Side-by-Side)
* Two editorial portraits displayed side by side at 50% width each:
```
┌──────────────────────────┬──────────────────────────┐
│          17.png          │          18.png          │
│       (Left Half)        │       (Right Half)       │
└──────────────────────────┴──────────────────────────┘
```

#### Section 5: Parallax Turntable Video
* Full-screen 360° product loop video with subtle parallax drift:
```
┌─────────────────────────────────────────────────────┐
│                    4.mp4 (Video)                    │
│             (Full-Screen 360 Turntable)             │
└─────────────────────────────────────────────────────┘
```

---

## 4. Classic E-Commerce Visuals (`/classic`)

* **R2 Prefix:** `classic/`
* **Default Showcase Rhythm:** 4 images and 1 centerpiece video per showcase:

### Product Showcase 1:
```
┌──────────┬──────────┬────────────────┬──────────┬──────────┐
│  1.png   │  2.png   │ 1.mp4 (Video)  │  3.png   │  4.png   │
│ (Image)  │ (Image)  │  (Centerpiece) │ (Image)  │ (Image)  │
└──────────┴──────────┴────────────────┴──────────┴──────────┘
```

*(On mobile/tablet, users swipe smoothly through all images and video in each carousel).*

---

## 5. On-Body Visualization (`/onbody`)

* **R2 Prefix:** `onbody/`
* **Layout:** Responsive bento grid packing images in repeating blocks of 7 using a **2 — 3 — 2 luxury editorial rhythm**:

### Block 1 (Images 1–7):
```
┌─────────────────────────────┬─────────────────────────────┐
│           1.png             │            2.png            │  ← Row 1 (Pair)
├───────────────────┬─────────┴─────────┬───────────────────┤
│       3.png       │       4.png       │       5.png       │  ← Row 2 (Trio)
├───────────────────┴─────────┬─────────┴───────────────────┤
│           6.png             │            7.png            │  ← Row 3 (Pair)
└─────────────────────────────┴─────────────────────────────┘
```

---

## 6. Client Configuration

The frontend reads media strictly from Cloudflare R2 via:
```env
VITE_MEDIA_BASE_URL=https://media.yourdomain.com
```
There is zero runtime dependency on Google Drive, zero polling intervals, and zero secret keys exposed in client bundles.


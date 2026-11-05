# Cinegem Studio — Cloudflare R2 Media Mapping Guide

This guide outlines the folder structure, naming conventions, and layout positioning sequences for all media assets served from **Cloudflare R2** via our media CDN domain (`media.cinegemstudio.com`).

> [!NOTE]
> **Optimized Multi-Format CDN Pipeline:**
> - Media is automatically encoded into responsive **AVIF** and **WebP** images across multiple widths (`640, 1200, 1920, 2560, 3840`), plus 24px blurred placeholders.
> - Videos are transcoded into streaming-optimized **1080p** and **720p H.264 MP4** with `+faststart` range-request headers and posters.
> - Filenames are sorted using **natural numerical order** (`1, 2, ..., 9, 10, 11`).
> - Keys are content-hashed (`<prefix>/<basename>.<hash8>/...`) for 1-year immutable caching (`max-age=31536000, immutable`).

---

## 1. Quick Workflow: Adding or Updating Media

To add or update assets at any time:
1. Drop your original assets into the appropriate subfolder in `media-originals/` (e.g. `media-originals/creative-visuals/`, `media-originals/onbody/`).
2. Run the sync command:
   ```bash
   npm run sync-media
   ```
   *(or double-click `sync-media.bat`)*
3. The script automatically processes new variants, updates JSON manifests, and uploads directly to Cloudflare R2.

---

## 2. Global Naming Conventions

Across all pages, special filenames designate specific roles:

| Filename Pattern | Role | Description |
| :--- | :--- | :--- |
| `hero.png` / `banner.jpg` / `0.png` | **Hero Section Background** | Unconstrained cinematic background image placed behind the page title. Does not count as a grid item. |
| **`full-1.mp4`** / **`full-1.png`** | **Full-Screen Showcase 1** | Immersive 100vw × 100vh full-screen showcase (supports both video & high-res image). |
| **`full-2.mp4`** / **`full-2.png`** | **Full-Screen Showcase 2** | Second 100vw × 100vh full-screen showcase (with subtle parallax vertical drift). |
| `full-3`, `full-4`, ... | **Subsequent Full-Screen Showcases** | For extended or multi-cycle editorial layouts. |
| `1.png`, `2.png`, `3.png`... | **Standard Grid / Story Media** | Standard sequential media placed in the page's bento or column grids. |

---

## 3. Creative Visuals (`/creative-visuals`)

* **Source Directory:** `media-originals/creative-visuals/`
* **R2 Prefix:** `creative-visuals/`
* **Layout Structure:** An editorial story cycle containing **Featured Hero Tiles, 8-Cell Grids, Full-Screen Breakouts, and Dual Side-by-Side Media**.

### Visual Mapping Diagram:

#### 1. Page Top Hero Banner:
* `hero.png` (or `banner.jpg`, `0.png`): Placed behind the "Creative Visuals" title.

#### 2. Section 1: Featured Left (50%) + 8-Image Grid Right
```
┌──────────────────────────┬──────────────────────────┐
│                          │  [ 2.png ]    [ 3.png ]  │  ← Row 1
│                          ├──────────────────────────┤
│                          │  [ 4.png ]    [ 5.png ]  │  ← Row 2
│      1.mp4 / 1.png       ├──────────────────────────┤
│      (Featured Left)     │  [ 6.png ]    [ 7.png ]  │  ← Row 3
│                          ├──────────────────────────┤
│                          │  [ 8.png ]    [ 9.png ]  │  ← Row 4
└──────────────────────────┴──────────────────────────┘
```

#### 3. Section 2: Inverted 8-Image Grid Left + Featured Right (50%)
```
┌──────────────────────────┬──────────────────────────┐
│  [ 10.png ]   [ 11.png ] │                          │  ← Row 1
├──────────────────────────┤                          │
│  [ 12.png ]   [ 13.png ] │                          │  ← Row 2
├──────────────────────────┤      18.mp4 / 18.png     │
│  [ 14.png ]   [ 15.png ] │      (Featured Right)    │  ← Row 3
├──────────────────────────┤                          │
│  [ 16.png ]   [ 17.png ] │                          │  ← Row 4
└──────────────────────────┴──────────────────────────┘
```

#### 4. Section 3: Full-Screen Showcase 1
```
┌─────────────────────────────────────────────────────┐
│          full-1.mp4  (or  full-1.png)               │
│       (Edge-to-Edge 100vw × 100vh Full-Screen)       │
└─────────────────────────────────────────────────────┘
```
* Automatically detects video background colors (e.g. white or dark studio) for seamless edge blending and magnetic snapping.

#### 5. Section 4: Dual Media Side-by-Side (50% + 50%)
```
┌──────────────────────────┬──────────────────────────┐
│          19.png          │          20.png          │
│       (Left Half)        │       (Right Half)       │
└──────────────────────────┴──────────────────────────┘
```

#### 6. Section 5: Full-Screen Showcase 2 (Turntable Parallax)
```
┌─────────────────────────────────────────────────────┐
│          full-2.mp4  (or  full-2.png)               │
│      (100vw × 100vh with Parallax Vertical Drift)   │
└─────────────────────────────────────────────────────┘
```

*(If more than 20 items are supplied, subsequent story cycles automatically advance to `full-3`, `full-4`, etc.).*

---

## 4. On-Body Visualization (`/onbody`)

* **Source Directory:** `media-originals/onbody/`
* **R2 Prefix:** `onbody/`
* **Layout Structure:** Modular luxury **2 — 3 — 2 Bento Grid Blocks** interleaved with **Immersive Full-Screen Breakout Media**.

### Visual Mapping Diagram:

#### 1. Page Top Hero Banner:
* `hero.png` (or `banner.jpg`, `0.png`): High-fashion on-model header background.

#### 2. Bento Block 1 (Images 1–7):
```
┌─────────────────────────────┬─────────────────────────────┐
│           1.png             │            2.png            │  ← Row 1 (Pair)
├───────────────────┬─────────┴─────────┬───────────────────┤
│       3.png       │       4.png       │       5.png       │  ← Row 2 (Trio)
├───────────────────┴─────────┬─────────┴───────────────────┤
│           6.png             │            7.png            │  ← Row 3 (Pair)
└─────────────────────────────┴─────────────────────────────┘
```

#### 3. Breakout Full-Screen Showcase 1:
```
┌─────────────────────────────────────────────────────┐
│          full-1.mp4  (or  full-1.png)               │
│     (Edge-to-Edge 100vw × 100vh On-Model Cinema)     │
└─────────────────────────────────────────────────────┘
```

#### 4. Bento Block 2 (Images 8–14):
```
┌─────────────────────────────┬─────────────────────────────┐
│           8.png             │            9.png            │  ← Row 1 (Pair)
├───────────────────┬─────────┴─────────┬───────────────────┤
│      10.png       │      11.png       │      12.png       │  ← Row 2 (Trio)
├───────────────────┴─────────┬─────────┴───────────────────┤
│          13.png             │           14.png            │  ← Row 3 (Pair)
└─────────────────────────────┴─────────────────────────────┘
```

#### 5. Breakout Full-Screen Showcase 2:
```
┌─────────────────────────────────────────────────────┐
│          full-2.mp4  (or  full-2.png)               │
│    (100vw × 100vh On-Model Loop with Parallax Drift) │
└─────────────────────────────────────────────────────┘
```

*(If `full-1` or `full-2` is not provided, the page gracefully presents continuous bento grid blocks without empty spaces).*

---

## 5. Classic E-Commerce Visuals (`/classic`)

* **Source Directory:** `media-originals/classic/`
* **R2 Prefix:** `classic/`
* **Default Rhythm:** Repeating 5-slot product showcase rows (4 detail images + 1 centerpiece video).

```
┌──────────┬──────────┬────────────────┬──────────┬──────────┐
│  2.png   │  3.png   │ 1.webm (Video) │  4.png   │  5.png   │
│ (Image)  │ (Image)  │  (Centerpiece) │ (Image)  │ (Image)  │
└──────────┴──────────┴────────────────┴──────────┴──────────┘
```

---

## 6. Home Page (`/`)

* **Source Directory:** `media-originals/home/`
* **R2 Prefix:** `home/`
* **Sequence:** 9 interactive showcase images (`1–4.png`, `6–9.png`, `11.png`) and 2 synchronized background videos (`5.mp4`, `10.mp4`).

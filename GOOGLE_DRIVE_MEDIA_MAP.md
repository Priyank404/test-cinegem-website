# Cinegem Studio — Google Drive Media Mapping Guide

This guide outlines the exact naming conventions, file counts, and visual placement sequences for all media assets synced from Google Drive to Cinegem Studio.

> [!NOTE]
> **Fully Dynamic Media & Repeating Structure:**
> You can add **as many images and videos as you want** into Google Drive.
> - The page dynamically calculates how many sections to render.
> - The structure, grid layout, and luxury editorial rhythms remain **identical and consistent** across all repeating cycles.
> - Natural numerical sorting is enabled, so `1.png`, `2.png`, ... `9.png`, `10.png`, `11.png` stay in true numerical order.

---

## 1. Creative Visuals (`/creative-visuals`)

* **Google Drive Folder Name:** `Creative visuals`
* **Google Drive Folder ID:** `1ZiU5sda-gbZCnkc_E_FEtw6c0RSYVPHT`
* **Dynamic Cycle Size:** **18 Images + 4 Videos** per full story block.
  * *18 images* = 1 story cycle (Sections 1–5)
  * *36 images* = 2 story cycles (Sections 1–5 repeat with images 19–36 and videos 5–8)
  * *54 images* = 3 story cycles, etc.

### Story Cycle Structure (18 Images + 4 Videos):

#### Top Hero Section (Page Top):
* `banner.jpg` (or `hero.jpg`): Wide cinematic background image placed behind the page title. If omitted, uses `1.png`.

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

### Adding More Media (Cycle 2, Cycle 3, ...):
When you add more images beyond 18:
* **Cycle 2 (Images 19–36 & Videos 5–8):**
  * Section 1: Video `5.mp4` on Left + Images `19.png` to `26.png` in 2×4 Grid on Right.
  * Section 2: Images `27.png` to `34.png` in 2×4 Grid on Left + Video `6.mp4` on Right.
  * Section 3: Video `7.mp4` (Full-Screen).
  * Section 4: Images `35.png` & `36.png` Side-by-Side.
  * Section 5: Video `8.mp4` (Parallax Turntable).
*(If you have fewer videos than images, videos will gracefully loop without leaving empty gaps).*

---

## 2. Classic E-Commerce Visuals (`/classic`)

* **Google Drive Folder Name:** `E-Com Visuals`
* **Google Drive Folder ID:** `1cp9ulMv1QZdS6raMSvQOLZdLwHVFa7zf`
* **Total Media Required:**
  * **12 Images:** `1.png` to `12.png`
  * **3 Videos:** `1.mp4` to `3.mp4`
  *(4 images and 1 center video per product section)*

On desktop, each product showcase renders as **5 columns in a single row**, highlighting the video in the center:

### Product Showcase 1:
```
┌──────────┬──────────┬────────────────┬──────────┬──────────┐
│  1.png   │  2.png   │ 1.mp4 (Video)  │  3.png   │  4.png   │
│ (Image)  │ (Image)  │  (Centerpiece) │ (Image)  │ (Image)  │
└──────────┴──────────┴────────────────┴──────────┴──────────┘
```

### Product Showcase 2:
```
┌──────────┬──────────┬────────────────┬──────────┬──────────┐
│  5.png   │  6.png   │ 2.mp4 (Video)  │  7.png   │  8.png   │
│ (Image)  │ (Image)  │  (Centerpiece) │ (Image)  │ (Image)  │
└──────────┴──────────┴────────────────┴──────────┴──────────┘
```

### Product Showcase 3:
```
┌──────────┬──────────┬────────────────┬──────────┬──────────┐
│  9.png   │  10.png  │ 3.mp4 (Video)  │  11.png  │  12.png  │
│ (Image)  │ (Image)  │  (Centerpiece) │ (Image)  │ (Image)  │
└──────────┴──────────┴────────────────┴──────────┴──────────┘
```
*(On mobile/tablet, users swipe smoothly through all 4 images and the video in each carousel).*

---

## 3. On-Body Visualization (`/onbody`)

* **Google Drive Folder Name:** `On-Body Visualization`
* **Google Drive Folder ID:** `1yU3LwOU5l8ZJkvwKwLkN80lGFMB5esnY`
* **Total Media Required:** Multiples of 7 Images (`1.png` to `7.png`, `8.png` to `14.png`, etc.)

The On-Body page uses a responsive bento grid that packs images dynamically in repeating blocks of 7 using a **2 — 3 — 2 luxury editorial rhythm**:

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

### Block 2 (Images 8–14):
```
┌─────────────────────────────┬─────────────────────────────┐
│           8.png             │            9.png            │  ← Row 1 (Pair)
├───────────────────┬─────────┴─────────┬───────────────────┤
│      10.png       │      11.png       │      12.png       │  ← Row 2 (Trio)
├───────────────────┴─────────┬─────────┴───────────────────┤
│          13.png             │           14.png            │  ← Row 3 (Pair)
└─────────────────────────────┴─────────────────────────────┘
```

---

## Quick Reference Summary Table

| Page | Environment Variable in `.env` | Google Drive Folder | Images Count & Names | Videos Count & Names |
| :--- | :--- | :--- | :--- | :--- |
| **Home Page** (`/` or `/hero2`) | `VITE_HOMEPAGE_FOLDER_ID` | Optional dedicated folder (or auto-pulls from 3 sections below) | 4 E-Com + 4 Creative + 1 On-Body | 1 E-Com + 1 Creative |
| **Creative Visuals** (`/creative-visuals`) | `VITE_CREATIVE_VISUALS_FOLDER_ID` | `Creative visuals` | `banner.jpg` + `1.png` to `18.png` | `1.mp4` to `4.mp4` |
| **Classic E-Com Visuals** (`/classic`) | `VITE_ECOM_VISUALS_FOLDER_ID` | `E-Com Visuals` | `1.png` to `12.png` | `1.mp4` to `3.mp4` |
| **On-Body Visualization** (`/onbody`) | `VITE_ON_BODY_FOLDER_ID` | `On-Body Visualization` | `1.png` to `7.png` (or multiples of 7) | — |
| **Creative Animation** | `VITE_CREATIVE_ANIMATION_FOLDER_ID` | `Creative Animation` | Keyframes & stills | Loop animations |
| **360 Turntable** | `VITE_360_ANIMATION_FOLDER_ID` | `360 Animation` | Turn frames | 360 loop videos |

---

## Automatic Fetching from `.env`

All media is fetched automatically from the Google Drive folders specified in `.env`. There are no dynamic source switchers, local toggles, or floating dev controls on the client.

To change or update any folder, simply update the folder ID in `.env`:
```env
VITE_GOOGLE_DRIVE_API=AIzaSyBtAzyvWH3iqfmJ1y0GwbKAoXFxTRw_-Xk
VITE_CREATIVE_VISUALS_FOLDER_ID=1ZiU5sda-gbZCnkc_E_FEtw6c0RSYVPHT
VITE_ECOM_VISUALS_FOLDER_ID=1cp9ulMv1QZdS6raMSvQOLZdLwHVFa7zf
VITE_ON_BODY_FOLDER_ID=1yU3LwOU5l8ZJkvwKwLkN80lGFMB5esnY
VITE_CREATIVE_ANIMATION_FOLDER_ID=1rqrfSlIpWcvYiAJqfKJYCx09U6TM_RdC
VITE_360_ANIMATION_FOLDER_ID=1czxcFB5BWmYhnOg-bYNEJx1Jubwoil8o
```
Whenever the user visits or switches back to the tab, the latest Google Drive assets are fetched automatically.



# Cinegem Studio — Production Website v2.0

> High Jewellery CGI & 3D Visualization Studio.

## Stack

| Layer           | Tech                                       |
| --------------- | ------------------------------------------ |
| Framework       | React 18 + Vite                            |
| 3D Engine       | Three.js via `@react-three/fiber` + `drei` |
| Animation       | Framer Motion + GSAP + `@react-spring/three` |
| Smooth Scroll   | Lenis (wired to GSAP ScrollTrigger)        |
| Styling         | Tailwind CSS v3 (Aetheric Design System)   |
| Fonts           | Playfair Display + Manrope (Google Fonts)  |

## Project Structure

```
src/
├── constants/        # All static data (nav, panels, services, …)
├── hooks/            # Custom React hooks
│   ├── useCursor.js         – RAF-driven two-part custom cursor
│   ├── useLenis.js          – Lenis + GSAP ScrollTrigger sync
│   ├── useMediaFolder.js    – Cloudflare R2 media folder manifest consumer
│   ├── useHomePageMedia.js  – Slot assignment for home page visuals & loops
│   ├── useMouseParallax.js  – Normalised mouse position ref
│   └── useScrollReveal.js   – GSAP ScrollTrigger fade-up
├── lib/
│   └── utils.js      # cn(), lerp(), clamp(), mapRange()
├── components/
│   ├── layout/       # Navigation, Footer
│   ├── ui/           # Primitives: GlassChip, Buttons, Divider, Cursor, Loader
│   ├── shared/       # UniversalMediaTile, MediaImage, GlassyGallery
│   ├── three/        # FloatingPanel, VaultScene, RingHero (Three.js)
│   └── sections/     # HeroVault, Services, Gallery, Process, About, Testimonials, Contact
├── styles/
│   └── globals.css   # Tailwind imports + custom component/utility layer
├── App.jsx           # Root composition
└── main.jsx          # React entry point
```

## Getting Started

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Media Pipeline (Cloudflare R2 CDN)

Media is served from Cloudflare R2 using pre-optimized AVIF/WebP images and streaming H.264 MP4 videos.

- **Sync media:** `npm run media:sync` (builds variants from `media-originals/` and uploads to R2)
- **Verify CDN:** `npm run media:verify` (verifies manifests, range requests, edge caching, and CORS)
- **Media map & layout guide:** see [MEDIA_MAP.md](file:///c:/Users/admin/Documents/Cinegem/Projects/Cinegem%20Website/Cinegem/MEDIA_MAP.md)

## Design System

Governed by the **Aetheric Studio System** (see `DESIGN.md` in project root).

- **Palette:** Charcoal Deep `#121212` · Champagne Gold `#C5A059` · Cream Soft `#FAF9F6`
- **Type:** Playfair Display (display/headline) + Manrope (body/label)
- **Shape:** Sharp 0px radius everywhere except functional circles
- **Motion:** Lenis smooth scroll + GSAP ScrollTrigger + Framer Motion stagger reveals
- **3D Hero:** `@react-three/fiber` Canvas with mouse-tracked camera parallax

## Key Architectural Decisions

- **No re-renders from mouse tracking** — mouse position lives in a `useRef`, read in RAF/`useFrame`
- **GSAP context** — all ScrollTrigger instances are scoped and reverted on unmount
- **Memoised 3D components** — `FloatingPanel` is wrapped in `React.memo`
- **`useId`** for form labels — avoids SSR hydration mismatches
- **Accessible forms** — proper `htmlFor`, `aria-required`, `role="status"` on success state
- **External links** — footer social links get `rel="noopener noreferrer"`

/**
 * beatFogPresets.js
 * -------------------------------------------------------------------------
 * One FOG options object per beat in HeroPage2 (index order must match
 * RingHero's BEATS array — same rule as BeatBackground's BEAT_SCENES).
 * Edit these directly, or let VantaFogControlPanel overwrite the
 * localStorage copy via "Save as default" and read it back at runtime
 * (see loadBeatFogPresets() below).
 * -------------------------------------------------------------------------
 */

export const STORAGE_KEY = "vantaFog:beatPresets:v3";

export const BEAT_FOG_PRESETS = [
  // Beat 1 — idle ring: warm mauve/gold setting.
  {
    highlightColor: "#897d5d",
    midtoneColor: "#b582a2",
    lowlightColor: "#0c0d16",
    baseColor: "#5e2b3d",
    blurFactor: 0.6,
    speed: 1,
    zoom: 0.96,
  },
  // Beat 2 — floor rises: warm.
  {
    highlightColor: "#b6778d",
    midtoneColor: "#cfb05c",
    lowlightColor: "#14171d",
    baseColor: "#fcfbfa",
    blurFactor: 0.6,
    speed: 1.0,
    zoom: 0.6,
  },
  // Beat 3 — on-body reveal: warmer/tighter.
  {
    highlightColor: "#ffd88e",
    midtoneColor: "#c98a4b",
    lowlightColor: "#1a1208",
    baseColor: "#fff6e6",
    blurFactor: 0.6,
    speed: 1.0,
    zoom: 0.6,
  },
  // Beat 4 — demerge into cards: cool, wide.
  {
    highlightColor: "#8ecbff",
    midtoneColor: "#3d6a8f",
    lowlightColor: "#0a1420",
    baseColor: "#eef7ff",
    blurFactor: 0.6,
    speed: 1.0,
    zoom: 0.6,
  },
  // Beat 5 — standing spin, closing beat: dark, calm.
  {
    highlightColor: "#3a3a44",
    midtoneColor: "#1c1c22",
    lowlightColor: "#000000",
    baseColor: "#08080a",
    blurFactor: 0.6,
    speed: 1.0,
    zoom: 0.6,
  },
];

// Reads a saved-as-default copy from localStorage, falling back to the
// shipped BEAT_FOG_PRESETS above. Mirrors the "Save as default" / "Reset
// to shipped" workflow you already use for CardLayoutPanel.
export function loadBeatFogPresets() {
  if (typeof window === "undefined") return BEAT_FOG_PRESETS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return BEAT_FOG_PRESETS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === BEAT_FOG_PRESETS.length) {
      // Ensure global parameters (blurFactor, speed, zoom) stay synchronized across all beats
      const globalBlur = parsed[0]?.blurFactor ?? 0.6;
      const globalSpeed = parsed[0]?.speed ?? 1.0;
      const globalZoom = parsed[0]?.zoom ?? 0.6;
      return parsed.map((p) => ({
        ...p,
        blurFactor: globalBlur,
        speed: globalSpeed,
        zoom: globalZoom,
      }));
    }
  } catch {
    // fall through to shipped defaults
  }
  return BEAT_FOG_PRESETS;
}

export function saveBeatFogPresets(presets) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function resetBeatFogPresets() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

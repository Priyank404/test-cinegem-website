/**
 * Production runtime defenses against casual asset saving, media dragging,
 * and DevTools inspection shortcuts.
 * Automatically bypassed in dev mode or when ?mode=dev is present.
 */
export function initRuntimeProtection() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!import.meta.env.PROD) return;

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "dev") return;
  } catch {
    // Ignore URLSearchParams errors
  }

  // 1. Disable right-click context menu on page & media
  document.addEventListener(
    "contextmenu",
    (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
    },
    { capture: true }
  );

  // 2. Prevent dragging images, videos, or WebGL canvas to desktop
  document.addEventListener(
    "dragstart",
    (e) => {
      const tag = e.target?.tagName;
      if (tag === "IMG" || tag === "VIDEO" || tag === "CANVAS") {
        e.preventDefault();
      }
    },
    { capture: true }
  );

  // 3. Block common DevTools & Save/View-Source shortcuts
  document.addEventListener(
    "keydown",
    (e) => {
      const key = (e.key || "").toUpperCase();
      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      if (key === "F12") {
        e.preventDefault();
        return;
      }

      if (ctrlOrMeta && e.shiftKey && (key === "I" || key === "J" || key === "C")) {
        e.preventDefault();
        return;
      }

      if (ctrlOrMeta && (key === "U" || key === "S")) {
        e.preventDefault();
      }
    },
    { capture: true }
  );
}

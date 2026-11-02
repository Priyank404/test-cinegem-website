/**
 * Application Environment Configuration
 * -------------------------------------------------------------------------
 * Manages mode switching between:
 *  - 'dev': Shows 3D timeline editor, material dev panels, Vanta fog controls
 *  - 'production': Clean viewer experience, hiding all developer overlays & controls
 *
 * Configured via .env:
 *   VITE_APP_MODE=dev | production
 *
 * Can also be overridden temporarily via URL query parameter for testing:
 *   ?mode=dev or ?mode=prod
 * -------------------------------------------------------------------------
 */

export const isDevMode = () => {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const queryMode = params.get("mode") || params.get("env");
    if (queryMode) {
      const q = queryMode.toLowerCase();
      if (q === "dev" || q === "development") return true;
      if (q === "prod" || q === "production") return false;
    }
  }

  const envMode = import.meta.env.VITE_APP_MODE;
  if (typeof envMode === "string") {
    const normalized = envMode.trim().toLowerCase();
    if (normalized === "dev" || normalized === "development") return true;
    if (normalized === "prod" || normalized === "production") return false;
  }

  // Fallback to Vite standard DEV flag
  return Boolean(import.meta.env.DEV);
};

export const isProductionMode = () => !isDevMode();

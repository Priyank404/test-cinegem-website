/**
 * Application Environment Configuration
 * -------------------------------------------------------------------------
 * DEFAULT MODE: PRODUCTION (pure website, zero controllers or overlays)
 *
 * To temporarily enable development mode and reveal controllers:
 *   Add query parameter: ?mode=dev (e.g. http://localhost:5173/?mode=dev)
 * -------------------------------------------------------------------------
 */

export const isDevMode = () => {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const queryMode = params.get("mode") || params.get("env");
    if (queryMode) {
      const q = queryMode.toLowerCase().trim();
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

  // DEFAULT: STRICT PRODUCTION (zero controllers)
  return false;
};

export const isProductionMode = () => !isDevMode();
